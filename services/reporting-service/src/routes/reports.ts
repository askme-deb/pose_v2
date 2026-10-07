import { Router, type Request } from 'express';
import { z } from 'zod';
import { HttpError, requirePermission } from '@pospe/permissions';
import { prisma, resolveTenantId } from '../lib/prisma';
import { computeAnalytics, type AnalyticsFilters } from '../lib/analytics';
import { renderPdf, renderXlsx, type ReportModule } from '../lib/exporters';

const router = Router();

const MAX_RANGE_DAYS = 400;
const MODULES = ['kpi', 'topSku', 'gst'] as const;

const filterInput = z.object({
  from: z.string().datetime({ offset: true }).optional(),
  to: z.string().datetime({ offset: true }).optional(),
  storeId: z.string().optional(),
  categoryId: z.string().optional(),
  paymentMethod: z.enum(['UPI', 'CARD', 'CASH', 'SPLIT']).optional(),
});

async function parseFilters(req: Request, tenantId: string): Promise<AnalyticsFilters> {
  const parsed = filterInput.safeParse(req.query);
  if (!parsed.success) throw new HttpError(400, 'Invalid report filters');
  const to = parsed.data.to ? new Date(parsed.data.to) : new Date();
  const from = parsed.data.from ? new Date(parsed.data.from) : new Date(to.getTime() - 7 * 86_400_000);
  if (from > to) throw new HttpError(400, '"from" must be before "to"');
  if (to.getTime() - from.getTime() > MAX_RANGE_DAYS * 86_400_000) throw new HttpError(400, `Reports are limited to ${MAX_RANGE_DAYS} days`);

  if (parsed.data.storeId) {
    const store = await prisma.store.findFirst({ where: { id: parsed.data.storeId, tenantId } });
    if (!store) throw new HttpError(403, 'Store does not belong to your tenant');
  }
  return { from, to, storeId: parsed.data.storeId, categoryId: parsed.data.categoryId, paymentMethod: parsed.data.paymentMethod };
}

router.get('/reports/analytics', requirePermission('report:view'), async (req, res) => {
  const tenantId = await resolveTenantId(req);
  res.json(await computeAnalytics(tenantId, await parseFilters(req, tenantId)));
});

router.get('/reports/analytics/export', requirePermission('report:view'), async (req, res) => {
  const tenantId = await resolveTenantId(req);
  const filters = await parseFilters(req, tenantId);
  const format = req.query.format === 'xlsx' ? 'xlsx' : 'pdf';
  const requested = String(req.query.modules ?? MODULES.join(',')).split(',');
  const modules = MODULES.filter((m) => requested.includes(m)) as ReportModule[];
  if (modules.length === 0) throw new HttpError(400, 'Choose at least one report section');

  const [report, tenant] = await Promise.all([
    computeAnalytics(tenantId, filters),
    prisma.tenant.findUniqueOrThrow({ where: { id: tenantId }, select: { name: true } }),
  ]);
  const stamp = new Date().toISOString().slice(0, 10);
  if (format === 'xlsx') {
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="PosPe_Analytics_${stamp}.xlsx"`);
    return res.send(await renderXlsx(report, modules));
  }
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="PosPe_Analytics_${stamp}.pdf"`);
  res.send(await renderPdf(report, `${tenant.name} — Sales & Analytics`, modules));
});

// ---------- Scheduled report emails ----------

const scheduleInput = z.object({
  email: z.string().email(),
  frequency: z.enum(['DAILY', 'WEEKLY', 'MONTHLY']),
  format: z.enum(['PDF', 'XLSX']).default('PDF'),
  modules: z.array(z.enum(MODULES)).min(1),
  storeId: z.string().optional(),
});

router.get('/reports/schedules', requirePermission('report:view'), async (req, res) => {
  const tenantId = await resolveTenantId(req);
  res.json(await prisma.reportSchedule.findMany({ where: { tenantId }, orderBy: { createdAt: 'desc' } }));
});

router.post('/reports/schedules', requirePermission('report:view'), async (req, res) => {
  const parsed = scheduleInput.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const tenantId = await resolveTenantId(req);
  if (parsed.data.storeId && !(await prisma.store.findFirst({ where: { id: parsed.data.storeId, tenantId } }))) {
    return res.status(403).json({ error: 'Store does not belong to your tenant' });
  }
  const schedule = await prisma.reportSchedule.create({ data: { ...parsed.data, tenantId, createdBy: req.authUser?.sub } });
  res.status(201).json(schedule);
});

router.delete('/reports/schedules/:id', requirePermission('report:view'), async (req, res) => {
  const tenantId = await resolveTenantId(req);
  const { count } = await prisma.reportSchedule.deleteMany({ where: { id: req.params.id, tenantId } });
  if (count === 0) return res.status(404).json({ error: 'Schedule not found' });
  res.status(204).end();
});

export default router;
