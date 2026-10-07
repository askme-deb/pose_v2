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
