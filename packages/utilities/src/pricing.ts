// Money here is rupees as JS numbers, rounded to paise at every step that
// produces a stored value — the same precision as the Decimal(12, 2) columns.
export const round2 = (n: number): number => Math.round((n + Number.EPSILON) * 100) / 100;

export interface PricedLineInput {
  price: number;
  quantity: number;
  gstRate: number;
}

export interface PricedLine extends PricedLineInput {
  gross: number;
  discount: number;
  taxable: number;
  tax: number;
  total: number;
}

export interface InvoiceTotals<L extends PricedLineInput> {
  lines: (L & PricedLine)[];
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  total: number;
}

/**
 * GST is levied on the transaction value after a discount shown on the
 * invoice (CGST Act s.15(3)(a)), so the discount is applied per line first
 * and tax is computed on what remains. Every billing path (POS checkout,
 * held bills, quotations, credit notes) prices through this one function so
 * a held bill's total always equals the invoice it becomes.
 */
export function computeInvoiceTotals<L extends PricedLineInput>(items: L[], discountPercent = 0): InvoiceTotals<L> {
  const pct = Math.min(Math.max(discountPercent, 0), 100) / 100;
  let subtotal = 0;
  let discountTotal = 0;
  let taxTotal = 0;
  let total = 0;

  const lines = items.map((item) => {
    const gross = round2(item.price * item.quantity);
    const discount = round2(gross * pct);
    const taxable = round2(gross - discount);
    const tax = round2(taxable * (item.gstRate / 100));
    const lineTotal = round2(taxable + tax);
    subtotal += gross;
    discountTotal += discount;
    taxTotal += tax;
    total += lineTotal;
    return { ...item, gross, discount, taxable, tax, total: lineTotal };
  });

  return {
    lines,
    subtotal: round2(subtotal),
    discountTotal: round2(discountTotal),
    taxTotal: round2(taxTotal),
    total: round2(total),
  };
}

export interface FlatDiscountLineInput extends PricedLineInput {
  // Flat rupee discount on this line only (before the bill-level discount).
  discountAmount?: number;
}

export interface FlatDiscountTotals<L extends FlatDiscountLineInput> {
  lines: (L & PricedLine)[];
  subtotal: number;
  /** Line discounts + bill discount + complimentary, all in one figure. */
  discountTotal: number;
  taxTotal: number;
  total: number;
}

/**
 * Mobile/handheld pricing with flat rupee discounts: a discount per line, a
 * bill-level discount and a complimentary value, the last two spread across
 * lines in proportion to what each line still costs after its own discount.
 * As in computeInvoiceTotals, GST is charged on the post-discount value.
 * Discounts can never push a line below zero; any excess is capped.
 */
export function computeFlatDiscountTotals<L extends FlatDiscountLineInput>(
  items: L[],
  billDiscount = 0,
  complimentary = 0,
): FlatDiscountTotals<L> {
  const grossOf = (i: L) => round2(i.price * i.quantity);
  const afterLine = items.map((i) => Math.max(0, round2(grossOf(i) - Math.min(Math.max(i.discountAmount ?? 0, 0), grossOf(i)))));
  const base = afterLine.reduce((a, b) => a + b, 0);
  const extra = Math.min(Math.max(billDiscount, 0) + Math.max(complimentary, 0), base);

  let allocated = 0;
  let subtotal = 0;
  let discountTotal = 0;
  let taxTotal = 0;
  let total = 0;
  const lines = items.map((item, idx) => {
    const gross = grossOf(item);
    const lineDiscount = round2(gross - afterLine[idx]);
    // Last line absorbs the rounding remainder so the shares sum exactly to `extra`.
    const share = idx === items.length - 1 ? round2(extra - allocated) : base > 0 ? round2((extra * afterLine[idx]) / base) : 0;
    allocated = round2(allocated + share);
    const discount = round2(lineDiscount + share);
    const taxable = round2(gross - discount);
    const tax = round2(taxable * (item.gstRate / 100));
    const lineTotal = round2(taxable + tax);
    subtotal += gross;
    discountTotal += discount;
    taxTotal += tax;
    total += lineTotal;
    return { ...item, gross, discount, taxable, tax, total: lineTotal };
  });

  return { lines, subtotal: round2(subtotal), discountTotal: round2(discountTotal), taxTotal: round2(taxTotal), total: round2(total) };
}
