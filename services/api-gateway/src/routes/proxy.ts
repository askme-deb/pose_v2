import { Router } from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import rateLimit from 'express-rate-limit';
import { requireAuth } from '@pospe/permissions';

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

router.use((req, res, next) => (CREDENTIAL_PATHS.has(req.path) ? credentialLimiter(req, res, next) : next()));

// Each downstream service already treats its own /docs (plus the static
// Swagger UI assets it serves under that same path) and /openapi.json as
// public, the same way it treats /health — mirror that here so the links on
// the gateway's aggregated /docs page actually render without a Bearer token.
const PUBLIC_DOCS_PATTERN = /\/docs(\/.*)?$|\/openapi\.json$/;

// Locally stored product images (dev fallback when S3 isn't configured):
// <img> tags can't send a bearer token, and object keys are random UUIDs.
const PUBLIC_UPLOADS_PATTERN = /^\/api\/inventory\/uploads\//;

router.use((req, res, next) => {
  if (PUBLIC_PATHS.includes(req.path) || PUBLIC_DOCS_PATTERN.test(req.path) || PUBLIC_UPLOADS_PATTERN.test(req.path)) return next();
  return requireAuth(req, res, next);
});

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
