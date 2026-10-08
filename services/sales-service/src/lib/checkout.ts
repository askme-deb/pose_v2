import { notifyLowStock, type LowStockAlert } from '@pospe/notifications';
import { computeInvoiceTotals } from '@pospe/utilities';
import { prisma } from './prisma';
import { indexInvoice, indexCustomer } from './elasticsearch';

const NOTIFICATION_SERVICE_URL = process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:4007';

export class CustomerNotFoundError extends Error {
  constructor() {
    super('Customer not found');
  }
}

export class ProductNotFoundError extends Error {
  constructor() {
    super('One or more products not found');
  }
}

export class IdempotencyConflictError extends Error {
  status = 409;
  constructor() {
    super('This idempotency key was already used');
  }
}

export class InsufficientStockError extends Error {
  constructor(public productId: string, public productName: string) {
    super(`Insufficient stock for ${productName}`);
  }
}

export interface CheckoutItemInput {
  productId: string;
  quantity: number;
  // Already permission-checked by the caller; overrides the Product's price.
  unitPrice?: number;
}

export interface CheckoutParams {
  tenantId: string;
  storeId: string;
  customerId?: string;
  paymentMethod: 'CASH' | 'UPI' | 'CARD' | 'SPLIT';
  items: CheckoutItemInput[];
  discountPercent: number;
  idempotencyKey?: string;
  // The signed-in user ringing up the sale (omitted for system callers).
  createdById?: string;
  // Receipt bill details (handheld / on-board sales); stored as given.
  customerPhone?: string;
  location?: string;
  seatNo?: string;
  paymentReference?: string;
}

export const invoiceInclude = { items: { include: { product: { select: { id: true, name: true } } } } } as const;

