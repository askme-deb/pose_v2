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
npm install          # install all workspaces
cp .env.example .env  # fill in secrets
docker compose -f docker/docker-compose.yml up -d   # postgres, redis, elasticsearch, nginx
npm run prisma:migrate
npm run dev           # runs every app/service dev script via Turborepo
```

Run a single workspace:

```bash
npm run dev --workspace=apps/web-admin
npm run dev --workspace=services/api-gateway
```

## Status

This is a scaffold: folder structure, package.json/tsconfig per workspace,
a health-check endpoint per service, and placeholder screens per app.
Business logic for each of the 18 modules in the SOW still needs to be built
out service by service.
