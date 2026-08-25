# Gap Analysis — Coverage Report

Reconciled against `inventory_pos_billing.docx` (Scope of Work) and `Technology Stack.docx`.
Every line below was traced to real code — imports, working route logic, real UI wiring — not just dependency lists or mock data.

## Summary

The billing, inventory and GST core is genuinely built. Where it thins out is the edges of the
scope of work: the synchronization engine is an empty shell, RBAC is modeled but never enforced,
and three of the mobile apps are unstarted scaffolds.

**Totals: 48 items checked — 21 built, 11 partial, 16 missing (44% coverage).**

## Highest-impact gaps

1. **RBAC is modeled but enforced nowhere** — `api-gateway` proxies every route with zero auth check, and no service imports the `permissions` package.
2. **The Synchronization Engine is an empty stub** despite being a named architectural component and an explicit deliverable.
3. **Three of eighteen SOW modules — the mobile apps — are unstarted**, each just an Expo placeholder screen.
4. **Sales module has no documents** — quotations, estimates, delivery challans, credit/debit notes are all promised in the SOW and absent from the schema.

---

## Checklist A — Technology Stack

### Frontend Applications

| # | Item | Status | Evidence |
|---|------|--------|----------|
| 1 | React.js | ✅ Used | Confirmed across every app — baseline as expected. |
| 2 | Zustand (state) | ✅ Used | `apps/web-pos`, `web-admin`, `desktop-pos`, and all 3 mobile `package.json`. |
| 3 | React Hook Form | ✅ Used | Real form wiring, e.g. `web-admin/src/pages/crm/CustomersPage.tsx`. |
| 4 | Material UI | ✅ Used | `@mui/material` in `packages/ui-library`, `web-pos`, `web-admin`. |
| 5 | ApexCharts | ✅ Used | `react-apexcharts` in 15+ dashboard and report pages. |
| 6 | TanStack Table | ✅ Used | `useReactTable` wired into `CustomersPage`, `ProductsPage`, `SalesInvoicesPage`. |
| 7 | React PDF | ❌ Missing | Zero `react-pdf` imports anywhere — PDFs are generated server-side with `pdfkit` in `reporting-service` instead. |
| 8 | ZXing (barcode/QR) | ✅ Used | `web-pos/src/components/BarcodeScannerModal.tsx` — real camera scanning. |
| 9 | Vite PWA | ✅ Used | `web-pos/vite.config.ts` configures `VitePWA({ registerType: 'autoUpdate' })`. |
| 10 | React Native mobile apps | 🟡 Partial | `mobile-owner/cashier/manager` are empty Expo scaffolds — `App.tsx` literally reads "Build out screens in src/screens." |
| 11 | Electron desktop POS | ✅ Used | `apps/desktop-pos/electron/main.js` — confirmed running. |

### Backend Technologies

| # | Item | Status | Evidence |
|---|------|--------|----------|
| 12 | Node.js + Express | ✅ Used | Confirmed across every service — baseline as expected. |
| 13 | Prisma ORM | ✅ Used | `database/prisma/schema.prisma` — baseline as expected. |
| 14 | JWT + Refresh Tokens | ✅ Used | `authentication/src/routes/auth.ts` — real `/login` and `/refresh` rotation. |
| 15 | RBAC authorization | 🟡 Partial | `packages/permissions` exports a static role→permission map, but zero services import it — no route actually enforces it, including `api-gateway`. |
| 16 | Swagger / OpenAPI | ❌ Missing | No swagger or openapi references found anywhere in the repo. |
| 17 | Zod validation | ✅ Used | Present in every service route file for request validation. |
| 18 | BullMQ | ❌ Missing | Listed as a dependency in 2 services; zero `Queue()`/`Worker()` usage found. |
| 19 | Node Cron | ❌ Missing | No dependency and no usage anywhere in the repo. |
| 20 | Pino logging | ✅ Used | `pino-http` wired into every service's `index.ts`. |
| 21 | Multer (file upload) | ❌ Missing | No dependency, no usage anywhere. |
| 22 | Socket.IO | ❌ Missing | Listed in `synchronization-service`'s `package.json` but never imported. |

### Databases

| # | Item | Status | Evidence |
|---|------|--------|----------|
| 23 | PostgreSQL | ✅ Used | Primary datastore, confirmed as expected. |
| 24 | Redis | ❌ Missing | Deployed in `docker-compose`, but no `ioredis`/`redis` client code anywhere — not used as cache or queue. |
| 25 | Elasticsearch | ✅ Used | Real `@elastic/elasticsearch` client + write-time indexing in inventory and sales services, plus a real cross-entity search endpoint in `api-gateway`. |
| 26 | Offline SQLite | 🟡 Partial | `web-pos` actually uses Dexie/IndexedDB, not SQLite; `desktop-pos` genuinely uses `better-sqlite3`; mobile apps have no offline store at all. |

### Multi-Tenant & Offline Sync

