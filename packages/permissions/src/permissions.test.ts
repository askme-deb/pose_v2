import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import type { Request, Response } from 'express';
import { effectivePermissions, hasPermission, listHasPermission } from './roles';
import { requirePermission, signInternalToken, tenantIdOf, verifyToken, type AuthedUser } from './middleware';

const SECRET = 'test-secret';

beforeEach(() => {
  process.env.JWT_SECRET = SECRET;
});

const access = (overrides: Partial<AuthedUser> = {}) =>
  jwt.sign({ sub: 'u1', tenantId: 't1', role: 'cashier', rbacRoleId: null, typ: 'access', ...overrides }, SECRET);

test('verifyToken accepts a real access token', () => {
  const user = verifyToken(access());
  assert.equal(user?.tenantId, 't1');
});

test('verifyToken rejects a 2FA-pending token (password-only must not grant access)', () => {
  const pending = jwt.sign({ sub: 'u1', typ: '2fa', purpose: '2fa-pending' }, SECRET);
  assert.equal(verifyToken(pending), null);
  // Even an old-style pending token without typ is rejected.
  assert.equal(verifyToken(jwt.sign({ sub: 'u1', purpose: '2fa-pending' }, SECRET)), null);
});

test('verifyToken rejects tokens missing tenant/role, wrong secret, or expired', () => {
  assert.equal(verifyToken(jwt.sign({ sub: 'u1', typ: 'access', role: 'cashier' }, SECRET)), null);
  assert.equal(verifyToken(jwt.sign({ sub: 'u1', tenantId: 't1', role: 'cashier', typ: 'access' }, 'other')), null);
  assert.equal(verifyToken(jwt.sign({ sub: 'u1', tenantId: 't1', role: 'cashier', typ: 'access', exp: 1 }, SECRET)), null);
});

test('internal service tokens are bound to a tenant', () => {
  const user = verifyToken(signInternalToken('tenant-42')!);
  assert.equal(user?.tenantId, 'tenant-42');
  assert.equal(user?.sub, 'system');
});

test('tenantIdOf ignores a forged x-tenant-id header', () => {
  const req = { authUser: verifyToken(access()), header: () => 'someone-elses-tenant', headers: { 'x-tenant-id': 'someone-elses-tenant' } } as unknown as Request;
  assert.equal(tenantIdOf(req), 't1');
});

test('tenantIdOf throws 401 without an authenticated tenant', () => {
  assert.throws(() => tenantIdOf({} as Request), (err: { status?: number }) => err.status === 401);
});

test("tenant_owner's wildcard does not reach platform permissions", () => {
  assert.equal(hasPermission('tenant_owner', 'inventory:manage'), true);
  assert.equal(hasPermission('tenant_owner', 'platform:manage'), false);
  assert.equal(hasPermission('super_admin', 'platform:manage'), true);
});

test('refunds need billing:refund, which cashiers do not have', () => {
  assert.equal(hasPermission('cashier', 'billing:refund'), false);
  assert.equal(hasPermission('store_manager', 'billing:refund'), true);
});

const matrix = (overrides: Partial<Record<string, Partial<Record<string, boolean>>>> = {}) => {
  const none = { view: false, create: false, edit: false, delete: false, approve: false, export: false };
  return {
    pos: { ...none, ...overrides.pos },
    inventory: { ...none, ...overrides.inventory },
    finance: { ...none, ...overrides.finance },
    crm: { ...none, ...overrides.crm },
  };
};

test('the tenant RBAC matrix decides matrix-mapped permissions', () => {
  const perms = effectivePermissions('cashier', matrix({ pos: { view: true, create: true } }));
  assert.ok(perms.includes('billing:create'));
  // Matrix says no price edits, so the cashier role's default grant is removed.
  assert.ok(!perms.includes('billing:price_override'));
  const promoted = effectivePermissions('cashier', matrix({ inventory: { edit: true } }));
  assert.ok(promoted.includes('inventory:manage'));
});

test('permissions the matrix cannot express still come from the fixed role', () => {
  const perms = effectivePermissions('branch_admin', matrix());
  assert.ok(perms.includes('user:manage'));
  assert.ok(!perms.includes('report:view'));
});

test('owners keep full access regardless of their matrix', () => {
  assert.deepEqual(effectivePermissions('tenant_owner', matrix()), ['*']);
  assert.equal(listHasPermission(['*'], 'platform:manage'), false);
});

test('requirePermission uses the token perms claim when present', () => {
  const run = (user: Partial<AuthedUser>) => {
    let status = 200;
    let nextCalled = false;
    const res = { status: (s: number) => ((status = s), { json: () => undefined }) } as unknown as Response;
    requirePermission('inventory:manage')({ authUser: user } as Request, res, () => (nextCalled = true));
    return nextCalled ? 200 : status;
  };
  assert.equal(run({ role: 'cashier', perms: ['inventory:manage'] }), 200);
  assert.equal(run({ role: 'store_manager', perms: ['billing:view'] }), 403);
  assert.equal(run({ role: 'store_manager' }), 200); // legacy token: role map
  assert.equal(run({}), 403);
});
