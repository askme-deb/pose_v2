import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';
import type { AnalyticsReport } from './analytics';

export type ReportModule = 'kpi' | 'topSku' | 'gst';

const inr = (n: number) => `Rs ${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const rangeLabel = (r: AnalyticsReport) => `${r.range.from.slice(0, 10)} to ${r.range.to.slice(0, 10)}`;

export function renderPdf(report: AnalyticsReport, title: string, modules: ReportModule[]): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 48 });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.fontSize(18).text(title);
    doc.fontSize(10).fillColor('#555').text(rangeLabel(report)).fillColor('#000').moveDown();

    const row = (label: string, value: string) => {
      const y = doc.y;
      doc.text(label, 48, y, { width: 300 });
      doc.text(value, 350, y, { width: 197, align: 'right' });
      doc.moveDown(0.3);
    };

    if (modules.includes('kpi')) {
      doc.fontSize(13).text('Key figures').moveDown(0.4).fontSize(10);
      row('Gross sales (incl. GST)', inr(report.kpi.grossSales));
      row('Orders', String(report.kpi.orders));
      row('Average order value', inr(report.kpi.aov));
      row('Discounts', inr(report.pnlStatement.discounts));
      row('Returns', inr(report.pnlStatement.returns));
      row('Net revenue (ex-GST)', inr(report.pnlStatement.netOperatingRevenue));
      row('Cost of goods sold', inr(report.pnlStatement.cogs));
      row('Gross profit', inr(report.pnlStatement.grossProfit));
      row('GST collected', inr(report.kpi.gst));
      doc.moveDown();
    }

    if (modules.includes('topSku')) {
      doc.fontSize(13).text('Top products').moveDown(0.4).fontSize(9);
      for (const p of report.topProducts.slice(0, 20)) row(`${p.name} (${p.sku}) x${p.unitsSold}`, inr(p.revenue));
      doc.moveDown();
    }

    if (modules.includes('gst')) {
      doc.fontSize(13).text('GST by slab').moveDown(0.4).fontSize(10);
      for (const g of report.gstTaxSlabSummary) row(`${g.slabLabel} on ${inr(g.taxableAmount)}`, `CGST ${inr(g.cgst)} / SGST ${inr(g.sgst)}`);
      row('Total GST', inr(report.gstTotal));
    }

    doc.end();
  });
}

export async function renderXlsx(report: AnalyticsReport, modules: ReportModule[]): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'PosPe';

  if (modules.includes('kpi')) {
    const ws = wb.addWorksheet('Summary');
    ws.columns = [{ header: 'Metric', key: 'k', width: 32 }, { header: 'Value', key: 'v', width: 18 }];
    ws.addRows([
      { k: 'Period', v: rangeLabel(report) },
      { k: 'Gross sales (incl. GST)', v: report.kpi.grossSales },
      { k: 'Orders', v: report.kpi.orders },
      { k: 'Average order value', v: report.kpi.aov },
      { k: 'Discounts', v: report.pnlStatement.discounts },
      { k: 'Returns', v: report.pnlStatement.returns },
      { k: 'Net revenue (ex-GST)', v: report.pnlStatement.netOperatingRevenue },
      { k: 'COGS', v: report.pnlStatement.cogs },
      { k: 'Gross profit', v: report.pnlStatement.grossProfit },
      { k: 'GST collected', v: report.kpi.gst },
    ]);
    const daily = wb.addWorksheet('Daily');
    daily.columns = [
      { header: 'Date', key: 'date', width: 14 },
      { header: 'Revenue', key: 'revenue', width: 14 },
      { header: 'Profit', key: 'profit', width: 14 },
      { header: 'Orders', key: 'orders', width: 10 },
    ];
    daily.addRows(report.revenueSeries);
  }

  if (modules.includes('topSku')) {
    const ws = wb.addWorksheet('Top products');
    ws.columns = [
      { header: 'Product', key: 'name', width: 32 },
      { header: 'SKU', key: 'sku', width: 16 },
      { header: 'Category', key: 'categoryName', width: 18 },
      { header: 'Units sold', key: 'unitsSold', width: 12 },
      { header: 'Revenue', key: 'revenue', width: 14 },
      { header: 'Profit', key: 'profit', width: 14 },
      { header: 'Margin %', key: 'marginPercent', width: 10 },
    ];
    ws.addRows(report.topProducts);
  }

  if (modules.includes('gst')) {
    const ws = wb.addWorksheet('GST');
    ws.columns = [
      { header: 'Slab', key: 'slabLabel', width: 14 },
      { header: 'Taxable', key: 'taxableAmount', width: 16 },
      { header: 'CGST', key: 'cgst', width: 14 },
      { header: 'SGST', key: 'sgst', width: 14 },
      { header: 'Total', key: 'total', width: 14 },
    ];
    ws.addRows(report.gstTaxSlabSummary);
  }

  for (const ws of wb.worksheets) ws.getRow(1).font = { bold: true };
  return Buffer.from(await wb.xlsx.writeBuffer());
}