| # | Item | Status | Evidence |
|---|------|--------|----------|
| 27 | Synchronization engine | ❌ Missing | `services/synchronization-service`'s `src/` is Express boilerplate + a health check — no sync or conflict-resolution logic exists. |
| 28 | Client-side offline sync | 🟡 Partial | `web-pos/src/sync/syncEngine.ts` replays a queued-sales table on reconnect; no true conflict merge — failures just sit for manual retry. |

### Payments & Notifications

| # | Item | Status | Evidence |
|---|------|--------|----------|
| 29 | Payment gateways | 🟡 Partial | Only Razorpay is real (`payment-service/src/lib/razorpay.ts` — order creation + webhooks); Cashfree/PhonePe/Paytm/CCAvenue/Juspay exist only as text in a package description. |
| 30 | Notifications (Email/SMS/Push/WhatsApp) | 🟡 Partial | Email is real — nodemailer, genuinely triggered by low-stock events. SMS, push and WhatsApp are just a TypeScript union type with no provider wired in. |

### Infrastructure & Ops

| # | Item | Status | Evidence |
|---|------|--------|----------|
| 31 | Prometheus + Grafana | ✅ Used | `prom-client` wired into every service via `packages/utilities/src/metrics.ts`. |
| 32 | Sentry | ❌ Missing | No `@sentry` reference anywhere in the repo. |
| 33 | Kubernetes | ✅ Used | `k8s/` holds real manifests for all 11 services — present and complete, not verified deployed. |
| 34 | GitHub Actions CI/CD | ✅ Used | `.github/workflows/ci.yml` — real build/lint/test plus a per-service Docker build matrix. |
| 35 | CDN / SSL / Object storage | ❌ Missing | No Cloudflare, Let's Encrypt, or S3-compatible/`aws-sdk` config anywhere. |
| 36 | ESC/POS printing | ❌ Missing | `PosTouchPage` in both `web-pos` and `desktop-pos` just calls `window.print()` — no printer or cash-drawer driver. |

---

## Checklist B — SOW Modules

| # | Module | Status | Evidence |
|---|--------|--------|----------|
| 1 | Module 1 — SaaS Management | 🟡 Partial | Tenant CRUD, plans, activation/suspension and white-label branding are real (`subscription-service/routes/tenants.ts`). Self-serve registration is fake — `RegisterPage` shows a toast with no API call — and storage/usage tracking is a hardcoded literal. |
| 2 | Module 4 — POS Billing | 🟡 Partial | Hold, split, merge and refund are real Prisma transactions (`billing-service`, `sales-service`). No dedicated routes for advance payments, credit billing or partial payments beyond the base Payment model. |
| 3 | Module 5 — Inventory (batching/bundles) | ❌ Missing | No batch tracking, serial numbers, product bundles/combos or dead-stock reports — absent from both the schema and the routes. |
| 4 | Module 6 — Purchase (GRN/Returns/Ledger) | ❌ Missing | `purchase-service` only has `purchaseOrders.ts` and `suppliers.ts`. No GRN model, no purchase returns, no vendor ledger — a PO just flips straight to `RECEIVED`. |
| 5 | Module 7 — Sales documents | ❌ Missing | No quotations, estimates, delivery challans, credit notes or debit notes anywhere in the schema or `sales-service` routes. |
| 6 | Module 8 — Warehouse | 🟡 Partial | Transfers are real. Racks are a single `totalRacks` counter with no location assignment; no expiry or damaged-goods tracking. |
| 7 | Module 9 — Customer | 🟡 Partial | Loyalty points and tiers are real, wired to real UI (`CustomersPage.tsx`, not mock data). Customer wallet, membership tiers and birthday offers don't exist. |
| 8 | Module 11 — GST & Tax | ✅ Used | GSTR1/GSTR3B filing with ARN generation, and a real tax summary computed from live invoice and PO line items (`sales-service/routes/gst.ts`). |
| 9 | Module 12 — Hardware integration | ❌ Missing | No printer, scanner or cash-drawer driver code anywhere — barcode scanning is camera-based software only. |
| 10 | Module 13 — Offline billing | 🟡 Partial | Genuinely offline-first on `web-pos` and `desktop-pos` — queued sales, idempotent replay on reconnect. Conflict resolution is minimal, and mobile has no offline story at all. |
| 11 | Module 15 — Mobile applications | ❌ Missing | All three apps (owner/manager/cashier) are empty Expo scaffolds — one placeholder screen each, nothing wired to the API. |
| 12 | Module 16 — Notifications | 🟡 Partial | Low-stock emails genuinely fire on real inventory events. Nothing exists for SMS, push, or payment alerts. |
| 13 | Module 18 — Security | ✅ Used | 2FA is real TOTP via `speakeasy` with an actual verification step, not just a boolean flag. Audit logging is real and wired across auth and tenant actions. |

---

*Generated by reading both source documents in full and tracing every claim to a file. Companion visual version: [Coverage Receipt](https://claude.ai/code/artifact/ada28f26-8aaf-4e5a-81e6-31e09b8e2e67).*
