import { Router } from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import rateLimit from 'express-rate-limit';
import { requireAuth } from '@pospe/permissions';

const router = Router();

// The FoodApp (React Native) talks to a flat, un-prefixed API contract —
// /api/login, /api/cart-items, … — served by mobile-service. These paths are
// claimed here before the per-service /api/<service> prefixes below.
const MOBILE_SERVICE_URL = process.env.MOBILE_SERVICE_URL || 'http://localhost:4011';
const MOBILE_ROUTES = [
  'login', 'logout', 'get-vendors', 'add-vendor', 'get-user-data', 'update-profile', 'add-pos-details',
  'get-categories', 'get-category-wise-all-product', 'get-products-by-category', 'get-products-by-barcode', 'search-products',
  'add-to-cart', 'update-order', 'cart-items', 'order-items', 'update-cart-quantity', 'order-quantity-update',
  'delete-cart-item', 'order-item-delete', 'add-cart-item-discount', 'add-order-item-discount',
  'get-branch', 'seats', 'create-razorpay-order', 'place-order', 'complete-order', 'place-draft-order',
  'draft-order-details', 'order-history', 'draft-order-history', 'order-details', 'dashboard',
  'get-date-wise-total-payment', 'get-transaction-details', 'get-order-by-order-id',
  'get-sellers', 'purchase-store', 'get-report-list', 'get-report-excel-link', 'get-login-logs', 'report-download',
];
const MOBILE_PATTERN = new RegExp(`^/api/(${MOBILE_ROUTES.join('|')})(/|$)`);
// login issues the token; a report download link carries its own signed proof
// (the app fetches it with no Authorization header).
const MOBILE_PUBLIC_PATTERN = /^\/api\/(login|report-download\/.+)$/;

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

// Routes nobody could be logged in to call yet (issuing the very token
// requireAuth would check), plus the Razorpay server-to-server webhook, which
// authenticates itself via HMAC signature, not a user session.
const PUBLIC_PATHS = [
  '/api/auth/login',
  '/api/auth/login/pin',
  '/api/auth/login/2fa-verify',
  '/api/auth/refresh',
  '/api/auth/register',
  '/api/auth/password/forgot',
  '/api/auth/password/reset',
  '/api/auth/verify-email',
  '/api/auth/verify-email/resend',
  '/api/payment/payments/razorpay/webhook',
  '/api/payment/payments/cashfree/webhook',
  '/api/payment/payments/phonepe/webhook',
];

// Credential-guessing surface: password/PIN/2FA logins and OTP redemption.
// Far tighter than the gateway-wide limit; keyed per client IP (index.ts
// sets trust proxy so this is the real client, not the ingress).
const credentialLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many attempts. Please wait a few minutes and try again.' },
});
const CREDENTIAL_PATHS = new Set([
  '/api/auth/login',
  '/api/auth/login/pin',
  '/api/auth/login/2fa-verify',
  '/api/auth/register',
  '/api/auth/password/forgot',
  '/api/auth/password/reset',
  '/api/auth/verify-email',
  '/api/auth/verify-email/resend',
]);

CREDENTIAL_PATHS.add('/api/login');

// The app toasts body.message on every failure; the gateway's own rejections
// (rate limit, missing token) say { error }, so mirror it for these routes.
router.use((req, res, next) => {
  if (!MOBILE_PATTERN.test(req.path)) return next();
  const json = res.json.bind(res);
  res.json = (body: unknown) => {
    if (res.statusCode >= 400 && body && typeof body === 'object' && !Array.isArray(body)) {
      const b = body as Record<string, unknown>;
      if (b.message == null && typeof b.error === 'string') b.message = b.error;
    }
    return json(body);
  };
  next();
});

router.use((req, res, next) => (CREDENTIAL_PATHS.has(req.path) ? credentialLimiter(req, res, next) : next()));

// Each downstream service already treats its own /docs (plus the static
// Swagger UI assets it serves under that same path) and /openapi.json as
// public, the same way it treats /health — mirror that here so the links on
// the gateway's aggregated /docs page actually render without a Bearer token.
const PUBLIC_DOCS_PATTERN = /\/docs(\/.*)?$|\/openapi\.json$/;

// Locally stored product images (dev fallback when S3 isn't configured):
// <img> tags can't send a bearer token, and object keys are random UUIDs.
// Sales-service business logos use the same scheme (unguessable filenames).
const PUBLIC_UPLOADS_PATTERN = /^\/api\/(inventory|sales)\/uploads\//;

router.use((req, res, next) => {
  if (PUBLIC_PATHS.includes(req.path) || PUBLIC_DOCS_PATTERN.test(req.path) || PUBLIC_UPLOADS_PATTERN.test(req.path) || MOBILE_PUBLIC_PATTERN.test(req.path)) return next();
  return requireAuth(req, res, next);
});

const mobileProxy = createProxyMiddleware({
  target: MOBILE_SERVICE_URL,
  changeOrigin: true,
  xfwd: true,
  pathRewrite: { '^/api': '' },
});
router.use((req, res, next) => (MOBILE_PATTERN.test(req.path) ? mobileProxy(req, res, next) : next()));

for (const [prefix, target] of Object.entries(services)) {
  router.use(
    `/api/${prefix}`,
    createProxyMiddleware({
      target,
      changeOrigin: true,
      // Forward X-Forwarded-For so services log/audit the real client IP.
      xfwd: true,
      pathRewrite: { [`^/api/${prefix}`]: '' },
    }),
  );
}

export default router;
