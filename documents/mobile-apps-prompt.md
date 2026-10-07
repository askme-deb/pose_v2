# Build prompt: PosPe mobile apps (Owner, Manager, Cashier)

> Paste everything below this line into your AI coding agent (or hand it to the developer).

---

You are building the three mobile apps for **PosPe**, a multi-tenant POS billing and inventory SaaS for Indian retail (GST, INR, UPI). The backend, web admin, web POS and desktop POS already exist and are in production shape. Your job is the mobile clients only. **Do not change backend behaviour.** If a screen needs something the API doesn't provide, list it under "Backend requests" in your final report instead of faking it or inventing endpoints.

## 1. Where the code lives

- Monorepo (npm workspaces + Turborepo). The apps already exist as Expo scaffolds with one placeholder screen each:
  - `apps/mobile-owner` (slug `pospe-owner`)
  - `apps/mobile-manager`
  - `apps/mobile-cashier`
- Stack already declared: **Expo SDK 52, React Native 0.76, TypeScript, React Navigation 6 (native-stack), Zustand 5**. Keep these versions unless an upgrade is required, and say why if you do.
- CI deliberately excludes `apps/mobile-*`; they are built and shipped from their own pipeline (EAS). Set up `eas.json` with `development`, `preview` and `production` profiles.
- Workspace packages you may reuse:
  - `@pospe/api-client`: a typed `fetch` wrapper with transparent token refresh, `ApiError` (`.status`, `.body`, `.serverMessage`), `upload()` for multipart and `download()` for files. Use it instead of writing your own client.
  - `@pospe/permissions/src/roles`: deep-import **only this file** (the package root pulls in Express/JWT code that must not be bundled). It gives you `Role`, `hasPermission`, `listHasPermission`.
  - `@pospe/utilities/src/pricing`: deep-import **only this file**. `computeInvoiceTotals(items, discountPercent)` is the exact pricing the server uses. Use it for every on-screen cart total.
  - For receipt printing in the cashier app, port `apps/web-pos/src/printing/escpos.ts`, a dependency-free ESC/POS encoder.
- Metro must resolve workspace packages and their TypeScript sources: configure `watchFolders` and `nodeModulesPaths` for the monorepo root.

## 2. Backend contract

All requests go through the API gateway: `EXPO_PUBLIC_API_BASE_URL` (dev `http://<LAN-IP>:4000`, prod `https://api.pospe.example.com`). Every path below is relative to it.

### Auth and sessions
- `POST /api/auth/login` `{ email, password }` returns one of:
  - `{ token, refreshToken, user }`, where `user = { id, name, email, role, tenantId, tenantName, tenantStatus, storeId, rbacRole }`.
  - `{ requiresTwoFactor: true, pendingToken }`. Then call `POST /api/auth/login/2fa-verify` `{ pendingToken, token: "123456" }`, which returns the same session shape.
- Error cases to handle explicitly:
  - **401:** wrong credentials.
  - **423:** account temporarily locked after 5 failures (show the server message).
  - **403 with `requiresEmailVerification: true`:** route to an email-code screen that calls `POST /api/auth/verify-email` `{ email, code }`, with resend at `POST /api/auth/verify-email/resend`.
  - **403 with `tenantStatus`:** business suspended or cancelled.
- `POST /api/auth/refresh` `{ refreshToken }` returns a new `{ token, refreshToken, user }`. Refresh tokens **rotate**: always store the new one. A 401 here means the session is over.
- `POST /api/auth/logout` (bearer) revokes every refresh token for the user. Call it on sign-out.
- `GET /api/auth/me` validates a stored session at app launch.
- Password reset: `POST /api/auth/password/forgot` `{ email }`, then `POST /api/auth/password/reset` `{ email, code, newPassword }`. Staff invites arrive as the same 6-digit code, so "Set password from invite" uses the reset screen.
- Access tokens last about 15 minutes. Configure `ApiClient` with `getToken`, `getRefreshToken`, `onTokens` and `onUnauthorized`, and it refreshes for you (single-flight).
- **Token storage:** `expo-secure-store` only. Never AsyncStorage, never logs.

### Tenancy and permissions
- The tenant always comes from the token. **Never send `x-tenant-id`**; the server ignores it.
- `x-store-id` selects a store. It is accepted only for stores in the caller's tenant (403 otherwise). Omit it to use the user's assigned or primary store.
- The access token's payload contains `role` and `perms` (the effective permissions from the tenant's RBAC matrix). Decode it with `atob` to decide what UI to show; the server enforces everything again. Use `listHasPermission(perms, 'billing:create')`, falling back to `hasPermission(role, …)` when `perms` is absent.
- Permission strings: `billing:view`, `billing:create`, `billing:price_override`, `billing:refund`, `inventory:manage`, `purchase:manage`, `report:view`, `payment:manage`, `sales:manage`, `customer:manage`, `user:manage`, `store:manage`.

