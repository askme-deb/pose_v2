# Gap Analysis — Current State

Reconciled against `inventory_pos_billing.docx` (Scope of Work) and `Technology Stack.docx`,
and re-verified against the code (unit tests, a live smoke test through the gateway, and a
full monorepo build/lint).

## Summary

The October 2026 pass closed the security, correctness and infrastructure gaps found in the
previous review. **The only module still out of scope is the three mobile apps** (owner,
manager, cashier), which remain Expo placeholders by decision. Push notifications are
waiting on those apps.

---

## Security & multi-tenancy — fixed

| Gap | Fix | Where |
|---|---|---|
| Tenant taken from a client `x-tenant-id` header, falling back to the demo tenant | Tenant comes only from the signed access token; there is no fallback | `packages/permissions/src/middleware.ts` (`tenantIdOf`), every `services/*/src/lib/prisma.ts` |
| `x-store-id` never validated | Store must belong to the caller's tenant (else 403) | `resolveStoreId` in billing/payment/sales/sync |
| Any user could manage every tenant (subscription-service) | New `platform:manage` permission, held only by `SUPER_ADMIN`; `*` never grants `platform:*` | `packages/permissions/src/roles.ts`, `subscription-service/src/index.ts` |
| 2FA bypass: 2FA-pending token accepted as an access token | Access tokens carry `typ: 'access'`; everything else is rejected | `verifyToken` |
| PIN login matched across all tenants (10k-guess brute force) | Terminal pairing; PINs only match one store's staff; per-store + per-IP throttling; PIN uniqueness per store | `authentication/src/routes/auth.ts`, POS `PosLoginPage` |
| notification-service unauthenticated; tenant from request body | `requireAuth`; tenant from token; jobs via queue | `notification-service` |
| `GET /users` returned password/PIN hashes and TOTP secrets | Explicit safe field selection | `authentication/src/routes/users.ts` |
| 2FA could be disabled with only a session | Requires a current TOTP code | `twoFactor.ts` |
| Audit log actor was client-supplied | Actor resolved from the authenticated user | `actorOf` in auth/subscription audit libs |
| Search returned every tenant's data | Index docs carry `tenantId`; queries filter by token tenant | `api-gateway/src/routes/search.ts` |
| Global idempotency key could return another tenant's invoice | Replay only honoured within the same tenant | `sales-service/src/lib/checkout.ts` |
| Tenant RBAC matrix edited in the UI but never enforced | Effective permissions derived from the matrix at token issue | `effectivePermissions`, `perms` claim |
| No logout / revocation; no refresh in clients | Token versioning revokes refresh tokens on logout, password change/reset and deactivation; all clients refresh transparently | `tokens.ts`, `packages/api-client` |
| No brute-force protection | Account lockout after 5 failures; gateway credential rate limit | `auth.ts`, `api-gateway/src/routes/proxy.ts` |
| Suspended tenants could still sign in | Login/refresh blocked for `SUSPENDED`/`CANCELLED` | `rejectIfBlocked` |
| Product categoryId not tenant-checked | Validated on create/update | `inventory-service/src/routes/products.ts` |

## Correctness — fixed

| Gap | Fix |
|---|---|
| Any DB error in an async handler crashed the service (Express 4) | Async-safe Layer patch + shared `errorHandler` in every service |
| GST charged before the discount; held bills rounded tax to whole rupees | One calculator (`computeInvoiceTotals`) for checkout, held bills, quotations, credit notes and the POS cart: discount first, GST on the discounted value, paise rounding |
| Refunds: any status, double refunds, bundles restocked wrongly, no reversals | PAID-only, conditional status flip in the transaction, bundle-aware restock net of credit notes, loyalty points reversed, gateway refund, `billing:refund` permission |
| Credit notes: ignored discount, could exceed sold quantity, wrong for bundles | Priced like the sale, cumulative quantity check, bundle-aware restock/unstock |
| Paid held bills failed for non-demo tenants; no amount check; no retry | Tenant-bound internal token, amount verification, idempotent completion, BullMQ retry + sweeper, auto-refund if the bill was cancelled |
| Split/merge of held bills miscomputed totals; merge could orphan payments | Totals recomputed from items; merge blocked when a payment is attached |
| GST summary ignored discounts and credit notes | Post-discount taxable value, net of credit notes |
| Plan limits not enforced | Branch creation enforces `storesLimit` (402) |
| `database/package.json` deleted in `9ee0cc0` (broke `prisma:generate` and CI) | Restored |

## Features & stack — now implemented

| Item | Implementation |
|---|---|
| Password reset, email verification, staff invites | 6-digit OTPs (hashed, attempt-limited) via `/password/*`, `/verify-email*`; wired admin pages |
| Reports & Analytics page (was mock data) | `reporting-service` `/reports/analytics`, PDF/XLSX export (pdfkit/exceljs), scheduled email reports (node-cron) |
| Terminal fleet page (was mock data) | Real devices + heartbeat telemetry; remote "force sync" over Socket.IO |
| Redis + BullMQ | Notification queue and payment-completion retries (fail-fast fallback to HTTP) |
| Multer + object storage | Product image upload to S3/R2/MinIO (local disk fallback for dev) |
| Sentry | `initObservability` in every service (enabled by `SENTRY_DSN`) |
| Payment gateways | Razorpay, Cashfree, PhonePe adapters (orders, webhooks, refunds) |
| SMS / WhatsApp / payment alerts | Twilio channels; payment captured/refunded alerts |
| ESC/POS printing & cash drawer | Shared encoder; Web Serial (web POS), TCP 9100 + silent OS print (desktop POS) |
| Cashier leaderboard | `Invoice.createdById` recorded at checkout |
| Tests | Unit tests (pricing, errors, tokens/RBAC, gateway signatures, ESC/POS) + `scripts/smoke-test.mjs` |
| Infra | Compose: env-driven credentials, ES security on, MinIO, Redis AOF. K8s: pinned images (kustomize), HPAs, 2 replicas, cert-manager TLS, `/socket.io` ingress route |

---

## Remaining gaps

| # | Gap | Notes |
|---|---|---|
| 1 | **Mobile apps (owner/manager/cashier)** | Out of scope by decision; still Expo placeholders. The backend APIs they need exist. |
| 2 | Push notifications | Depends on the mobile apps (needs device push tokens). |
| 3 | Operating expenses in P&L | No expense ledger yet; the P&L shows profit before overheads and says so. |
| 4 | Horizontal scaling of sync/reporting | `synchronization-service` needs the Socket.IO Redis adapter + sticky sessions; `reporting-service` cron needs leader election before >1 replica. |
| 5 | PhonePe API version | Implemented against the v1 salt-key API; merchants onboarded on PhonePe's newer OAuth (v2) API need an adapter update. Sandbox-verify all gateways with real credentials. |
| 6 | Integration tests in CI | Unit tests run in CI; the smoke test needs a running stack (DB, Redis, ES) and is run manually. |
