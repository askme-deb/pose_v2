// Document numbers (PO-9001, GRN-4001, …) are "how many exist + 1", which two
// simultaneous creates both compute — the second then hits the
// @@unique([tenantId, …Number]) constraint. Retrying with the next sequence
// number resolves it (and also steps past numbers freed by deletions).

const isUniqueViolation = (err: unknown) => (err as { code?: string } | null)?.code === 'P2002';

/**
 * Runs `create(seq)` with seq = count() + 1, and on a unique-constraint clash
 * tries seq + 1, seq + 2, … Put the whole create (or its $transaction) inside
 * `create` so a failed attempt leaves nothing behind.
 */
export async function createWithNextNumber<T>(count: () => Promise<number>, create: (seq: number) => Promise<T>, attempts = 10): Promise<T> {
  const base = await count();
  for (let i = 0; ; i++) {
    try {
      return await create(base + 1 + i);
    } catch (err) {
      if (i >= attempts - 1 || !isUniqueViolation(err)) throw err;
    }
  }
}
