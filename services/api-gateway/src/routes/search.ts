import { Router } from 'express';
import { requireAuth, tenantIdOf } from '@pospe/permissions';
import { esClient, SEARCH_INDICES } from '../lib/elasticsearch';

const router = Router();

interface GroupedResults {
  products: Record<string, unknown>[];
  customers: Record<string, unknown>[];
  invoices: Record<string, unknown>[];
}

// Cross-entity search doesn't belong to any single downstream service — no
// existing prefix owns products (inventory) + customers/invoices (sales)
// together — so this is a real route on the gateway itself, not a proxy
// passthrough. Every index document carries tenantId, and results are
// filtered to the tenant signed into the caller's token.
router.get('/api/search', requireAuth, async (req, res) => {
  const q = String(req.query.q ?? '').trim();
  if (!q) return res.json({ products: [], customers: [], invoices: [] } satisfies GroupedResults);

  try {
    const response = await esClient.search({
      index: Object.values(SEARCH_INDICES).join(','),
      size: 20,
      query: {
        bool: {
          must: {
            multi_match: {
              query: q,
              fields: ['name^2', 'sku', 'barcode', 'hsnCode', 'invoiceNumber^2', 'customerName', 'email', 'phone'],
              fuzziness: 'AUTO',
            },
          },
          filter: { term: { 'tenantId.keyword': tenantIdOf(req) } },
        },
      },
    });

    const grouped: GroupedResults = { products: [], customers: [], invoices: [] };
    for (const hit of response.hits.hits) {
      const doc = { ...(hit._source as Record<string, unknown>), _id: hit._id };
      if (hit._index === SEARCH_INDICES.products) grouped.products.push(doc);
      else if (hit._index === SEARCH_INDICES.customers) grouped.customers.push(doc);
      else if (hit._index === SEARCH_INDICES.invoices) grouped.invoices.push(doc);
    }
    res.json(grouped);
  } catch (err) {
    req.log?.error({ err }, 'Search query failed');
    res.status(502).json({ error: 'Search is temporarily unavailable' });
  }
});

export default router;
