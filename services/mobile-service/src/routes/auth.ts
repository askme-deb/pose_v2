import { Router } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { effectivePermissions, requireAuth, requirePermission, HttpError, tenantIdOf, type AuthedUser, type Role } from '@pospe/permissions';
import { prisma, ctxOf, storeScope, LOCK_TTL_MS } from '../lib/prisma';

export const publicRouter = Router();
const router = Router();

const roleMap: Record<string, Role> = {
  SUPER_ADMIN: 'super_admin',
  TENANT_OWNER: 'tenant_owner',
  BRANCH_ADMIN: 'branch_admin',
  STORE_MANAGER: 'store_manager',
  CASHIER: 'cashier',
  ACCOUNTANT: 'accountant',
  INVENTORY_MANAGER: 'inventory_manager',
  SALES_EXECUTIVE: 'sales_executive',
};

const MAX_FAILED_LOGINS = 5;
const LOCKOUT_MINUTES = 15;
const BLOCKED_TENANT_STATUSES = new Set(['SUSPENDED', 'CANCELLED']);

const digits = (v: string) => v.replace(/\D/g, '');
const publicBase = () => (process.env.PUBLIC_API_URL || 'http://localhost:4000/api').replace(/\/api\/?$/, '');
const asBool = (v: boolean) => (v ? 1 : 0);

const loginInput = z.object({
  phone_number: z.string().min(4),
  password: z.string().min(1),
  serialNumber: z.string().optional(),
  model: z.string().optional(),
  deviceType: z.string().optional(),
});

// The app has no 401 handling and never refreshes, so unlike the web/POS
// access token (15m + refresh) this one is long-lived. Logout bumps the
// user's tokenVersion only for the web refresh flow; revoking a lost phone
// is done by deactivating the user.
publicRouter.post('/login', async (req, res) => {
  const parsed = loginInput.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: 'Phone number and password are required' });
  const { phone_number, password, serialNumber, model, deviceType } = parsed.data;
  const secret = process.env.JWT_SECRET;
  if (!secret) return res.status(500).json({ message: 'Server auth configuration is missing JWT_SECRET' });

  const phone = digits(phone_number);
  const candidates = await prisma.user.findMany({
    where: { phone: { in: [phone, phone_number.trim()] }, isActive: true },
    include: { rbacRole: { select: { permissions: true } }, tenant: { select: { status: true } } },
  });

  let user: (typeof candidates)[number] | undefined;
  for (const c of candidates) {
    if (c.lockedUntil && c.lockedUntil > new Date()) {
      return res.status(423).json({ message: `Too many failed attempts. Try again after ${c.lockedUntil.toLocaleTimeString('en-IN')}.` });
    }
    if (await bcrypt.compare(password, c.passwordHash)) {
      user = c;
      break;
    }
  }
  if (!user) {
    // Count the miss against the account(s) the phone belongs to, same
    // lockout as the web login.
    for (const c of candidates) {
      const attempts = c.failedLoginAttempts + 1;
      await prisma.user.update({
        where: { id: c.id },
        data: { failedLoginAttempts: attempts, ...(attempts >= MAX_FAILED_LOGINS ? { lockedUntil: new Date(Date.now() + LOCKOUT_MINUTES * 60_000), failedLoginAttempts: 0 } : {}) },
      });
    }
    return res.status(401).json({ message: 'Invalid phone number or password' });
  }
  if (BLOCKED_TENANT_STATUSES.has(user.tenant.status)) return res.status(403).json({ message: 'This business account is not active' });
  if (user.twoFaEnabled) return res.status(403).json({ message: 'Two-factor accounts must sign in through the web app' });

  const role = roleMap[user.role] ?? 'cashier';
  const payload: AuthedUser & { dev?: string } = {
    sub: user.id,
    tenantId: user.tenantId,
    role,
    rbacRoleId: user.rbacRoleId,
    storeId: user.storeId,
    perms: effectivePermissions(role, user.rbacRole?.permissions),
    typ: 'access',
    ...(serialNumber ? { dev: serialNumber } : {}),
  };
  const token = jwt.sign(payload, secret, { expiresIn: process.env.MOBILE_TOKEN_EXPIRES_IN || '30d' } as jwt.SignOptions);

  await prisma.user.update({ where: { id: user.id }, data: { failedLoginAttempts: 0, lockedUntil: null, lastActivityAt: new Date() } });
  await prisma.loginLog.create({
    data: { tenantId: user.tenantId, userId: user.id, storeId: user.storeId, deviceType, deviceSerial: serialNumber, model },
  });

  const [first, ...rest] = user.name.split(' ');
  res.json({
    message: 'Login successful',
    token,
    user: { id: user.id, name: user.name, first_name: first, last_name: rest.join(' '), email: user.email, phone: user.phone, role },
  });
});

router.post('/logout', async (req, res) => {
  const userId = req.authUser!.sub;
  const tenantId = tenantIdOf(req);
  await prisma.loginLog.updateMany({ where: { tenantId, userId, logoutAt: null }, data: { logoutAt: new Date() } });
  await prisma.store.updateMany({ where: { tenantId, lockedByUserId: userId }, data: { lockedByUserId: null, lockedDeviceSerial: null, lockedAt: null } });
  res.json({ status: true });
});

router.get('/get-vendors', async (req, res) => {
  const tenantId = tenantIdOf(req);
  const stores = await prisma.store.findMany({ where: storeScope(tenantId, req.authUser?.storeId), orderBy: [{ isPrimary: 'desc' }, { name: 'asc' }] });
  res.json({ data: { vendors: stores.map((s) => ({ vendor: { id: s.id, name: s.name, store_number: s.code ?? '' } })) } });
});

