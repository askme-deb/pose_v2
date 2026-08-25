import { Router } from 'express';

const router = Router();

// Every downstream service that exposes its own /docs (via
// @pospe/utilities' apiDocsMiddleware) proxied through the gateway's
// /api/<prefix> prefix — kept in sync with routes/proxy.ts's service map.
const serviceDocs: { prefix: string; label: string }[] = [
  { prefix: 'auth', label: 'Authentication' },
  { prefix: 'billing', label: 'Billing' },
  { prefix: 'inventory', label: 'Inventory' },
  { prefix: 'purchase', label: 'Purchase' },
  { prefix: 'sales', label: 'Sales' },
  { prefix: 'payment', label: 'Payment' },
  { prefix: 'notification', label: 'Notification' },
  { prefix: 'subscription', label: 'Subscription' },
  { prefix: 'reporting', label: 'Reporting' },
  { prefix: 'sync', label: 'Synchronization' },
];

router.get('/docs', (_req, res) => {
  const items = serviceDocs
    .map((s) => `<li><a href="/api/${s.prefix}/docs">${s.label} Service</a> — <a href="/api/${s.prefix}/openapi.json">openapi.json</a></li>`)
    .join('\n');
  res.type('html').send(`<!doctype html>
<html>
<head><meta charset="utf-8"><title>ApexPOS API Docs</title>
<style>
  body { font-family: system-ui, sans-serif; max-width: 640px; margin: 48px auto; padding: 0 16px; }
  h1 { font-size: 20px; }
  ul { line-height: 2; }
  a { color: #0f766e; text-decoration: none; }
  a:hover { text-decoration: underline; }
</style>
</head>
<body>
  <h1>ApexPOS Platform API Docs</h1>
  <p>Each service publishes its own live-generated OpenAPI 3.0 spec and Swagger UI, reflecting its actual mounted routes.</p>
  <ul>${items}</ul>
</body>
</html>`);
});

export default router;
