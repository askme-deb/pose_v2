import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ColumnDef } from '@tanstack/react-table';
import { Search, Plus, Pencil, Trash2, Percent } from 'lucide-react';
import { Badge, Button, DataTable, GlassCard, KpiCard, useToast } from '@pospe/ui-library';
import { deleteHsnCode, listHsnCodes, type LiveHsnCode } from '../../services/api/hsnCodes';
import { apiErrorMessage } from '../auth/session';

/** The HSN / SAC master: every code, its GST rate, and how many products use it. */
export default function HsnCodesPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [rows, setRows] = useState<LiveHsnCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  async function reload() {
    setLoading(true);
    try {
      setRows(await listHsnCodes());
    } catch (err) {
      showToast(apiErrorMessage(err, 'Could not load HSN codes'), 'danger');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => !q || r.code.includes(q) || r.description.toLowerCase().includes(q));
  }, [rows, search]);

  async function handleDelete(row: LiveHsnCode) {
    try {
      await deleteHsnCode(row.id);
      setRows((prev) => prev.filter((r) => r.id !== row.id));
      showToast(`HSN ${row.code} removed`, 'warning');
    } catch (err) {
      showToast(apiErrorMessage(err, 'Could not delete HSN code'), 'danger');
    }
  }

  const columns: ColumnDef<LiveHsnCode>[] = useMemo(
    () => [
      { header: 'HSN / SAC', accessorKey: 'code', cell: ({ getValue }) => <span className="font-mono font-bold text-slate-900 dark:text-white">{getValue() as string}</span> },
      { header: 'Description', accessorKey: 'description' },
      {
        header: 'GST Rate',
        accessorKey: 'gstRate',
        cell: ({ getValue }) => <span className="font-bold text-slate-800 dark:text-slate-100">{getValue() as number}%</span>,
      },
      { header: 'Products', accessorKey: 'productCount' },
      {
        header: 'Status',
        id: 'status',
        cell: ({ row }) => (
          <Badge color={row.original.isActive ? 'emerald' : 'amber'} dot pill>
            {row.original.isActive ? 'Active' : 'Inactive'}
          </Badge>
        ),
      },
      {
        header: 'Actions',
        id: 'actions',
        cell: ({ row }) => (
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => navigate(`/inventory/hsn-codes/${row.original.id}/edit`)}
              title="Edit"
              className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-blue-600 hover:text-white transition"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => handleDelete(row.original)}
              title={row.original.productCount ? 'In use: move its products to another code first' : 'Delete'}
              className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-rose-600 hover:text-white transition"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [navigate],
  );

  const inUse = rows.filter((r) => r.productCount > 0).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white">HSN & GST</h1>
          <p className="text-xs text-slate-400 mt-0.5">GST rates are managed here, per HSN / SAC code. A product takes its rate from the code you assign to it.</p>
        </div>
        <Button variant="primary" onClick={() => navigate('/inventory/hsn-codes/new')}>
          <Plus className="w-4 h-4" /> Add HSN Code
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard label="HSN / SAC Codes" value={String(rows.length)} icon={Percent} color="blue" />
        <KpiCard label="In Use By Products" value={String(inUse)} icon={Percent} color="emerald" />
        <KpiCard label="Not Used Yet" value={String(rows.length - inUse)} icon={Percent} color="amber" />
      </div>

      <GlassCard className="!p-0 overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800">
          <div className="relative max-w-sm">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search code or description..."
              className="w-full pl-10 pr-4 py-2 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        <DataTable
          columns={columns}
          data={filtered}
          loading={loading}
          emptyTitle="No HSN Codes Yet"
          emptyDescription="Add the HSN / SAC codes you sell under, with their GST rate. Products pick one of these."
        />
      </GlassCard>
    </div>
  );
}
