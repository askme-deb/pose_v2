export type GstFormType = 'GSTR-1' | 'GSTR-3B';
export type GstFilingStatus = 'filed' | 'pending';

export interface GstReturn {
  id: string;
  formType: GstFormType;
  periodMonth: string;
  billedTurnover: number;
  taxLiability: number;
  arn: string;
  status: GstFilingStatus;
}

export const gstReturns: GstReturn[] = [
  { id: 'gst-901', formType: 'GSTR-1', periodMonth: '2026-08-01', billedTurnover: 148920, taxLiability: 17870.4, arn: '', status: 'pending' },
  { id: 'gst-902', formType: 'GSTR-3B', periodMonth: '2026-07-01', billedTurnover: 215400, taxLiability: 25848, arn: 'AA270726098712', status: 'filed' },
  { id: 'gst-903', formType: 'GSTR-1', periodMonth: '2026-06-01', billedTurnover: 198600, taxLiability: 23832, arn: 'AA270626084123', status: 'filed' },
  { id: 'gst-904', formType: 'GSTR-3B', periodMonth: '2026-05-01', billedTurnover: 182500, taxLiability: 21900, arn: 'AA270526071490', status: 'filed' },
  { id: 'gst-905', formType: 'GSTR-1', periodMonth: '2026-04-01', billedTurnover: 245000, taxLiability: 29400, arn: 'AA270426061234', status: 'filed' },
  { id: 'gst-906', formType: 'GSTR-3B', periodMonth: '2026-03-01', billedTurnover: 160000, taxLiability: 19200, arn: 'AA270326051982', status: 'filed' },
  { id: 'gst-907', formType: 'GSTR-1', periodMonth: '2026-02-01', billedTurnover: 172400, taxLiability: 20688, arn: 'AA270226043765', status: 'filed' },
  { id: 'gst-908', formType: 'GSTR-3B', periodMonth: '2026-01-01', billedTurnover: 158900, taxLiability: 19068, arn: 'AA270126039981', status: 'filed' },
];

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export interface TaxSlab {
  rate: number;
  label: string;
  taxableAmount: number;
  cgst: number;
  sgst: number;
  total: number;
  itemsCount: string;
}

function makeSlab(rate: number, taxableAmount: number, label: string, itemsCount: string): TaxSlab {
  const cgst = round2((taxableAmount * rate) / 2 / 100);
  const sgst = cgst;
  return { rate, label, taxableAmount, cgst, sgst, total: round2(cgst + sgst), itemsCount };
}

export const taxSlabs: TaxSlab[] = [
  makeSlab(0, 52400, '0% Exempt Items', '8 SKUs (Fresh Fruits, Raw Grains)'),
  makeSlab(5, 220000, '5% Essential Groceries', '24 SKUs (Dairy, Organic Produce)'),
  makeSlab(12, 280000, '12% Processed Foods', '18 SKUs (Beverages, Snacks)'),
  makeSlab(18, 340000, '18% Standard GST', '14 SKUs (Chocolates, Premium Oils)'),
  makeSlab(28, 95000, '28% Luxury & Sin Goods', '6 SKUs (Aerated Drinks, Premium Electronics)'),
];

export const gstFormOptions = [
  { value: 'GSTR-1', label: 'GSTR-1 (Outward Supplies)' },
  { value: 'GSTR-3B', label: 'GSTR-3B (Summary Return)' },
];
