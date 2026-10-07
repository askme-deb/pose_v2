#!/usr/bin/env node
// End-to-end smoke test against a running stack (npm run dev + docker compose
// + seeded database). Exercises the security and correctness guarantees that
// unit tests can't: tenant isolation through the real gateway, token types,
// RBAC, refund guards, refresh/logout revocation.
//
//   node scripts/smoke-test.mjs
//   API=http://localhost:4000 OWNER_EMAIL=... OWNER_PASSWORD=... node scripts/smoke-test.mjs
//
// Optional: JWT_SECRET (same as the services') enables the forged-2FA-token check.

import crypto from 'node:crypto';

const API = process.env.API ?? 'http://localhost:4000';
const OWNER_EMAIL = process.env.OWNER_EMAIL ?? 'aarav.sharma@apexsupermarket.com';
const OWNER_PASSWORD = process.env.OWNER_PASSWORD ?? 'Demo@12345';

let failures = 0;
const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok });
  if (!ok) failures += 1;
  console.log(`${ok ? '✔' : '✖'} ${name}${detail ? ` — ${detail}` : ''}`);
}

async function call(path, { method = 'GET', token, body, headers = {} } = {}) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try {
    json = await res.json();
  } catch {
    // non-JSON
  }
  return { status: res.status, json };
}

function signHs256(payload, secret) {
  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
  const data = `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ iat: Math.floor(Date.now() / 1000), ...payload })}`;
  return `${data}.${crypto.createHmac('sha256', secret).update(data).digest('base64url')}`;
}

async function main() {
  const login = await call('/api/auth/login', { method: 'POST', body: { email: OWNER_EMAIL, password: OWNER_PASSWORD } });
  check('owner can sign in', login.status === 200 && login.json?.token, `status ${login.status}`);
  if (login.status !== 200) return;
  const { token, refreshToken, user } = login.json;

  // --- Tenant isolation ---
  const own = await call('/api/inventory/products', { token });
  const forged = await call('/api/inventory/products', { token, headers: { 'x-tenant-id': 'some-other-tenant-id' } });
  check('products list works', own.status === 200, `${own.json?.length ?? 0} products`);
  check(
    'forged x-tenant-id header is ignored (same tenant data)',
    forged.status === 200 && JSON.stringify(forged.json?.map((p) => p.id)) === JSON.stringify(own.json?.map((p) => p.id)),
  );
  const foreignStore = await call('/api/sales/invoices', { token, headers: { 'x-store-id': 'not-my-store' } });
  check('foreign x-store-id is rejected', foreignStore.status === 403, `status ${foreignStore.status}`);
  const noToken = await call('/api/inventory/products');
  check('requests without a token are rejected', noToken.status === 401);

  // --- RBAC / platform separation ---
  const platform = await call('/api/subscription/tenants', { token });
  check('tenant owner cannot reach the platform super-admin API', platform.status === 403, `status ${platform.status}`);

  // --- Credential exposure ---
  const users = await call('/api/auth/users', { token });
  const leaked = (users.json ?? []).some((u) => 'passwordHash' in u || 'pinHash' in u || 'twoFaSecret' in u);
  check('user list never returns credential columns', users.status === 200 && !leaked);

  // --- 2FA-pending tokens must not authenticate ---
  if (process.env.JWT_SECRET) {
    const pending = signHs256({ sub: user.id, typ: '2fa', purpose: '2fa-pending', exp: Math.floor(Date.now() / 1000) + 300 }, process.env.JWT_SECRET);
    const r = await call('/api/inventory/products', { token: pending });
    check('a 2FA-pending token is rejected as an access token', r.status === 401, `status ${r.status}`);
  } else {
    console.log('… skipped 2FA-pending token check (set JWT_SECRET to enable)');
  }

  // --- PIN login must be store-scoped ---
  const pinNoStore = await call('/api/auth/login/pin', { method: 'POST', body: { pin: '1234' } });
  check('PIN login without a paired store is refused', pinNoStore.status === 400, `status ${pinNoStore.status}`);

  // --- Refund guards ---
  const invoices = await call('/api/sales/invoices', { token });
  const notPaid = (invoices.json ?? []).find((i) => i.status !== 'PAID');
  if (notPaid) {
    const r = await call(`/api/sales/invoices/${notPaid.id}/refund`, { method: 'POST', token, body: {} });
    check(`refusing to refund a ${notPaid.status} invoice`, r.status === 400, `status ${r.status}`);
  } else {
    console.log('… skipped non-PAID refund check (no such invoice)');
  }

  // --- Reports are live ---
  const from = new Date(Date.now() - 30 * 86_400_000).toISOString();
  const analytics = await call(`/api/reporting/reports/analytics?from=${encodeURIComponent(from)}&to=${encodeURIComponent(new Date().toISOString())}`, { token });
  check('analytics endpoint returns live KPIs', analytics.status === 200 && typeof analytics.json?.kpi?.grossSales === 'number', `status ${analytics.status}`);

  // --- Error handling: bad input never crashes a service ---
  const dup = await call('/api/inventory/products', { method: 'POST', token, body: { name: 'x', sku: own.json?.[0]?.sku ?? 'dup', price: 1 } });
  check('duplicate SKU returns 409 instead of crashing', dup.status === 409, `status ${dup.status}`);
  const health = await call('/api/inventory/products', { token });
  check('inventory-service still up afterwards', health.status === 200);

  // --- Refresh rotation and logout revocation ---
  const refreshed = await call('/api/auth/refresh', { method: 'POST', body: { refreshToken } });
  check('refresh issues a new token pair', refreshed.status === 200 && refreshed.json?.refreshToken);
  const logout = await call('/api/auth/logout', { method: 'POST', token: refreshed.json?.token ?? token, body: {} });
  check('logout succeeds', logout.status === 204, `status ${logout.status}`);
  const afterLogout = await call('/api/auth/refresh', { method: 'POST', body: { refreshToken: refreshed.json?.refreshToken } });
  check('refresh tokens are revoked by logout', afterLogout.status === 401, `status ${afterLogout.status}`);
}

main()
  .catch((err) => {
    failures += 1;
    console.error('✖ smoke test crashed:', err.message);
  })
  .finally(() => {
    console.log(`\n${results.length - failures}/${results.length} checks passed`);
    process.exitCode = failures ? 1 : 0;
  });
