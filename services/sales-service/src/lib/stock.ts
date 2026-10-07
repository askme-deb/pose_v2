import type { Prisma } from '@prisma/client';
import { HttpError } from '@pospe/permissions';

type Tx = Prisma.TransactionClient;

export interface StockLine {
  productId: string;
  quantity: number;
}

/**
 * A bundle has no stock of its own — checkout decrements its components —
 * so every path that puts stock back (refunds, credit notes) or takes it out
 * again (cancelling a credit note) must expand bundles the same way.
 * Returns one merged quantity per real stock-carrying product.
 */
export async function expandBundles(tx: Tx, tenantId: string, lines: StockLine[]): Promise<Map<string, number>> {
  const productIds = [...new Set(lines.map((l) => l.productId))];
  const products = await tx.product.findMany({ where: { id: { in: productIds }, tenantId }, select: { id: true, isBundle: true } });
  const bundleIds = products.filter((p) => p.isBundle).map((p) => p.id);
  const components = bundleIds.length
    ? await tx.productBundleItem.findMany({ where: { bundleProductId: { in: bundleIds }, tenantId } })
    : [];

  const moves = new Map<string, number>();
  const add = (id: string, qty: number) => moves.set(id, (moves.get(id) ?? 0) + qty);
  for (const line of lines) {
    if (bundleIds.includes(line.productId)) {
      for (const c of components.filter((c) => c.bundleProductId === line.productId)) add(c.componentProductId, line.quantity * c.quantity);
    } else {
      add(line.productId, line.quantity);
    }
  }
  return moves;
}

export async function restock(tx: Tx, tenantId: string, lines: StockLine[]) {
  for (const [productId, quantity] of await expandBundles(tx, tenantId, lines)) {
    await tx.product.update({ where: { id: productId }, data: { stockQty: { increment: quantity } } });
  }
}

/** Takes stock back out, refusing to go negative (e.g. restocked units already re-sold). */
export async function unstock(tx: Tx, tenantId: string, lines: StockLine[]) {
  for (const [productId, quantity] of await expandBundles(tx, tenantId, lines)) {
    const { count } = await tx.product.updateMany({
      where: { id: productId, tenantId, stockQty: { gte: quantity } },
      data: { stockQty: { decrement: quantity } },
    });
    if (count !== 1) throw new HttpError(409, 'Not enough stock left to reverse this — the returned units may already have been sold');
  }
}
