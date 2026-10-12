import type { Prisma, Product, ProductAddon, ProductOption } from '@prisma/client';
import { computeFlatDiscountTotals } from '@pospe/utilities';
import { prisma } from './prisma';
import { num, round2 } from './util';

// Products without variations are exposed to the app as one variation with one
// option, both keyed by the product id, so the app's variation/option
// plumbing round-trips without a lookup table. Products *with* variations
// expose their real options.
export const OPTION_NAME = 'Regular';

type ProductLike = Pick<Product, 'id' | 'name' | 'imageUrl' | 'price' | 'mrp' | 'stockQty' | 'isBundle' | 'variationName'> & {
  description?: string | null;
  options?: ProductOption[];
  addons?: (ProductAddon & { addonProduct: Pick<Product, 'id' | 'name' | 'imageUrl'> })[];
};

export const productInclude = {
  options: { orderBy: { position: 'asc' } },
  addons: { orderBy: { position: 'asc' }, include: { addonProduct: { select: { id: true, name: true, imageUrl: true } } } },
} satisfies Prisma.ProductInclude;

export function productJson(p: ProductLike) {
  const selling = num(p.price);
  const mrp = num(p.mrp);
  const options = p.options ?? [];
  return {
    id: p.id,
    name: p.name,
    image_url: p.imageUrl ?? '',
    price: mrp > 0 ? mrp : selling,
    long_description: p.description ?? '',
    variations: [
      {
        id: p.id,
        name: options.length ? p.variationName ?? 'Variation' : OPTION_NAME,
        options: options.length
          ? options.map((o) => ({
              id: o.id,
              variation_id: p.id,
              name: o.name,
              sku: o.sku ?? '',
              barcode: o.barcode ?? '',
              price: num(o.mrp) > 0 ? num(o.mrp) : num(o.price),
              selling_price: num(o.price),
              quantity: o.stockQty,
            }))
          : [
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
    // Extras for the optional Addons & Complementary offering (the app ignores unknown keys).
    addons: (p.addons ?? []).map((a) => ({
      id: a.addonProduct.id,
      name: a.addonProduct.name,
      image_url: a.addonProduct.imageUrl ?? '',
      kind: a.kind,
      price: num(a.price),
    })),
  };
}

export interface Line {
  id: string;
  productId: string;
  optionId: string | null;
  optionName: string | null;
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
      product_title: l.optionName ?? OPTION_NAME,
      product: { id: l.productId, name: l.name, image_url: l.imageUrl ?? '' },
      variation_id: l.productId,
      option_id: l.optionId ?? l.productId,
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

export async function optionMap(ids: (string | null | undefined)[]) {
  const unique = [...new Set(ids.filter((i): i is string => Boolean(i)))];
  if (!unique.length) return new Map<string, ProductOption>();
  return new Map((await prisma.productOption.findMany({ where: { id: { in: unique } } })).map((o) => [o.id, o]));
}

export async function cartLines(userId: string, storeId: string): Promise<Line[]> {
  const rows = await prisma.mobileCartLine.findMany({
    where: { userId, storeId },
    include: { product: true },
    orderBy: { createdAt: 'asc' },
  });
  const options = await optionMap(rows.map((r) => r.optionId));
  return rows.map((r) => {
    const option = r.optionId ? options.get(r.optionId) : undefined;
    return {
      id: r.id,
      productId: r.productId,
      optionId: option?.id ?? null,
      optionName: option?.name ?? null,
      name: r.product.name,
      imageUrl: r.product.imageUrl,
      price: num((option ?? r.product).price),
      quantity: r.quantity,
      gstRate: num(r.product.gstRate),
      discount: num(r.discountAmount),
      stock: option ? option.stockQty : r.product.stockQty,
    };
  });
}

export const heldInclude = { items: { include: { product: true }, orderBy: { id: 'asc' } } } satisfies Prisma.InvoiceInclude;

export async function orderLines(items: Prisma.InvoiceGetPayload<{ include: typeof heldInclude }>['items']): Promise<Line[]> {
  const options = await optionMap(items.map((i) => i.optionId));
  return items.map((i) => {
    const option = i.optionId ? options.get(i.optionId) : undefined;
    return {
      id: i.id,
      productId: i.productId,
      optionId: i.optionId,
      optionName: i.optionName,
      name: i.product.name,
      imageUrl: i.product.imageUrl,
      price: num(i.price),
      quantity: i.quantity,
      gstRate: num(i.gstRate),
      discount: num(i.discountAmount),
      stock: option ? option.stockQty : i.product.stockQty,
    };
  });
}

/** "Veg Thali (Full)" — how a line reads on receipts and history. */
export const displayName = (name: string, optionName: string | null | undefined) => (optionName ? `${name} (${optionName})` : name);

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
