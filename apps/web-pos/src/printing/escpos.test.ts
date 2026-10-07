import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildEscPosReceipt, DRAWER_KICK, type ReceiptData } from './escpos';

const receipt: ReceiptData = {
  storeName: 'Apex ₹ Mart',
  invoiceNumber: 'INV-1001',
  cashier: 'Ananya',
  register: 'Lane 1',
  createdAt: '2026-10-07T10:00:00Z',
  items: [{ name: 'A very long product name that will not fit on one thermal line', quantity: 2, unitPrice: 49.5, lineTotal: 99 }],
  subtotal: 99,
  gst: 4.95,
  total: 103.95,
  method: 'Cash',
  tendered: 200,
  change: 96.05,
};

const text = (bytes: Uint8Array) => Buffer.from(bytes).toString('latin1');
const contains = (haystack: Uint8Array, needle: number[]) => text(haystack).includes(Buffer.from(needle).toString('latin1'));

test('starts with ESC @ and ends with a paper cut', () => {
  const bytes = buildEscPosReceipt(receipt);
  assert.deepEqual([...bytes.slice(0, 2)], [0x1b, 0x40]);
  assert.ok(contains(bytes, [0x1d, 0x56, 0x42, 0x00]));
});

test('no line exceeds the paper width (58 mm = 32 columns)', () => {
  const lines = text(buildEscPosReceipt(receipt, 58))
    .replace(/[\x00-\x09\x0b-\x1f]./g, '')
    .split('\n');
  for (const line of lines) assert.ok(line.replace(/[^\x20-\x7e]/g, '').length <= 32, `too long: "${line}"`);
});

test('output is ASCII-safe (₹ becomes Rs.)', () => {
  const out = text(buildEscPosReceipt(receipt));
  assert.ok(out.includes('Apex Rs. Mart'));
  assert.ok(out.includes('TOTAL'));
});

test('cash drawer kick is only sent when requested', () => {
  assert.ok(!contains(buildEscPosReceipt(receipt, 80, false), DRAWER_KICK));
  assert.ok(contains(buildEscPosReceipt(receipt, 80, true), DRAWER_KICK));
});
