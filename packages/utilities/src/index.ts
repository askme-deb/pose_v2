export const formatCurrencyINR = (paise: number): string =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(paise / 100);

export const calcGst = (amount: number, ratePercent: number) => {
  const tax = Math.round(amount * (ratePercent / 100));
  return { amount, tax, total: amount + tax };
};

export const generateInvoiceNumber = (prefix: string, seq: number): string =>
  `${prefix}-${String(seq).padStart(6, '0')}`;
