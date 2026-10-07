import { useEffect, useMemo, useState } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { RadioTower, Wifi, WifiOff, RefreshCw, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import { Badge, Drawer, DataTable, GlassCard, KpiCard, Select, useToast } from '@pospe/ui-library';
import { listSyncDevices, listSyncConflicts, resolveSyncConflict, type SyncDevice, type SyncConflict, type SyncConflictStatus } from '../../services/api/sync';
import { listProducts, type LiveProduct } from '../../services/api/products';
import { useAuthStore } from '../../store/useAuthStore';
import { formatDateTime } from '../../utils/format';

const statusFilterOptions = [
  { value: 'OPEN', label: 'Open Conflicts' },
  { value: 'RESOLVED', label: 'Resolved Conflicts' },
  { value: 'ALL', label: 'All Conflicts' },
];

export default function SyncStatusPage() {
  const { showToast } = useToast();
  const currentUser = useAuthStore((s) => s.user);

  const [devices, setDevices] = useState<SyncDevice[]>([]);
  const [conflicts, setConflicts] = useState<SyncConflict[]>([]);
  const [products, setProducts] = useState<LiveProduct[]>([]);
  const [statusFilter, setStatusFilter] = useState<SyncConflictStatus | 'ALL'>('OPEN');
  const [loading, setLoading] = useState(true);
  const [resolving, setResolving] = useState(false);

  const [activeConflict, setActiveConflict] = useState<SyncConflict | null>(null);
  const [note, setNote] = useState('');

  async function reload() {
    setLoading(true);
    try {
      const [d, c, p] = await Promise.all([listSyncDevices(), listSyncConflicts(statusFilter), listProducts()]);
      setDevices(d);
      setConflicts(c);
      setProducts(p);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to load sync status from the server', 'danger');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const productById = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);

  const onlineCount = devices.filter((d) => d.online).length;
  const totalPending = devices.reduce((sum, d) => sum + d.pendingCount, 0);
  const openConflictCount = conflicts.filter((c) => c.status === 'OPEN').length;

  function openResolveDrawer(conflict: SyncConflict) {
    setActiveConflict(conflict);
    setNote('');
  }

  async function handleResolve(e: React.FormEvent) {
    e.preventDefault();
    if (!activeConflict) return;
    setResolving(true);
    try {
      await resolveSyncConflict(activeConflict.id, note.trim(), currentUser?.name ?? 'Manager');
      await reload();
      setActiveConflict(null);
      showToast('Conflict marked resolved', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not resolve conflict', 'danger');
    } finally {
      setResolving(false);
    }
  }

  const deviceColumns: ColumnDef<SyncDevice, any>[] = [
    {
      header: 'Terminal',
      id: 'terminal',
      cell: ({ row }) => (
        <div>
          <p className="font-bold text-slate-800 dark:text-slate-100">{row.original.label ?? 'Unnamed Terminal'}</p>
          <p className="text-[10px] font-mono text-slate-400">{row.original.deviceId}</p>
        </div>
      ),
    },
    { header: 'Store', id: 'store', accessorFn: (d) => d.store.name },
    {
      header: 'Status',
      accessorKey: 'online',
      cell: ({ getValue }) =>
        getValue() ? (
          <Badge color="emerald" dot pill>
            <Wifi className="w-3 h-3" /> Online
          </Badge>
        ) : (
          <Badge color="slate" dot pill>
            <WifiOff className="w-3 h-3" /> Offline
          </Badge>
        ),
    },
    {
      header: 'Pending Syncs',
      accessorKey: 'pendingCount',
      cell: ({ getValue }) => {
        const n = getValue() as number;
        return n > 0 ? (
          <span className="font-bold text-amber-600 dark:text-amber-400">{n} queued</span>
        ) : (
          <span className="text-slate-400">Up to date</span>
        );
      },
    },
    {
      header: 'Last Sync',
      accessorKey: 'lastSyncAt',
      cell: ({ getValue }) => {
        const v = getValue() as string | null;
        return <span className="text-slate-500 dark:text-slate-400">{v ? formatDateTime(v) : '—'}</span>;
      },
    },
    {
      header: 'Last Seen',
      accessorKey: 'lastSeenAt',
      cell: ({ getValue }) => <span className="text-slate-500 dark:text-slate-400">{formatDateTime(getValue() as string)}</span>,
    },
  ];

  const conflictColumns: ColumnDef<SyncConflict, any>[] = [
    {
      header: 'Conflict',
      id: 'conflict',
      cell: ({ row }) => {
        const items = row.original.payload.items.map((i) => {
          const product = productById.get(i.productId);
          return `${i.quantity}× ${product?.name ?? i.productId}`;
        });
        return (
          <div>
            <p className="font-bold text-slate-800 dark:text-slate-100">{row.original.reason}</p>
            <p className="text-[10px] text-slate-400">{items.join(', ')}</p>
          </div>
        );
      },
    },
    { header: 'Store', id: 'store', accessorFn: (c) => c.store.name },
    {
      header: 'Terminal',
      accessorKey: 'deviceId',
      cell: ({ getValue }) => <span className="text-[10px] font-mono text-slate-400">{getValue() as string}</span>,
    },
    {
      header: 'Detected',
      accessorKey: 'createdAt',
      cell: ({ getValue }) => <span className="text-slate-500 dark:text-slate-400">{formatDateTime(getValue() as string)}</span>,
    },
    {
      header: 'Status',
      accessorKey: 'status',
      cell: ({ getValue }) => {
        const status = getValue() as SyncConflictStatus;
        return (
          <Badge color={status === 'OPEN' ? 'red' : 'emerald'} dot pill>
            {status === 'OPEN' ? 'Open' : 'Resolved'}
          </Badge>
        );
      },
    },
    {
      header: 'Actions',
      id: 'actions',
      cell: ({ row }) =>
        row.original.status === 'OPEN' ? (
          <button
            onClick={() => openResolveDrawer(row.original)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold transition"
          >
            <CheckCircle2 className="w-3 h-3" /> Resolve
          </button>
        ) : (
          <span className="text-[10px] text-slate-400" title={row.original.resolutionNote ?? undefined}>
            by {row.original.resolvedBy}
          </span>
        ),
    },
  ];

  return (
    <div className="space-y-8">
      <GlassCard className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Offline Sync Status
            </h1>
            <Badge color="cyan" dot pill>
              {devices.length} Terminal{devices.length === 1 ? '' : 's'}
            </Badge>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Live view of every POS terminal&apos;s sync state and any offline sales that couldn&apos;t be honestly replayed —
            e.g. two terminals selling the last unit of the same SKU while offline.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={reload}
            className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 hover:border-cyan-500 transition shadow-sm"
          >
            <RefreshCw className="w-3.5 h-3.5 text-cyan-500" />
            <span>Refresh</span>
          </button>
        </div>
      </GlassCard>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard icon={RadioTower} label="Terminals Online" value={`${onlineCount} / ${devices.length}`} delta="Last 90s" deltaTone="neutral" color="cyan" />
        <KpiCard
          icon={Clock}
          label="Sales Awaiting Sync"
          value={`${totalPending}`}
          delta={totalPending > 0 ? 'Queued offline' : 'All caught up'}
          deltaTone={totalPending > 0 ? 'negative' : 'positive'}
          color="amber"
        />
        <KpiCard
          icon={AlertTriangle}
          label="Open Conflicts"
          value={`${openConflictCount}`}
          delta={openConflictCount > 0 ? 'Needs review' : 'Clear'}
          deltaTone={openConflictCount > 0 ? 'negative' : 'positive'}
          color="red"
        />
      </div>

      <GlassCard>
        <div className="mb-4">
          <h2 className="text-sm font-extrabold text-slate-800 dark:text-slate-100">Terminals</h2>
        </div>
        <DataTable columns={deviceColumns} data={devices} loading={loading} emptyTitle="No terminals seen yet" emptyDescription="A terminal shows up here after its first heartbeat or sync." pageSize={8} />
      </GlassCard>

      <GlassCard>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-extrabold text-slate-800 dark:text-slate-100">Sync Conflicts</h2>
          <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as SyncConflictStatus | 'ALL')} options={statusFilterOptions} />
        </div>
        <DataTable
          columns={conflictColumns}
          data={conflicts}
          loading={loading}
          emptyTitle="No conflicts"
          emptyDescription="Offline sales that couldn't be honestly replayed will appear here."
          pageSize={8}
        />
      </GlassCard>

      <Drawer
        open={!!activeConflict}
        onClose={() => setActiveConflict(null)}
        title="Resolve Sync Conflict"
        subtitle={activeConflict?.reason}
        footer={
          <>
            <button
              type="button"
              onClick={() => setActiveConflict(null)}
              className="px-4 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs"
            >
              Cancel
            </button>
            <button
              form="resolve-conflict-form"
              type="submit"
              disabled={resolving || !note.trim()}
              className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-lg shadow-emerald-500/25 disabled:opacity-50"
            >
              {resolving ? 'Resolving…' : 'Mark Resolved'}
            </button>
          </>
        }
      >
        {activeConflict && (
          <form id="resolve-conflict-form" onSubmit={handleResolve} className="space-y-4">
            <div className="p-3 rounded-2xl bg-red-500/5 border border-red-500/20 space-y-1">
              <p className="text-xs font-bold text-slate-800 dark:text-slate-100">{activeConflict.reason}</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {activeConflict.payload.items
                  .map((i) => `${i.quantity}× ${productById.get(i.productId)?.name ?? i.productId}`)
                  .join(', ')}
              </p>
              <p className="text-[10px] text-slate-400 font-mono">Terminal {activeConflict.deviceId} &middot; {activeConflict.store.name}</p>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                Resolution note
              </label>
              <textarea
                required
                rows={4}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. Restocked from warehouse transfer; voided the duplicate sale at the register."
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500/40"
              />
            </div>
          </form>
        )}
      </Drawer>
    </div>
  );
}
