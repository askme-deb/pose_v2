import cron from 'node-cron';
import type { ReportSchedule } from '@prisma/client';
import { sendReportEmail } from '@pospe/notifications';
import { prisma } from './prisma';
import { computeAnalytics } from './analytics';
import { renderPdf, renderXlsx, type ReportModule } from './exporters';

const PERIOD_DAYS: Record<ReportSchedule['frequency'], number> = { DAILY: 1, WEEKLY: 7, MONTHLY: 30 };

function isDue(schedule: ReportSchedule, now: Date) {
  if (!schedule.lastRunAt) return true;
  // Small slack so an 08:00 run isn't skipped because yesterday's ran at 08:00:03.
  return now.getTime() - schedule.lastRunAt.getTime() >= PERIOD_DAYS[schedule.frequency] * 86_400_000 - 10 * 60_000;
}

export async function runSchedule(schedule: ReportSchedule, now = new Date()) {
  const from = new Date(now.getTime() - PERIOD_DAYS[schedule.frequency] * 86_400_000);
  const report = await computeAnalytics(schedule.tenantId, { from, to: now, storeId: schedule.storeId ?? undefined });
  const tenant = await prisma.tenant.findUniqueOrThrow({ where: { id: schedule.tenantId }, select: { name: true } });
  const modules = schedule.modules as ReportModule[];
  const stamp = now.toISOString().slice(0, 10);

  const isPdf = schedule.format === 'PDF';
  const file = isPdf ? await renderPdf(report, `${tenant.name} — ${schedule.frequency.toLowerCase()} report`, modules) : await renderXlsx(report, modules);

  await sendReportEmail({
    tenantId: schedule.tenantId,
    to: schedule.email,
    subject: `${tenant.name}: ${schedule.frequency.toLowerCase()} sales report (${stamp})`,
    text: `Gross sales ₹${report.kpi.grossSales.toLocaleString('en-IN')} across ${report.kpi.orders} orders. Full report attached.`,
    attachment: {
      filename: `PosPe_${schedule.frequency}_${stamp}.${isPdf ? 'pdf' : 'xlsx'}`,
      contentBase64: file.toString('base64'),
      contentType: isPdf ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    },
  });
  await prisma.reportSchedule.update({ where: { id: schedule.id }, data: { lastRunAt: now } });
}

/** Every day at 08:00 IST, send each active schedule that is due. */
export function startReportScheduler() {
  cron.schedule(
    process.env.REPORT_CRON ?? '0 8 * * *',
    async () => {
      const now = new Date();
      const schedules = await prisma.reportSchedule.findMany({ where: { isActive: true } });
      for (const schedule of schedules.filter((s) => isDue(s, now))) {
        await runSchedule(schedule, now).catch((err) => console.error(`[reporting-service] schedule ${schedule.id} failed:`, err));
      }
    },
    { timezone: 'Asia/Kolkata' },
  );
}