// The one real checkout transaction — stock decrement guarded against
// overselling, GST calculation, invoice numbering, loyalty points, low-stock
// alerts, search indexing. Shared by the direct POS checkout (routes/invoices.ts)
// and converting a quotation/estimate into a real sale (routes/quotations.ts),
// so both go through the exact same money-and-stock-moving logic instead of a
// second, slightly-different copy.
export async function checkoutInvoice(params: CheckoutParams) {
  const { tenantId, storeId, customerId, paymentMethod, items, discountPercent, idempotencyKey, createdById, customerPhone, location, seatNo, paymentReference } = params;

  // idempotencyKey is unique across the whole table, so a replay is only
  // honoured when the existing invoice belongs to this tenant — otherwise a
  // guessed/reused key would hand back another tenant's invoice.
  const findReplay = async () => {
    if (!idempotencyKey) return null;
    const existing = await prisma.invoice.findUnique({ where: { idempotencyKey }, include: { ...invoiceInclude, store: { select: { tenantId: true } } } });
    if (!existing) return null;
    if (existing.store.tenantId !== tenantId) throw new IdempotencyConflictError();
    const { store: _store, ...invoice } = existing;
    return invoice;
  };

  const replay = await findReplay();
  if (replay) return { invoice: replay, reused: true as const };

  let customerName: string | undefined;
  // A membership discount is a floor, not a replacement — it never overrides a
  // legitimate coupon/manager discount that's already higher, but a tampered
  // client request can't undercut the plan's earned benefit either, same
  // philosophy as the rest of this file: the client only ever sends
  // productId + quantity for pricing, never a price the server just trusts.
  let effectiveDiscountPercent = discountPercent;
  if (customerId) {
    const customer = await prisma.customer.findFirst({ where: { id: customerId, tenantId }, include: { membershipPlan: true } });
    if (!customer) throw new CustomerNotFoundError();
    customerName = customer.name;
    if (customer.membershipPlan?.isActive) {
      effectiveDiscountPercent = Math.max(effectiveDiscountPercent, Number(customer.membershipPlan.discountPercent));
    }
  }

  const productIds = [...new Set(items.map((i) => i.productId))];
  const products = await prisma.product.findMany({ where: { id: { in: productIds }, tenantId } });
  if (products.length !== productIds.length) throw new ProductNotFoundError();
  const productById = new Map(products.map((p) => [p.id, p]));

  // A bundle is invoiced as one line at its own price (the receipt reads
  // "Family Combo Pack x1", not each component separately), but it carries no
  // stock of its own — what actually decrements is each component, scaled by
  // both the bundle's line quantity and how many of that component the bundle
  // contains.
  const bundleIds = products.filter((p) => p.isBundle).map((p) => p.id);
  const bundleItems = bundleIds.length
    ? await prisma.productBundleItem.findMany({ where: { bundleProductId: { in: bundleIds }, tenantId }, include: { componentProduct: true } })
    : [];
  const bundleItemsByBundleId = new Map<string, typeof bundleItems>();
  for (const bi of bundleItems) {
    const list = bundleItemsByBundleId.get(bi.bundleProductId) ?? [];
    list.push(bi);
    bundleItemsByBundleId.set(bi.bundleProductId, list);
  }

  interface StockMove {
    productId: string;
    name: string;
    sku: string;
    stockQty: number;
    minThreshold: number;
    quantity: number;
  }
  // Merged by product id — two bundles sharing a component, or a bundle plus
  // that same component bought individually in the same cart, both resolve to
  // one combined decrement instead of two guarded updates racing against a
  // stockQty snapshot that only the first one would still be accurate for.
  const stockMovesByProduct = new Map<string, StockMove>();
  function addStockMove(productId: string, name: string, sku: string, stockQty: number, minThreshold: number, quantity: number) {
    const existing = stockMovesByProduct.get(productId);
    if (existing) existing.quantity += quantity;
    else stockMovesByProduct.set(productId, { productId, name, sku, stockQty, minThreshold, quantity });
  }
  for (const { productId, quantity } of items) {
    const product = productById.get(productId)!;
    if (product.isBundle) {
      for (const bi of bundleItemsByBundleId.get(productId) ?? []) {
        addStockMove(bi.componentProductId, bi.componentProduct.name, bi.componentProduct.sku, bi.componentProduct.stockQty, bi.componentProduct.minThreshold, quantity * bi.quantity);
      }
    } else {
      addStockMove(productId, product.name, product.sku, product.stockQty, product.minThreshold, quantity);
    }
  }
  const stockMoves = [...stockMovesByProduct.values()];

  const lowStockAlerts: LowStockAlert[] = [];
  let updatedCustomer: Awaited<ReturnType<typeof prisma.customer.update>> | undefined;

  try {
    const invoice = await prisma.$transaction(async (tx) => {
      const profile = await tx.tenantProfile.update({
        where: { tenantId },
        data: { nextInvoiceNumber: { increment: 1 } },
      });
      let invoiceNumber = `${profile.invoicePrefix}${profile.nextInvoiceNumber - 1}`;

      // The counter can fall behind invoices that already exist (a re-seed,
      // or someone lowering it in Business Profile settings). Rather than
      // failing every checkout on the unique constraint, resume after the
      // highest number already issued with this prefix.
      const taken = await tx.invoice.findFirst({ where: { storeId, invoiceNumber }, select: { id: true } });
      if (taken) {
        const prefix = profile.invoicePrefix;
        const [{ highest }] = await tx.$queryRaw<{ highest: bigint | null }[]>`
          SELECT MAX(SUBSTRING(i."invoiceNumber" FROM ${prefix.length + 1}::int)::bigint) AS highest
          FROM invoices i JOIN stores s ON s.id = i."storeId"
          WHERE s."tenantId" = ${tenantId}
            AND LEFT(i."invoiceNumber", ${prefix.length}::int) = ${prefix}
            AND SUBSTRING(i."invoiceNumber" FROM ${prefix.length + 1}::int) ~ '^[0-9]+$'`;
        const next = Number(highest ?? 0) + 1;
        await tx.tenantProfile.update({ where: { tenantId }, data: { nextInvoiceNumber: next + 1 } });
        invoiceNumber = `${prefix}${next}`;
      }

      // Discount first, then GST on the discounted value (see computeInvoiceTotals).
      const totals = computeInvoiceTotals(
        items.map(({ productId, quantity, unitPrice }) => {
          const product = productById.get(productId)!;
          return { productId, quantity, price: unitPrice ?? Number(product.price), gstRate: Number(product.gstRate) };
        }),
        effectiveDiscountPercent,
      );
      const lineItems = totals.lines.map(({ productId, quantity, price, gstRate, total }) => ({ productId, quantity, price, gstRate, total }));
      const { subtotal, discountTotal, taxTotal, total } = totals;
      const pointsEarned = customerId ? Math.floor(total / 100) : 0;

      for (const move of stockMoves) {
        const result = await tx.product.updateMany({
          where: { id: move.productId, stockQty: { gte: move.quantity } },
          data: { stockQty: { decrement: move.quantity } },
        });
        if (result.count !== 1) {
          throw new InsufficientStockError(move.productId, move.name);
        }

        const newQty = move.stockQty - move.quantity;
        if (move.stockQty > move.minThreshold && newQty <= move.minThreshold) {
          lowStockAlerts.push({
            tenantId,
            productName: move.name,
            sku: move.sku,
            stockQty: newQty,
            minThreshold: move.minThreshold,
          });
        }
      }

      const created = await tx.invoice.create({
        data: {
          storeId,
          customerId,
          createdById,
          ...(customerName ? { customerName } : {}),
          invoiceNumber,
          status: 'PAID',
          paymentMethod,
          subtotal,
          discountTotal,
          taxTotal,
          total,
          loyaltyPointsEarned: pointsEarned,
          idempotencyKey,
          customerPhone,
          location,
          seatNo,
          paymentReference,
          items: { create: lineItems },
        },
        include: invoiceInclude,
      });

      if (customerId) {
        if (pointsEarned > 0) {
          updatedCustomer = await tx.customer.update({
            where: { id: customerId },
            data: { loyaltyPoints: { increment: pointsEarned } },
          });
        }
      }

      return created;
    });

    for (const alert of lowStockAlerts) notifyLowStock(NOTIFICATION_SERVICE_URL, alert);
    indexInvoice(invoice, tenantId);
    if (updatedCustomer) indexCustomer(updatedCustomer);

    return { invoice, reused: false as const };
  } catch (err) {
    // Two near-simultaneous retries of the same offline sale could both pass
    // the pre-check above before either commits — the unique constraint is
    // what actually prevents the duplicate; this just turns that race into
    // the same "here's your existing invoice" response as the normal case.
    if (idempotencyKey && (err as { code?: string }).code === 'P2002') {
      const existing = await findReplay();
      if (existing) return { invoice: existing, reused: true as const };
    }
    throw err;
  }
}
