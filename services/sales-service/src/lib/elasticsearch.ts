import { Client } from '@elastic/elasticsearch';
import type { Prisma } from '@prisma/client';

export const esClient = new Client({ node: process.env.ELASTICSEARCH_URL || 'http://localhost:9200' });

export const CUSTOMERS_INDEX = 'pospe_customers';
export const INVOICES_INDEX = 'pospe_invoices';

interface IndexableCustomer {
  id: string;
  tenantId: string;
  name: string;
  phone: string | null;
  email: string | null;
  tier: string;
  loyaltyPoints: number;
}

interface IndexableInvoice {
  id: string;
  storeId: string;
  invoiceNumber: string;
  customerName: string;
  total: Prisma.Decimal | number | string;
  status: string;
  createdAt: Date | string;
}

// Best-effort — a slow/down Elasticsearch must never fail or block the
// customer/invoice write that triggered it. Same fire-and-forget posture as
// notifyLowStock (@pospe/notifications).
export function indexCustomer(customer: IndexableCustomer): void {
  esClient
    .index({
      index: CUSTOMERS_INDEX,
      id: customer.id,
      document: {
        id: customer.id,
        tenantId: customer.tenantId,
        name: customer.name,
        phone: customer.phone,
        email: customer.email,
        tier: customer.tier,
        loyaltyPoints: customer.loyaltyPoints,
      },
    })
    .catch(() => {});
}

export function deleteCustomerFromIndex(id: string): void {
  esClient.delete({ index: CUSTOMERS_INDEX, id }).catch(() => {});
}

// Invoices don't carry tenantId directly (only storeId) — the search-side
// filter this feeds is scoped by tenant elsewhere anyway (see the gateway's
// known limitation note), so storeId is enough to identify the document.
export function indexInvoice(invoice: IndexableInvoice): void {
  esClient
    .index({
      index: INVOICES_INDEX,
      id: invoice.id,
      document: {
        id: invoice.id,
        storeId: invoice.storeId,
        invoiceNumber: invoice.invoiceNumber,
        customerName: invoice.customerName,
        total: Number(invoice.total),
        status: invoice.status,
        createdAt: invoice.createdAt,
      },
    })
    .catch(() => {});
}
