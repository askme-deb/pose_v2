import { Router } from 'express';
import { z } from 'zod';
import { requirePermission } from '@pospe/permissions';
import { prisma, resolveTenantId, resolveStoreId } from '../lib/prisma';
import { broadcastInventoryChanged, requestDeviceSync, type SyncedProduct } from '../lib/realtime';

const router = Router();

const SALES_SERVICE_URL = process.env.SALES_SERVICE_URL || 'http://localhost:4005';

// Same read-across-the-domain-boundary pragmatism sales-service's own
// /gst-summary route already uses against purchase-service's tables —
// services share one Postgres database in this scaffold. Fetching the real
// post-sale rows here (rather than just the ids) is what lets a receiving
// terminal patch its cache directly instead of re-fetching the catalog.
async function loadSyncedProducts(tenantId: string, productIds: string[]): Promise<SyncedProduct[]> {
  if (productIds.length === 0) return [];
  const products = await prisma.product.findMany({
    where: { id: { in: productIds }, tenantId },
    include: { category: true },
  });
  return products.map((p) => ({
    id: p.id,
    name: p.name,
    sku: p.sku,
    barcode: p.barcode ?? '',
    categoryId: p.categoryId ?? '',
    categoryName: p.category?.name ?? 'Uncategorized',
    gstRate: Number(p.gstRate),
    sellingPrice: Number(p.price),
    costPrice: Number(p.costPrice),
    stockQty: p.stockQty,
    minThreshold: p.minThreshold,
    imageUrl: p.imageUrl ?? '',
  }));
}

const pushItemInput = z.object({
  idempotencyKey: z.string().min(1),
  queuedAt: z.string(),
  payload: z.object({
    customerId: z.string().optional(),
    paymentMethod: z.enum(['CASH', 'UPI', 'CARD', 'SPLIT']),
    // unitPrice is forwarded as-is; sales-service enforces billing:price_override
    // against the same caller token on replay.
    items: z
      .array(z.object({ productId: z.string().min(1), quantity: z.number().int().positive(), unitPrice: z.number().nonnegative().optional() }))
      .min(1),
    discountPercent: z.number().min(0).max(100).default(0),
  }),
});

const pushInput = z.object({
  deviceId: z.string().min(1),
  storeId: z.string().min(1),
  label: z.string().optional(),
  items: z.array(pushItemInput),
});

interface PushResult {
  idempotencyKey: string;
  status: 'synced' | 'conflict' | 'error';
  invoice?: unknown;
  conflictId?: string;
  reason?: string;
}

// The one real "conflict" this domain has: two offline terminals both sell
// the last unit of the same SKU, and the second one to come back online
// can't be honestly honored. sales-service's checkout transaction already
// refuses to oversell (see its InsufficientStockError) — this endpoint is
// what makes that failure durable and visible to a manager, instead of it
// just sitting in one device's local queue forever.
router.post('/push', requirePermission('billing:create'), async (req, res) => {
  const parsed = pushInput.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { deviceId, storeId, label, items } = parsed.data;

  const tenantId = await resolveTenantId(req);
  await resolveStoreId(tenantId, storeId);
  const authorization = req.header('authorization');

  // Chronological replay: whichever offline sale actually happened first gets
  // first claim on the stock that's left, same as if both had been online.
  const ordered = [...items].sort((a, b) => a.queuedAt.localeCompare(b.queuedAt));

  const results: PushResult[] = [];
  const affectedProductIds = new Set<string>();

  for (const item of ordered) {
    try {
      const response = await fetch(`${SALES_SERVICE_URL}/invoices`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'idempotency-key': item.idempotencyKey,
          'x-store-id': storeId,
          ...(authorization ? { authorization } : {}),
        },
        body: JSON.stringify(item.payload),
      });

      if (response.ok) {
        const invoice = await response.json();
        for (const line of item.payload.items) affectedProductIds.add(line.productId);
        results.push({ idempotencyKey: item.idempotencyKey, status: 'synced', invoice });
        continue;
      }

      const body = (await response.json().catch(() => ({}))) as { error?: string; productId?: unknown };
      if (response.status === 400 && typeof body.productId === 'string') {
        const conflict = await prisma.syncConflict.upsert({
          where: { tenantId_idempotencyKey: { tenantId, idempotencyKey: item.idempotencyKey } },
          update: { reason: body.error ?? 'Insufficient stock', payload: item.payload },
          create: {
            tenantId,
            storeId,
            deviceId,
            idempotencyKey: item.idempotencyKey,
            kind: 'INSUFFICIENT_STOCK',
            reason: body.error ?? 'Insufficient stock',
            payload: item.payload,
          },
        });
        results.push({
          idempotencyKey: item.idempotencyKey,
          status: 'conflict',
          conflictId: conflict.id,
          reason: conflict.reason,
        });
        continue;
      }

      results.push({
        idempotencyKey: item.idempotencyKey,
        status: 'error',
        reason: typeof body.error === 'string' ? body.error : `sales-service returned ${response.status}`,
      });
    } catch (err) {
      req.log?.error({ err, idempotencyKey: item.idempotencyKey }, 'Failed to reach sales-service during sync push');
      results.push({ idempotencyKey: item.idempotencyKey, status: 'error', reason: 'sales-service unreachable' });
    }
  }

  const syncedCount = results.filter((r) => r.status === 'synced').length;
  await prisma.syncDevice.upsert({
    where: { tenantId_deviceId: { tenantId, deviceId } },
    update: {
      storeId,
      ...(label ? { label } : {}),
      pendingCount: results.length - syncedCount,
      lastSyncAt: new Date(),
      lastSeenAt: new Date(),
    },
    create: {
      tenantId,
      storeId,
      deviceId,
      label,
      pendingCount: results.length - syncedCount,
      lastSyncAt: new Date(),
    },
  });

  if (affectedProductIds.size > 0) {
    const products = await loadSyncedProducts(tenantId, [...affectedProductIds]);
    broadcastInventoryChanged(tenantId, { storeId, products });
  }

  res.json({ results });
});

