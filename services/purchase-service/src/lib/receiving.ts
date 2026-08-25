import { prisma } from './prisma';

export class PurchaseOrderNotFoundError extends Error {
  constructor() {
    super('Purchase order not found');
  }
}

export class OverReceiveError extends Error {
  constructor(public productId: string, public productName: string, public remaining: number) {
    super(`Cannot receive more than the ${remaining} unit(s) still outstanding for ${productName}`);
  }
}

export class SerialCountMismatchError extends Error {
  constructor(public productId: string, public expected: number, public actual: number) {
    super(`Expected ${expected} serial number(s) but got ${actual}`);
  }
}

export interface ReceiveItemInput {
  productId: string;
  receivedQty: number;
  // Only meaningful when the product opts into batch/serial tracking
  // (Product.trackBatches / trackSerials) — plain products ignore these.
  batch?: { batchNumber: string; expiryDate?: string };
  serialNumbers?: string[];
}

export interface ReceiveGoodsParams {
  tenantId: string;
  purchaseOrderId: string;
  items: ReceiveItemInput[];
  receivedBy: string;
  notes?: string;
}

export const grnInclude = {
  items: { include: { product: { select: { id: true, name: true, sku: true } } } },
  purchaseOrder: { select: { id: true, poNumber: true, orderStatus: true } },
  supplier: { select: { id: true, name: true } },
} as const;

// The one real stock-moving transaction for inbound goods — a PO can be
// received across several shipments, each call here is one of them. Guards
// against receiving more than what's still outstanding on each line, and
// recomputes the PO's status from the accumulated total rather than assuming
// "any receipt means fully received" the way the old single-shot /receive
// endpoint used to.
export async function receiveGoods(params: ReceiveGoodsParams) {
  const { tenantId, purchaseOrderId, items, receivedBy, notes } = params;

  const purchaseOrder = await prisma.purchaseOrder.findFirst({
    where: { id: purchaseOrderId, tenantId },
    include: { items: { include: { product: { select: { id: true, name: true, trackSerials: true } } } } },
  });
  if (!purchaseOrder) throw new PurchaseOrderNotFoundError();

  const poItemByProduct = new Map(purchaseOrder.items.map((i) => [i.productId, i]));
  for (const item of items) {
    const poItem = poItemByProduct.get(item.productId);
    const remaining = poItem ? poItem.qty - poItem.receivedQty : 0;
    if (!poItem || item.receivedQty > remaining) {
      throw new OverReceiveError(item.productId, poItem?.product.name ?? item.productId, remaining);
    }
    if (poItem.product.trackSerials && item.serialNumbers && item.serialNumbers.length !== item.receivedQty) {
      throw new SerialCountMismatchError(item.productId, item.receivedQty, item.serialNumbers.length);
    }
  }

  const existingCount = await prisma.goodsReceivedNote.count({ where: { tenantId } });
  const grnNumber = `GRN-${4000 + existingCount + 1}`;

  const grn = await prisma.$transaction(async (tx) => {
    for (const item of items) {
      await tx.product.update({ where: { id: item.productId }, data: { stockQty: { increment: item.receivedQty } } });
      await tx.purchaseOrderItem.update({
        where: { id: poItemByProduct.get(item.productId)!.id },
        data: { receivedQty: { increment: item.receivedQty } },
      });
    }

    const updatedItems = await tx.purchaseOrderItem.findMany({ where: { purchaseOrderId } });
    const fullyReceived = updatedItems.every((i) => i.receivedQty >= i.qty);
    const anyReceived = updatedItems.some((i) => i.receivedQty > 0);
    await tx.purchaseOrder.update({
      where: { id: purchaseOrderId },
      data: { orderStatus: fullyReceived ? 'RECEIVED' : anyReceived ? 'PARTIALLY_RECEIVED' : 'PENDING' },
    });

    const created = await tx.goodsReceivedNote.create({
      data: {
        tenantId,
        grnNumber,
        purchaseOrderId,
        supplierId: purchaseOrder.supplierId,
        receivedBy,
        notes,
        items: { create: items.map((i) => ({ productId: i.productId, receivedQty: i.receivedQty })) },
      },
      include: grnInclude,
    });

    for (const item of items) {
      if (item.batch) {
        const poItem = poItemByProduct.get(item.productId)!;
        await tx.productBatch.upsert({
          where: { tenantId_productId_batchNumber: { tenantId, productId: item.productId, batchNumber: item.batch.batchNumber } },
          update: { quantity: { increment: item.receivedQty } },
          create: {
            tenantId,
            productId: item.productId,
            batchNumber: item.batch.batchNumber,
            quantity: item.receivedQty,
            costPrice: poItem.unitPrice,
            expiryDate: item.batch.expiryDate ? new Date(item.batch.expiryDate) : undefined,
            goodsReceivedNoteId: created.id,
          },
        });
      }
      if (item.serialNumbers?.length) {
        await tx.productSerial.createMany({
          data: item.serialNumbers.map((serialNumber) => ({
            tenantId,
            productId: item.productId,
            serialNumber,
            goodsReceivedNoteId: created.id,
          })),
        });
      }
    }

    return created;
  });

  return grn;
}
