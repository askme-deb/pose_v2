import type { Prisma, Product } from '@prisma/client';
import { computeFlatDiscountTotals } from '@pospe/utilities';
import { prisma } from './prisma';
import { num, round2 } from './util';

// The catalog has no variations; every product is exposed to the app as one
// variation with one option, both keyed by the product id, so the app's
// variation/option plumbing round-trips without a lookup table.
export const OPTION_NAME = 'Regular';

type ProductLike = Pick<Product, 'id' | 'name' | 'imageUrl' | 'price' | 'mrp' | 'stockQty' | 'isBundle'> & { description?: string | null };

export function productJson(p: ProductLike) {
  const selling = num(p.price);
  const mrp = num(p.mrp);
  return {
    id: p.id,
    name: p.name,
    image_url: p.imageUrl ?? '',
    price: mrp > 0 ? mrp : selling,
    long_description: p.description ?? '',
    variations: [
      {
        options: [
          {
            id: p.id,
            variation_id: p.id,
            name: OPTION_NAME,
            price: mrp > 0 ? mrp : selling,
            selling_price: selling,
            // A bundle holds no stock of its own; checkout guards its components.
            quantity: p.isBundle ? 9999 : p.stockQty,
          },
        ],
      },
    ],
  };
}

export interface Line {
  id: string;
  productId: string;
  name: string;
  imageUrl: string | null;
  price: number;
  quantity: number;
  gstRate: number;
  discount: number;
  stock: number;
}

/** The cart / order response the app reads (contract §5.2). */
export function buildView(lines: Line[], billDiscount = 0, complimentary = 0, isGstSame = true) {
  const t = computeFlatDiscountTotals(
    lines.map((l) => ({ ...l, discountAmount: l.discount })),
    billDiscount,
    complimentary,
  );
  const sgst = isGstSame ? round2(t.taxTotal / 2) : 0;
  const cgst = isGstSame ? round2(t.taxTotal - sgst) : 0;
  const igst = isGstSame ? 0 : t.taxTotal;
  return {
    status: true,
    data: lines.map((l) => ({
      id: l.id,
      product_name: l.name,
      product_title: OPTION_NAME,
      product: { id: l.productId, name: l.name, image_url: l.imageUrl ?? '' },
      variation_id: l.productId,
      option_id: l.productId,
      variation_option: { quantity: l.stock, selling_price: l.price },
      price: l.price,
      quantity: l.quantity,
      discount: l.discount,
      app_discount: l.discount,
      type: '',
    })),
    item_total: t.subtotal,
    discount: billDiscount,
    compelementary: complimentary,
    discount_subtotal: round2(t.subtotal - t.discountTotal),
    sgst,
    cgst,
    igst,
    rounded_grand_total: Math.round(t.total),
    grand_total: t.total,
    is_gst_same: isGstSame,
  };
}

export async function cartLines(userId: string, storeId: string): Promise<Line[]> {
  const rows = await prisma.mobileCartLine.findMany({
    where: { userId, storeId },
    include: { product: true },
    orderBy: { createdAt: 'asc' },
  });
  return rows.map((r) => ({
    id: r.id,
    productId: r.productId,
    name: r.product.name,
    imageUrl: r.product.imageUrl,
    price: num(r.product.price),
    quantity: r.quantity,
    gstRate: num(r.product.gstRate),
    discount: num(r.discountAmount),
    stock: r.product.stockQty,
  }));
}

export const heldInclude = { items: { include: { product: true }, orderBy: { id: 'asc' } } } satisfies Prisma.InvoiceInclude;

export function orderLines(items: Prisma.InvoiceGetPayload<{ include: typeof heldInclude }>['items']): Line[] {
  return items.map((i) => ({
    id: i.id,
    productId: i.productId,
    name: i.product.name,
    imageUrl: i.product.imageUrl,
    price: num(i.price),
    quantity: i.quantity,
    gstRate: num(i.gstRate),
    discount: num(i.discountAmount),
    stock: i.product.stockQty,
  }));
}

/**
 * Re-price a held bill after its lines changed, with the same maths checkout
 * will use, so the held total equals the invoice it becomes.
 */
export async function recomputeHeld(tx: Prisma.TransactionClient, invoiceId: string, billDiscount?: number, complimentary?: number) {
  const invoice = await tx.invoice.findUniqueOrThrow({ where: { id: invoiceId }, include: { items: { orderBy: { id: 'asc' } } } });
  const bill = billDiscount ?? num(invoice.billDiscountAmount);
  const comp = complimentary ?? num(invoice.complimentaryAmount);
  const t = computeFlatDiscountTotals(
    invoice.items.map((i) => ({ id: i.id, price: num(i.price), quantity: i.quantity, gstRate: num(i.gstRate), discountAmount: num(i.discountAmount) })),
    bill,
    comp,
  );
  for (const line of t.lines) {
    await tx.invoiceItem.update({ where: { id: line.id }, data: { total: line.total } });
  }
  return tx.invoice.update({
    where: { id: invoiceId },
    data: {
      billDiscountAmount: bill,
      complimentaryAmount: comp,
      subtotal: t.subtotal,
      discountTotal: t.discountTotal,
      taxTotal: t.taxTotal,
      total: t.total,
    },
  });
}
