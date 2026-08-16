import { useMemo, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { Search, Receipt, FileCheck, ShoppingCart, BarChart2, Download, Zap, Printer, RotateCcw } from 'lucide-react';
import { Badge, Button, DataTable, GlassCard, KpiCard, Modal, useToast } from '@pospe/ui-library';

import { formatINR, formatDateTime } from '../../utils/format';
import {
  salesInvoices as seedInvoices,
  type SalesInvoice,
  type PaymentMethod,
} from '../../services/mockData/salesInvoices';

const POS_URL = `${(import.meta.env.VITE_POS_URL as string | undefined) ?? 'http://localhost:5174'}/pos`;

const paymentBadgeColor: Record<PaymentMethod, 'purple' | 'blue' | 'amber'> = {
  upi: 'purple',
  card: 'blue',
  cash: 'amber',
};

const paymentBadgeLabel: Record<PaymentMethod, string> = {
  upi: 'UPI / QR',
  card: 'Card',
  cash: 'Cash',
};

function downloadCsv(filename: string, rows: string[][]) {
  const csv = rows.map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export default function SalesInvoicesPage() {
  const { showToast } = useToast();

  const [invoices, setInvoices] = useState<SalesInvoice[]>(seedInvoices);
  const [search, setSearch] = useState('');
  const [paymentFilter, setPaymentFilter] = useState<'all' | PaymentMethod>('all');
  const [receiptInvoice, setReceiptInvoice] = useState<SalesInvoice | null>(null);

  const totalBilled = useMemo(() => invoices.reduce((sum, i) => sum + i.totalAmount, 0), [invoices]);
  const totalGst = useMemo(() => invoices.reduce((sum, i) => sum + i.gstAmount, 0), [invoices]);
  const avgInvoiceValue = invoices.length ? totalBilled / invoices.length : 0;

  const filteredInvoices = useMemo(() => {
    const q = search.toLowerCase().trim();
    return invoices.filter((inv) => {
      const matchesSearch =
        !q ||
        inv.id.toLowerCase().includes(q) ||
        inv.customerName.toLowerCase().includes(q) ||
        inv.items.toLowerCase().includes(q);
      const matchesPayment = paymentFilter === 'all' || inv.paymentMethod === paymentFilter;
      return matchesSearch && matchesPayment;
    });
  }, [invoices, search, paymentFilter]);

  const handleRefund = (invoice: SalesInvoice) => {
    if (!window.confirm(`Process refund for Invoice ${invoice.id} (${formatINR(invoice.totalAmount)})?`)) return;
    setInvoices((prev) => prev.map((inv) => (inv.id === invoice.id ? { ...inv, status: 'refunded' } : inv)));
    showToast('Invoice refunded', 'warning');
  };

  const handleExportCsv = () => {
    const header = ['Invoice ID', 'Date', 'Customer', 'Items', 'GST Tax', 'Total Amount', 'Payment Method', 'Status'];
    const rows = filteredInvoices.map((inv) => [
      inv.id,
      formatDateTime(inv.createdAt),
      inv.customerName,
      inv.items,
      inv.gstAmount.toFixed(2),
      inv.totalAmount.toFixed(2),
      paymentBadgeLabel[inv.paymentMethod],
      inv.status,
    ]);
    downloadCsv(`sales-invoices-${new Date().toISOString().slice(0, 10)}.csv`, [header, ...rows]);
    showToast('Exported sales billing ledger to CSV file.', 'info');
  };

  const columns: ColumnDef<SalesInvoice>[] = useMemo(
    () => [
      {
        header: 'Invoice ID & Date',
        accessorKey: 'id',
        cell: ({ row }) => (
          <div>
            <div className="font-mono font-bold text-xs text-slate-900 dark:text-white">{row.original.id}</div>
            <div className="text-[10px] text-slate-400 font-mono mt-0.5">{formatDateTime(row.original.createdAt)}</div>
          </div>
        ),
      },
      {
        header: 'Customer Name',
        accessorKey: 'customerName',
        cell: ({ row }) => <span className="font-bold text-xs text-slate-900 dark:text-white">{row.original.customerName}</span>,
      },
      {
        header: 'Billed Items',
        accessorKey: 'items',
        cell: ({ row }) => <span className="text-slate-600 dark:text-slate-300 line-clamp-1 max-w-xs block">{row.original.items}</span>,
      },
      {
        header: 'GST Tax',
        accessorKey: 'gstAmount',
        cell: ({ row }) => <span className="font-mono text-slate-500 dark:text-slate-400 block text-right">{formatINR(row.original.gstAmount)}</span>,
      },
      {
        header: 'Total Amount',
        accessorKey: 'totalAmount',
        cell: ({ row }) => (
          <span className="font-mono font-black text-slate-900 dark:text-white block text-right">{formatINR(row.original.totalAmount)}</span>
        ),
      },
      {
        header: 'Payment Method',
        accessorKey: 'paymentMethod',
        cell: ({ row }) => (
          <div className="flex justify-center">
            <Badge color={paymentBadgeColor[row.original.paymentMethod]} pill>
              {paymentBadgeLabel[row.original.paymentMethod]}
            </Badge>
          </div>
        ),
      },
      {
        header: 'Status',
        accessorKey: 'status',
        cell: ({ row }) => (
          <div className="flex justify-center">
            <Badge color={row.original.status === 'completed' ? 'emerald' : 'red'} pill>
              {row.original.status === 'completed' ? 'Completed' : 'Refunded'}
            </Badge>
          </div>
        ),
      },
      {
        header: 'Actions',
        id: 'actions',
        cell: ({ row }) => (
          <div className="flex items-center justify-center gap-1.5">
            <button
              onClick={() => setReceiptInvoice(row.original)}
              title="View / Print Thermal Receipt"
              className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-emerald-600 hover:text-white text-slate-600 dark:text-slate-300 transition"
            >
              <Printer className="w-3.5 h-3.5" />
            </button>
            {row.original.status === 'completed' && (
              <button
                onClick={() => handleRefund(row.original)}
                title="Process Refund"
                className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-600 hover:text-white text-rose-600 transition"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        ),
      },
    ],
    [],
  );

  return (
    <div className="space-y-8">
      <GlassCard className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl lg:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Sales Invoices &amp; Billing Ledger
            </h1>
            <Badge color="emerald" pill dot>
              {invoices.length} Invoices &bull; {formatINR(totalBilled)} Total Billed
            </Badge>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Audit sales transactions, reprint thermal receipts, inspect GST breakdown, and process refunds.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search INV ID, customer, items..."
              className="pl-10 pr-4 py-2 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500 w-64 shadow-inner"
            />
          </div>

          <select
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value as 'all' | PaymentMethod)}
            className="px-3.5 py-2 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="all">All Payment Methods</option>
            <option value="upi">UPI / QR Code</option>
            <option value="card">Credit Card</option>
            <option value="cash">Cash</option>
          </select>

          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={handleExportCsv}>
              <Download className="w-3.5 h-3.5 text-emerald-600" />
              <span>Export CSV</span>
            </Button>
            <a
              href={POS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-bold shadow-lg shadow-emerald-500/25 transition transform hover:scale-[1.02]"
            >
              <Zap className="w-4 h-4" />
              <span>+ POS Terminal</span>
            </a>
          </div>
        </div>
      </GlassCard>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard icon={Receipt} label="Total Billed Revenue" value={formatINR(totalBilled)} delta="Gross Billed Sales" deltaTone="positive" color="emerald" />
        <KpiCard icon={FileCheck} label="Total GST Collected" value={formatINR(totalGst)} delta="CGST & SGST Split" deltaTone="neutral" color="blue" />
        <KpiCard icon={ShoppingCart} label="Invoices Issued" value={`${invoices.length} Invoices`} delta="Completed Transactions" deltaTone="neutral" color="indigo" />
        <KpiCard icon={BarChart2} label="Avg Invoice Value" value={formatINR(avgInvoiceValue)} delta="Average Basket Size" deltaTone="neutral" color="purple" />
      </div>

      <GlassCard>
        <DataTable
          columns={columns}
          data={filteredInvoices}
          emptyTitle="No Sales Invoices Found"
          emptyDescription="No invoice numbers or customer names match your search filter."
        />
      </GlassCard>

      <Modal
        open={!!receiptInvoice}
        onClose={() => setReceiptInvoice(null)}
        maxWidth="sm"
        footer={
          <>
            <Button variant="primary" className="flex-1" onClick={() => window.print()}>
              Print Thermal Receipt
            </Button>
            <Button variant="ghost" onClick={() => setReceiptInvoice(null)}>
              Close
            </Button>
          </>
        }
      >
        {receiptInvoice && (
          <div id="receipt-modal-body" className="space-y-4 font-mono text-xs text-slate-800 dark:text-slate-200">
            <div className="text-center space-y-1 pb-3 border-b border-dashed border-slate-300 dark:border-slate-700">
              <div className="font-black text-sm uppercase tracking-wider">APEX SUPERMARKET CHAIN</div>
              <div className="text-[10px] text-slate-400">Downtown Flagship Store &bull; GSTIN: 27AAACA1234F1Z9</div>
              <div className="text-[10px] text-slate-400">Ph: +91 98200 11223 &bull; Support: help@apexpos.com</div>
            </div>

            <div className="flex items-center justify-between text-[11px] font-bold">
              <span>INVOICE: {receiptInvoice.id}</span>
              <span>{formatDateTime(receiptInvoice.createdAt)}</span>
            </div>

            <div className="text-[11px]">
              <span>CUSTOMER: </span>
              <span className="font-bold">{receiptInvoice.customerName}</span>
            </div>

            <div className="py-2 border-y border-dashed border-slate-300 dark:border-slate-700 space-y-1 text-[11px]">
              <div className="font-bold line-clamp-2">{receiptInvoice.items}</div>
            </div>

            <div className="space-y-1 text-right text-[11px] pt-1">
              <div className="flex justify-between">
                <span>Subtotal Excl Tax:</span> <span>{formatINR(receiptInvoice.totalAmount - receiptInvoice.gstAmount)}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>CGST (9%):</span> <span>{formatINR(receiptInvoice.gstAmount / 2)}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>SGST (9%):</span> <span>{formatINR(receiptInvoice.gstAmount / 2)}</span>
              </div>
              <div className="flex justify-between font-black text-sm text-emerald-600 pt-1 border-t border-slate-200 dark:border-slate-800">
                <span>GRAND TOTAL:</span> <span>{formatINR(receiptInvoice.totalAmount)}</span>
              </div>
            </div>

            <div className="text-center pt-3 text-[10px] text-slate-400 border-t border-dashed border-slate-300 dark:border-slate-700">
              <div>
                Payment via {paymentBadgeLabel[receiptInvoice.paymentMethod]} &bull; Status: {receiptInvoice.status.toUpperCase()}
              </div>
              <div className="mt-1 font-bold">Thank you for shopping at ApexPOS Supermarket!</div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
