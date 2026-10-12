import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeInvoiceTotals, computeFlatDiscountTotals, round2 } from './pricing';
import { calcGst } from './index';

test('GST is charged on the discounted value, not the list price', () => {
  // ₹1000 at 18% with a 10% discount: taxable 900, GST 162, total 1062.
  const t = computeInvoiceTotals([{ price: 1000, quantity: 1, gstRate: 18 }], 10);
  assert.equal(t.subtotal, 1000);
  assert.equal(t.discountTotal, 100);
  assert.equal(t.taxTotal, 162);
  assert.equal(t.total, 1062);
  assert.equal(t.lines[0].taxable, 900);
});

test('totals always reconcile: subtotal - discount + tax = total', () => {
  const t = computeInvoiceTotals(
    [
      { price: 33.33, quantity: 3, gstRate: 5 },
      { price: 199.99, quantity: 2, gstRate: 18 },
      { price: 12.5, quantity: 7, gstRate: 0 },
    ],
    7.5,
  );
  assert.equal(round2(t.subtotal - t.discountTotal + t.taxTotal), t.total);
  assert.equal(round2(t.lines.reduce((s, l) => s + l.total, 0)), t.total);
});

test('amounts are rounded to paise, never fractions of a paisa', () => {
  const t = computeInvoiceTotals([{ price: 10.01, quantity: 3, gstRate: 12 }], 3);
  for (const n of [t.subtotal, t.discountTotal, t.taxTotal, t.total, ...t.lines.map((l) => l.tax)]) {
    assert.equal(Math.round(n * 100) / 100, n);
  }
});

test('discount percent is clamped to 0–100', () => {
  assert.equal(computeInvoiceTotals([{ price: 100, quantity: 1, gstRate: 0 }], 150).total, 0);
  assert.equal(computeInvoiceTotals([{ price: 100, quantity: 1, gstRate: 0 }], -5).total, 100);
});

test('extra line fields are preserved (held-bill recompute relies on ids)', () => {
  const t = computeInvoiceTotals([{ id: 'item-1', price: 50, quantity: 2, gstRate: 5 }]);
  assert.equal(t.lines[0].id, 'item-1');
});

test('calcGst rounds to paise (it used to round to whole rupees)', () => {
  assert.deepEqual(calcGst(99.99, 18), { amount: 99.99, tax: 18, total: 117.99 });
  assert.equal(calcGst(10.5, 5).tax, 0.53);
});

test('flat discounts: line + bill + complimentary are spread, GST is on what remains', () => {
  // 2 x ₹100 @5% and 1 x ₹200 @18%: gross 400. Line discount ₹20 on the first,
  // ₹30 bill discount + ₹10 complimentary shared by remaining value (180 / 200).
  const t = computeFlatDiscountTotals(
    [
      { price: 100, quantity: 2, gstRate: 5, discountAmount: 20 },
      { price: 200, quantity: 1, gstRate: 18 },
    ],
    30,
    10,
  );
  assert.equal(t.subtotal, 400);
  assert.equal(t.discountTotal, 60); // 20 + 30 + 10
  assert.equal(t.lines[0].discount + t.lines[1].discount, 60);
  const taxable = t.lines.reduce((s, l) => s + l.taxable, 0);
  assert.equal(round2(taxable), 340);
  assert.equal(round2(t.total), round2(t.lines[0].total + t.lines[1].total));
  assert.equal(round2(t.total - t.taxTotal), 340);
});

test('flat discounts can never push a bill below zero', () => {
  const t = computeFlatDiscountTotals([{ price: 50, quantity: 1, gstRate: 12, discountAmount: 500 }], 999, 999);
  assert.equal(t.total, 0);
  assert.equal(t.discountTotal, 50);
});

test('flat discount shares sum exactly to the bill discount (no paise lost)', () => {
  const items = [1, 2, 3].map(() => ({ price: 33.33, quantity: 1, gstRate: 0 }));
  const t = computeFlatDiscountTotals(items, 10, 0);
  assert.equal(t.discountTotal, 10);
});