const addVendorInput = z.object({ vendor_id: z.union([z.string(), z.number()]).transform(String) });

// Selecting a branch also locks it to this user + device so one counter can't
// be rung up from two phones at once (contract §10.5).
router.post('/add-vendor', async (req, res) => {
  const { vendor_id } = addVendorInput.parse(req.body);
  const tenantId = tenantIdOf(req);
  const userId = req.authUser!.sub;
  const dev = (req.authUser as unknown as { dev?: string }).dev;

  const store = await prisma.store.findFirst({ where: { ...storeScope(tenantId, req.authUser?.storeId), id: vendor_id } });
  if (!store) throw new HttpError(403, 'Branch not found or not assigned to you');

  const fresh = store.lockedAt && Date.now() - store.lockedAt.getTime() < LOCK_TTL_MS;
  const heldByOther = fresh && store.lockedByUserId && (store.lockedByUserId !== userId || (store.lockedDeviceSerial && dev && store.lockedDeviceSerial !== dev));
  if (heldByOther) throw new HttpError(409, 'This branch is already logged in on another device');

  await prisma.$transaction([
    // A user works in one branch at a time.
    prisma.store.updateMany({ where: { tenantId, lockedByUserId: userId, id: { not: store.id } }, data: { lockedByUserId: null, lockedDeviceSerial: null, lockedAt: null } }),
    prisma.store.update({ where: { id: store.id }, data: { lockedByUserId: userId, lockedDeviceSerial: dev ?? null, lockedAt: new Date() } }),
  ]);
  const open = await prisma.loginLog.findFirst({ where: { tenantId, userId, logoutAt: null }, orderBy: { loginAt: 'desc' } });
  if (open) await prisma.loginLog.update({ where: { id: open.id }, data: { storeId: store.id } });

  res.json({ status: true, data: { data: { vendor: { id: store.id, is_purchase_enabled: asBool(store.purchaseEnabled) } } } });
});

router.get('/get-user-data', async (req, res) => {
  const { tenantId, userId, storeId } = await ctxOf(req);
  const [user, store, profile] = await Promise.all([
    prisma.user.findFirstOrThrow({ where: { id: userId, tenantId } }),
    prisma.store.findFirstOrThrow({ where: { id: storeId, tenantId } }),
    prisma.tenantProfile.findUnique({ where: { tenantId } }),
  ]);
  const [first, ...rest] = user.name.split(' ');
  const pos = { prod_app_key: store.posAppKey ?? '', merchant_name: store.posMerchantName ?? '', pos_number: store.posNumber ?? '' };
  const logo = profile?.logoUrl ? (profile.logoUrl.startsWith('http') ? profile.logoUrl : `${publicBase()}${profile.logoUrl}`) : '';
  res.json({
    data: {
      data: { name: user.name, first_name: first, last_name: rest.join(' '), email: user.email, phone: user.phone ?? '', ...pos },
      profile_image: '',
      vendor: {
        image_url: logo,
        vendor: {
          name: store.name,
          store_number: store.code ?? '',
          store_location: store.address ?? '',
          phone: store.phone ?? '',
          email: profile?.supportEmail ?? '',
          gst_no: store.gstin ?? profile?.gstin ?? '',
          ...pos,
        },
      },
      // The Account screen reads the plural key, other screens the singular
      // one above — both are returned (contract §3.5).
      vendors: { vendor: { is_purchase_enabled: asBool(store.purchaseEnabled) } },
    },
  });
});

const profileInput = z.object({
  first_name: z.string().trim().min(1),
  last_name: z.string().trim().optional().default(''),
  email: z.string().trim().email(),
  phone: z.string().trim().min(4),
});

router.post('/update-profile', async (req, res) => {
  const body = profileInput.parse(req.body);
  const tenantId = tenantIdOf(req);
  const userId = req.authUser!.sub;
  const clash = await prisma.user.findFirst({ where: { tenantId, email: body.email, id: { not: userId } }, select: { id: true } });
  if (clash) throw new HttpError(409, 'A user with this email already exists');
  await prisma.user.update({
    where: { id: userId },
    data: { name: `${body.first_name} ${body.last_name}`.trim(), email: body.email, phone: digits(body.phone) || body.phone },
  });
  res.json({ status: true, message: 'Profile updated' });
});

const posInput = z.object({
  prod_app_key: z.string().trim().min(1),
  merchant_name: z.string().trim().min(1),
  pos_number: z.string().trim().min(1),
  pos_password: z.string().min(1),
});

router.post('/add-pos-details', requirePermission('store:manage'), async (req, res) => {
  const body = posInput.parse(req.body);
  const { storeId } = await ctxOf(req);
  await prisma.store.update({
    where: { id: storeId },
    data: { posAppKey: body.prod_app_key, posMerchantName: body.merchant_name, posNumber: body.pos_number, posPassword: body.pos_password },
  });
  res.json({ status: true, message: 'POS device connected' });
});

router.get('/get-login-logs', async (req, res) => {
  const { tenantId, storeId } = await ctxOf(req);
  const logs = await prisma.loginLog.findMany({
    where: { tenantId, OR: [{ storeId }, { storeId: null }] },
    orderBy: { loginAt: 'desc' },
    take: 200,
  });
  res.json({
    data: logs.map((l) => ({ login_time: l.loginAt, logout_time: l.logoutAt, device_type: l.deviceType ?? '', model: l.model ?? '' })),
  });
});

export default router;
export { requireAuth };