const heartbeatInput = z.object({
  deviceId: z.string().min(1),
  storeId: z.string().min(1),
  label: z.string().optional(),
  pendingCount: z.number().int().nonnegative().default(0),
  // Optional device telemetry for the fleet view.
  platform: z.string().max(40).optional(),
  osVersion: z.string().max(40).optional(),
  appVersion: z.string().max(40).optional(),
  batteryPercent: z.number().int().min(0).max(100).optional(),
  peripherals: z.array(z.string().max(60)).max(20).optional(),
});

// Lightweight "I'm still here" ping so a device shows up in /sync/devices even
// on a quiet shift with nothing to push — otherwise a manager can't tell "no
// pending sales" apart from "this terminal's been off for three hours."
router.post('/heartbeat', requirePermission('billing:create'), async (req, res) => {
  const parsed = heartbeatInput.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { deviceId, storeId, label, pendingCount, ...telemetry } = parsed.data;

  const tenantId = await resolveTenantId(req);
  await resolveStoreId(tenantId, storeId);

  const device = await prisma.syncDevice.upsert({
    where: { tenantId_deviceId: { tenantId, deviceId } },
    update: { storeId, ...(label ? { label } : {}), pendingCount, lastSeenAt: new Date(), ...telemetry },
    create: { tenantId, storeId, deviceId, label, pendingCount, ...telemetry },
  });
  res.json(device);
});

const ONLINE_WINDOW_MS = 90_000;

router.get('/devices', requirePermission('report:view'), async (req, res) => {
  const tenantId = await resolveTenantId(req);
  const devices = await prisma.syncDevice.findMany({
    where: { tenantId },
    include: { store: { select: { id: true, name: true } } },
    orderBy: { lastSeenAt: 'desc' },
  });
  const now = Date.now();
  res.json(devices.map((d) => ({ ...d, online: now - d.lastSeenAt.getTime() < ONLINE_WINDOW_MS })));
});

// Asks one terminal (over its Socket.IO connection) to flush its offline
// queue now, instead of waiting for its next scheduled sync.
router.post('/devices/:deviceId/sync-request', requirePermission('inventory:manage'), async (req, res) => {
  const tenantId = await resolveTenantId(req);
  const device = await prisma.syncDevice.findFirst({ where: { tenantId, deviceId: req.params.deviceId } });
  if (!device) return res.status(404).json({ error: 'Device not found' });
  const delivered = requestDeviceSync(tenantId, device.deviceId);
  res.status(202).json({ requested: true, connected: delivered });
});

router.get('/conflicts', requirePermission('report:view'), async (req, res) => {
  const tenantId = await resolveTenantId(req);
  const status = req.query.status === 'RESOLVED' ? 'RESOLVED' : req.query.status === 'ALL' ? undefined : 'OPEN';
  const conflicts = await prisma.syncConflict.findMany({
    where: { tenantId, ...(status ? { status } : {}) },
    include: { store: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'desc' },
  });
  res.json(conflicts);
});

const resolveInput = z.object({
  note: z.string().min(1),
  resolvedBy: z.string().min(1),
});

router.post('/conflicts/:id/resolve', requirePermission('inventory:manage'), async (req, res) => {
  const parsed = resolveInput.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const tenantId = await resolveTenantId(req);
  const existing = await prisma.syncConflict.findFirst({ where: { id: req.params.id, tenantId } });
  if (!existing) return res.status(404).json({ error: 'Conflict not found' });

  const conflict = await prisma.syncConflict.update({
    where: { id: existing.id },
    data: {
      status: 'RESOLVED',
      resolvedAt: new Date(),
      resolvedBy: parsed.data.resolvedBy,
      resolutionNote: parsed.data.note,
    },
  });
  res.json(conflict);
});

export default router;
