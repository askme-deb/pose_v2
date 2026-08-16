import { Router } from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';

const router = Router();

// Map each downstream microservice to its base URL. Override via env in production.
const services: Record<string, string> = {
  auth: process.env.AUTH_SERVICE_URL || 'http://localhost:4001',
  billing: process.env.BILLING_SERVICE_URL || 'http://localhost:4002',
  inventory: process.env.INVENTORY_SERVICE_URL || 'http://localhost:4003',
  purchase: process.env.PURCHASE_SERVICE_URL || 'http://localhost:4004',
  sales: process.env.SALES_SERVICE_URL || 'http://localhost:4005',
  payment: process.env.PAYMENT_SERVICE_URL || 'http://localhost:4006',
  notification: process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:4007',
  subscription: process.env.SUBSCRIPTION_SERVICE_URL || 'http://localhost:4008',
  reporting: process.env.REPORTING_SERVICE_URL || 'http://localhost:4009',
  sync: process.env.SYNCHRONIZATION_SERVICE_URL || 'http://localhost:4010',
};

for (const [prefix, target] of Object.entries(services)) {
  router.use(
    `/api/${prefix}`,
    createProxyMiddleware({
      target,
      changeOrigin: true,
      pathRewrite: { [`^/api/${prefix}`]: '' },
    }),
  );
}

export default router;
