import { round2 } from './pricing';

export const formatCurrencyINR = (paise: number): string =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(paise / 100);

// Kept for single-amount callers; rounds to paise like computeInvoiceTotals.
export const calcGst = (amount: number, ratePercent: number) => {
  const tax = round2(amount * (ratePercent / 100));
  return { amount, tax, total: round2(amount + tax) };
};

export const generateInvoiceNumber = (prefix: string, seq: number): string =>
  `${prefix}-${String(seq).padStart(6, '0')}`;

export { metricsMiddleware } from './metrics';
export { apiDocsMiddleware } from './apiDocs';
export { installAsyncErrorHandling, errorHandler } from './errors';
export { initObservability, captureException } from './observability';
export { computeInvoiceTotals, round2, type PricedLine, type PricedLineInput, type InvoiceTotals } from './pricing';
export { createRedisConnection, createQueue, createWorker, enqueue, queueingEnabled } from './queue';
