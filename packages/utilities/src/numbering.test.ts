import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createWithNextNumber } from './numbering';

const clash = () => Object.assign(new Error('Unique constraint failed'), { code: 'P2002' });

test('uses count + 1 when it is free', async () => {
  const seqs: number[] = [];
  const result = await createWithNextNumber(async () => 4, async (seq) => (seqs.push(seq), `PO-${seq}`));
  assert.equal(result, 'PO-5');
  assert.deepEqual(seqs, [5]);
});

test('steps past numbers already taken (concurrent create or deletions)', async () => {
  const taken = new Set([5, 6]);
  const result = await createWithNextNumber(async () => 4, async (seq) => {
    if (taken.has(seq)) throw clash();
    return seq;
  });
  assert.equal(result, 7);
});

test('rethrows other errors at once, and a clash after the last attempt', async () => {
  let calls = 0;
  await assert.rejects(createWithNextNumber(async () => 0, async () => (calls++, Promise.reject(new Error('boom')))), /boom/);
  assert.equal(calls, 1);
  await assert.rejects(createWithNextNumber(async () => 0, async () => Promise.reject(clash()), 3), /Unique constraint/);
});
