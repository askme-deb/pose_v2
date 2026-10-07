# PosPe — Multi-Tenant POS Billing & Inventory Management SaaS

Monorepo for a cloud-based, multi-tenant POS billing and inventory platform
(retail, supermarket, restaurant, pharmacy, electronics, fashion, wholesale,
multi-branch). Built as a scaffold from the project's Scope of Work and
Technology Stack documents.

## Tech stack

- **Frontend:** React.js (Vite), Zustand, React Hook Form, MUI, TanStack Table, ApexCharts, React Router
- **Mobile:** React Native (Expo)
- **Desktop POS:** React.js + Electron
- **Backend:** Node.js + Express.js, Prisma ORM, JWT + RBAC, Zod, BullMQ, Socket.IO
- **Databases:** PostgreSQL (primary), Redis (cache/queue), Elasticsearch (search), SQLite (offline-first local storage)
- **Infra:** Docker, Kubernetes, Nginx, GitHub Actions, Prometheus + Grafana, Sentry

## Monorepo layout

```
apps/            React / React Native / Electron frontends
  web-admin/        Web admin panel
  web-pos/          POS web application (PWA)
  desktop-pos/      Desktop POS (React + Electron)
  mobile-owner/     Business owner app (Expo)
  mobile-cashier/   Cashier app (Expo)
  mobile-manager/   Store manager app (Expo)

services/         Node.js/Express microservices (one process each)
  api-gateway/
  authentication/
  billing-service/
  inventory-service/
  purchase-service/
  sales-service/
  payment-service/
  notification-service/
  subscription-service/
  reporting-service/
  synchronization-service/

packages/         Shared libraries consumed across apps/services
  ui-library/
  authentication/
  utilities/
  api-client/
  permissions/
  notifications/

database/         Prisma schema + migrations (shared by all services)
docker/           docker-compose.yml + per-service infra config
```

## Getting started

```bash
npm install                                   # install all workspaces
cp .env.example .env                          # fill in secrets (each service also reads its own .env)
docker compose -f docker/docker-compose.yml up -d   # postgres, redis, elasticsearch, minio, mailhog, nginx, prometheus, grafana
npm run prisma:migrate
npm run seed --workspace=database             # demo tenant + platform super admin
npm run reindex --workspace=database          # (re)build the search indices
npm run dev                                   # runs every app/service dev script via Turborepo
```

Run a single workspace:

```bash
npm run dev --workspace=apps/web-admin
npm run dev --workspace=services/api-gateway
```

Tests:

```bash
npm test                         # unit tests (node:test via tsx)
node scripts/smoke-test.mjs      # end-to-end checks against a running stack
```

## How it fits together

- **Tenancy.** Every service takes the tenant from the signed access token
  (`tenantIdOf` in `packages/permissions`), never from a request header.
  `x-store-id` is only honoured after checking the store belongs to that tenant.
- **Auth.** 15-minute access tokens carry tenant, role, assigned store and the
  effective permissions from the tenant's RBAC matrix. Refresh tokens rotate and
  are revoked by logout, password change/reset and deactivation. Self-serve
  signups verify their email with a 6-digit code; password reset and staff
  invites use the same codes. Suspended/cancelled tenants can't sign in.
- **Platform admin.** `subscription-service` requires `platform:manage`, held
  only by `SUPER_ADMIN` users (seeded from `SUPER_ADMIN_EMAIL`/`_PASSWORD`).
- **POS terminals.** A manager pairs each terminal with a store once; cashier PIN
  logins are then matched only against that store's staff, with per-store and
  per-IP throttling. Receipts print over ESC/POS (USB via Web Serial on the web
  POS; network printers on TCP 9100 or installed OS printers on the desktop POS).
- **Background work.** Notifications (email, SMS/WhatsApp via Twilio) and
  payment-completion retries run on BullMQ when `REDIS_URL` is set, falling back
  to direct calls otherwise. Scheduled analytics reports are emailed by
  `reporting-service`.
- **Payments.** Razorpay, Cashfree and PhonePe (whichever are configured), with
  signature-verified webhooks, amount checks, idempotent held-bill completion and
  gateway refunds.
- **Errors.** Every service installs async-safe error handling and a shared error
  middleware; set `SENTRY_DSN` to report failures to Sentry.
