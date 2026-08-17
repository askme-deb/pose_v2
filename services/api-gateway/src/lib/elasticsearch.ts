import { Client } from '@elastic/elasticsearch';

export const esClient = new Client({ node: process.env.ELASTICSEARCH_URL || 'http://localhost:9200' });

export const SEARCH_INDICES = {
  products: 'pospe_products',
  customers: 'pospe_customers',
  invoices: 'pospe_invoices',
} as const;