### Errors
JSON `{ error: string | zodFlattened }`. Statuses: 400 validation, 401 auth, 402 plan limit, 403 permission or tenant, 404, 409 conflict/duplicate, 423 locked, 429 rate limited, 5xx server. Show `ApiError.serverMessage` to the user.

### Money and GST
- Amounts are rupees with 2-decimal precision (Prisma `Decimal` serialises as **strings**; parse with `Number()`).
- The discount is applied per line **before** GST; GST is on the discounted value. Never compute totals yourself: use `computeInvoiceTotals`.

### Endpoints by domain (`[perm]` = required permission)

| Domain | Endpoints |
|---|---|
| Dashboard | `GET /api/reporting/dashboard?timeframe=today\|7d\|30d\|90d` returns `{ kpis: { revenue, revenueDeltaPct, orders, ordersDeltaPct, profit, marginPct, avgTicket, avgTicketDeltaPct, lowStockSkus, criticalReorders }, trend, paymentSplit, … }` |
| Analytics | `GET /api/reporting/reports/analytics?from&to&storeId&categoryId&paymentMethod` `[report:view]` returns kpi, revenueSeries, paymentMethodSplit, hourlyFootfall, categoryMargin, topProducts, reorderAlerts, crmStats, vipCustomers, cashierLeaderboard, pnlStatement, gstTaxSlabSummary, options.branches/categories. `GET …/analytics/export?format=pdf\|xlsx&modules=kpi,topSku,gst` returns a file (use `ApiClient.download` + `expo-sharing`). Schedules: `GET/POST/DELETE /api/reporting/reports/schedules` |
| Catalog | `GET /api/inventory/products`, `GET /api/inventory/categories`, `GET /api/inventory/brands`, `POST/PUT /api/inventory/products` `[inventory:manage]`, `POST /api/inventory/products/:id/image` (multipart field `image`, JPEG/PNG/WebP ≤ 5 MB), batches (`/products/:id/batches`, `/batches/expiring`), serials (`/serials/search`), dead stock `GET /api/inventory/reports/dead-stock` |
| Stock | `GET/POST /api/inventory/stock-adjustments` `{ productId, action: 'ADD'\|'SUBTRACT', qty, reasonCode, auditor }`, `POST …/:id/approve`; warehouses, transfers (`/warehouse-transfers`, `…/:id/complete`), damage reports, racks |
| Purchasing | `GET/POST /api/purchase/purchase-orders`, `POST …/:id/receive`, `GET/POST /api/purchase/grns`, suppliers, `GET /api/purchase/suppliers/:id/ledger`, purchase returns |
| Sales | `GET /api/sales/invoices`; `POST /api/sales/invoices` `[billing:create]` with body `{ customerId?, paymentMethod: 'CASH'\|'UPI'\|'CARD'\|'SPLIT', items: [{ productId, quantity, unitPrice? }], discountPercent }` and header **`idempotency-key: <uuid>`** (`unitPrice` only with `billing:price_override`); `POST /api/sales/invoices/:id/refund` `[billing:refund]` (PAID only; returns `refundAmount`, `gatewayRefunds`); credit/debit notes, quotations, delivery challans |
| Held bills | `POST /api/billing/invoices/hold` `{ customerId?, items, discountPercent, label }`, `GET /api/billing/invoices/held`, `POST …/:id/recall`, `DELETE …/:id`, split and merge |
| Customers | `GET/POST/PUT /api/sales/customers` `{ name, phone?, email?, tier?, dateOfBirth?, membershipPlanId? }`, wallet top-up/redeem/transactions, bonus points, membership plans |
| Payments | `GET /api/payment/payments/gateways` returns `[{ id, configured }]`; `POST /api/payment/payments/orders` `{ invoiceId (a HELD bill), gateway: 'RAZORPAY'\|'CASHFREE'\|'PHONEPE', customerPhone?, returnUrl? }` returns the gateway's client payload (Razorpay order id + key, Cashfree `paymentSessionId`, or PhonePe `redirectUrl`). Completion is confirmed **server-side by webhook**. Poll `GET /api/payment/payments/:invoiceId` or the held-bills list; never mark a bill paid on the client. |
| Team | `GET /api/auth/users`, `POST/PUT /api/auth/users` `[user:manage]` (`pin` sets a 4-digit POS PIN; creating a user emails an invite code), `GET /api/auth/roles`, `GET /api/auth/audit-logs` |
| Business | `GET /api/sales/branches`, `POST/PUT /api/sales/branches` `[store:manage]` (402 when the plan's store limit is reached), `GET/PUT /api/sales/business-profile`, `GET /api/sales/gst-summary`, GST returns |
| Search | `GET /api/search?q=` returns `{ products, customers, invoices }` (tenant-scoped) |
| Devices and offline | `POST /api/sync/heartbeat` `{ deviceId, storeId, label, pendingCount, platform?, osVersion?, appVersion?, batteryPercent?, peripherals?: string[] }` every 30 s; `POST /api/sync/push` `{ deviceId, storeId, label, items: [{ idempotencyKey, queuedAt, payload: <invoice body> }] }` returns `results[]` with `status: 'synced'\|'conflict'\|'error'`; `GET /api/sync/devices`, `GET /api/sync/conflicts`, `POST /api/sync/conflicts/:id/resolve` `{ note, resolvedBy }`, `POST /api/sync/devices/:deviceId/sync-request` |
| Realtime | Socket.IO at the API host, path `/socket.io` (dev: `http://<LAN-IP>:4010` directly). `auth` must be a **function** returning `{ token: <current access token>, deviceId }`. Events: `inventory:changed` `{ storeId, products[] }` (patch the local cache) and `sync:requested` (flush the offline queue now) |

## 3. The three apps

Build a small shared module first (inside the monorepo, e.g. `packages/mobile-core`, or duplicated per app if Metro config fights you). It covers the auth store, `ApiClient` setup, secure storage, the session bootstrap (`/me`, then refresh, then login), the permission hook, formatting (`en-IN`, ₹), theming (light/dark), error toasts, pull-to-refresh lists and empty/loading/error states.

### A. Owner app (`mobile-owner`): roles `tenant_owner`, `branch_admin`
For owners away from the store. Mostly read-only and analytical.
- Sign in with email/password, 2FA, email verification and forgot password. Biometric unlock (`expo-local-authentication`) gates re-opening the app; it unlocks the SecureStore session, it does not replace the server login.
- **Home:** KPI cards from `/reporting/dashboard`, a timeframe switcher, a branch selector (`x-store-id`), a revenue trend chart, and the low-stock count.
- **Reports:** analytics by date range and branch (top products, category margin, payment split, cashier leaderboard, P&L, GST slabs). Export PDF/XLSX and share. Create, list and delete scheduled report emails.
- **Branches:** list stores with today's sales, and create a branch (handle the 402 plan limit).
- **Team:** list staff, invite a user (role, store, optional PIN), deactivate, view audit logs.
- **Approvals:** pending stock adjustments to approve, and open sync conflicts to resolve.
- **Settings:** business profile (view/edit), security (2FA status, change password), sign out.

### B. Manager app (`mobile-manager`): roles `store_manager`, `inventory_manager`
For running a store from the floor.
- Same sign-in flows.
- **Store dashboard** for the manager's store.
- **Inventory:** product list and search, a barcode scanner (`expo-camera`) that looks up by barcode/SKU, product detail (stock, batches with expiry, serials, rack locations), create and edit products, and take a product photo with upload.
- **Stock:** create ADD/SUBTRACT adjustments with a reason, approve adjustments, record damage reports, create and complete warehouse transfers.
- **Purchasing:** create a purchase order, receive goods (GRN) by scanning, supplier list and ledger.
- **Low stock and expiry:** reorder alerts and expiring batches, with "create PO" from an alert.
- **Devices:** the store's POS terminals (online/offline, pending queue, battery), "force sync" (`sync-request`), and resolve conflicts.
- Gate every action with `listHasPermission` and hide what the user can't do.

### C. Cashier app (`mobile-cashier`): role `cashier`
A handheld POS. It must work **offline**.
- **Terminal pairing (required):** on first launch, a manager signs in with email/password (+2FA). Store `user.storeId` and the tenant/store name in persistent storage, then immediately call `/api/auth/logout` with that manager token. Show "Unpair terminal". After pairing, cashiers log in with a 4-digit PIN: `POST /api/auth/login/pin` `{ pin, storeId }`, which returns `{ token, refreshToken, user, store }`. Handle 429 (too many wrong PINs on this terminal) and 404 (store gone: unpair).
- **Selling:** a product grid with categories, search and a barcode scanner. The cart shows quantities, an optional customer (search or create), a discount %, and totals from `computeInvoiceTotals`. Price override only with `billing:price_override`.
- **Payment:** cash with tendered amount and change, card, split, and UPI. For online UPI, hold the bill, then `POST /payments/orders`, open the gateway's checkout (Razorpay RN SDK, Cashfree RN SDK or the PhonePe redirect), then wait for server confirmation.
- **Checkout:** `POST /api/sales/invoices` with a client-generated UUID `idempotency-key`, generated **before** the request and reused on retry.
- **Offline-first:**
  - Cache the catalog, categories and customers locally with `expo-sqlite`.
  - If checkout fails with a network error, queue the sale with the same idempotency key, decrement cached stock and print an "OFFLINE — pending sync" receipt.
  - Replay the queue with `POST /api/sync/push` on reconnect (`@react-native-community/netinfo`), on `sync:requested`, and on a manual "Sync now".
  - Mark `conflict` results as needing attention and keep `error` results for retry.
- **Held bills:** hold, list, recall, void.
- **Refunds:** only show them if the token has `billing:refund` (cashiers usually don't).
- **Receipts:** a Bluetooth ESC/POS thermal printer (58/80 mm) using the ported `escpos.ts` encoder and a BLE/serial library compatible with Expo dev builds. Also share a PDF receipt (`expo-print`). Kick the cash drawer on cash sales if configured. Printer settings live on the device.
- **Device telemetry:** a heartbeat every 30 s while signed in, with `platform` (`android`/`ios`), `osVersion`, `appVersion`, `batteryPercent` (`expo-battery`), `peripherals` (the paired printer name) and a stable `deviceId` (generated once and kept in SecureStore).
- **Shift:** show the cashier name, store and a sign-out that calls `/api/auth/logout`.

## 4. Non-functional requirements
- TypeScript strict; no `any` in app code. ESLint passes using the repo config.
- Every list handles loading, empty, error and pull-to-refresh states. Every mutation shows progress and the server's error message.
- Accessibility: labels on icon buttons, minimum 44 pt touch targets, dynamic type.
- Light and dark themes; phone-first layouts (tablet acceptable for cashier).
- Never log tokens, PINs, OTPs or payment payloads.
- Indian formatting: `en-IN` numbers, ₹, dates in IST.
- Tests: unit tests for the offline queue, session/refresh handling, permission gating and cart totals (Jest + `@testing-library/react-native`), plus a Maestro or Detox smoke flow per app (login → main screen → one core action).

## 5. Running against the backend locally
- From the repo root: `docker compose -p pospe -f docker/docker-compose.yml up -d`, `npm run prisma:migrate`, `npm run seed --workspace=database`, `npm run dev`.
- Seeded logins (password `Demo@12345`):
  - Owner: `aarav.sharma@apexsupermarket.com`
  - Cashier PIN `5678` (Ananya Reddy, Downtown Flagship), after pairing with the owner account.
- OTP and invite emails arrive in MailHog at `http://localhost:8025`.
- Phones need the computer's LAN IP, not `localhost`.

## 6. Known backend gaps (report, don't fake)
- **Push notifications:** there is no endpoint to register device push tokens and no push sender. Propose `POST /api/notification/push-tokens` and the events you need (low stock, payment received, sync conflict). Use local notifications only for on-device events until then.
- There is no expense ledger, so the P&L is before overheads; show it that way.
- `GET /api/reporting/dashboard` has no per-store filter beyond `x-store-id` behaviour; confirm it meets the owner app's branch switcher, or list what's missing.

## 7. Deliverables
1. Three working apps in `apps/mobile-owner`, `apps/mobile-manager` and `apps/mobile-cashier`, plus any shared mobile package.
2. `eas.json` and a README per app: env vars (`EXPO_PUBLIC_API_BASE_URL`, `EXPO_PUBLIC_SYNC_WS_URL`), running on a device, building with EAS.
3. Tests as described above, all passing.
4. A final report: what was built per app, screenshots or screen list, any deviations, and **Backend requests** (endpoints or fields you needed but didn't have).

## 8. Acceptance criteria
- Each app signs in with real credentials, survives an app restart without re-login (refresh works), and signs out with server revocation.
- Owner: dashboard and analytics match the web admin for the same date range and branch.
- Manager: scanning a barcode finds the product; a stock adjustment, a PO receive and a product photo upload succeed.
- Cashier:
  - Pairing plus PIN login works.
  - An online sale's total matches the server invoice exactly.
  - In airplane mode a sale is queued and printed as offline, then syncs exactly once on reconnect (same idempotency key).
  - A heartbeat makes the device appear in the web admin's device list.
- No screen shows actions the user's permissions don't allow, and the server's 403s are handled gracefully anyway.
