import { useEffect, useState } from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { Sun, Moon, PauseCircle, X, LogOut, WifiOff, RefreshCw, AlertTriangle } from 'lucide-react';
import { Avatar, Badge, Drawer, EmptyState, useToast } from '@pospe/ui-library';
import logo from '../assets/logo.svg';
import { useThemeStore } from '../store/useThemeStore';
import { usePosSessionStore } from '../store/usePosSessionStore';
import { useCartStore } from '../store/useCartStore';
import { useSyncStatusStore } from '../store/useSyncStatusStore';
import { runSync, startAutoSync } from '../sync/syncEngine';
import { listPendingSales, retrySale, type PendingSale } from '../offline/posDB';
import { formatDateTime } from '../utils/format';

export default function PosShell() {
  const { dark, toggleTheme } = useThemeStore();
  const { session, logout } = usePosSessionStore();
  const { clearCart, heldBills, items } = useCartStore();
  const { online, pendingCount, failedCount, setOnline, refreshCounts } = useSyncStatusStore();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [syncIssuesOpen, setSyncIssuesOpen] = useState(false);
  const [failedSales, setFailedSales] = useState<PendingSale[]>([]);

  async function refreshFailedSales() {
    const sales = await listPendingSales();
    setFailedSales(sales.filter((s) => s.status === 'failed'));
  }

  useEffect(() => {
    refreshCounts();
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    const stopAutoSync = startAutoSync((result) => {
      refreshCounts();
      if (result.synced > 0) showToast(`Synced ${result.synced} offline sale${result.synced === 1 ? '' : 's'}`, 'success');
      if (result.failed > 0) {
        showToast(`${result.failed} offline sale${result.failed === 1 ? '' : 's'} need attention`, 'danger');
        refreshFailedSales();
      }
    });
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      stopAutoSync();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleManualSync() {
    const result = await runSync();
    await refreshCounts();
    if (result.synced > 0) showToast(`Synced ${result.synced} offline sale${result.synced === 1 ? '' : 's'}`, 'success');
    else if (result.failed === 0) showToast('Nothing to sync', 'info');
  }

  async function handleOpenSyncIssues() {
    await refreshFailedSales();
    setSyncIssuesOpen(true);
  }

  async function handleRetry(id: string) {
    await retrySale(id);
    await refreshFailedSales();
    await refreshCounts();
    if (online) await handleManualSync();
  }

  return (
    <div className="flex flex-col h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 overflow-hidden">
      <header className="glass-panel border-b border-slate-200/80 dark:border-slate-800/80 shadow-md shrink-0">
        <div className="px-4 lg:px-6 py-2.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link to="/pos" className="flex items-center gap-2 group">
              <img src={logo} alt="ApexPOS Logo" className="h-7 group-hover:scale-105 transition-transform" />
            </Link>
            <div className="hidden sm:flex items-center gap-2 pl-3 border-l border-slate-200 dark:border-slate-800 text-xs">
              <Badge color="blue" pill>Register 02</Badge>
              <span className="text-slate-500 dark:text-slate-400 font-semibold">
                {session?.cashierName ?? 'Cashier'} &middot; {session?.shiftLabel ?? 'Shift A'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!online && (
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-500/10 text-red-600 dark:text-red-400 text-xs font-bold">
                <WifiOff className="w-3.5 h-3.5" />
                Offline
              </span>
            )}
            {failedCount > 0 && (
              <button
                onClick={handleOpenSyncIssues}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-500/10 text-red-600 dark:text-red-400 text-xs font-bold hover:bg-red-500/20 transition"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                {failedCount} Sync Issue{failedCount === 1 ? '' : 's'}
              </button>
            )}
            {pendingCount > 0 && (
              <button
                onClick={handleManualSync}
                disabled={!online}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-bold hover:bg-amber-500/20 transition disabled:opacity-50 disabled:pointer-events-none"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                {pendingCount} Pending Sync
              </button>
            )}
            <Link
              to="/pos/held-bills"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-bold hover:bg-amber-500/20 transition"
            >
              <PauseCircle className="w-3.5 h-3.5" />
              Held Bills
              {heldBills.length > 0 && <span className="ml-0.5 px-1.5 rounded-full bg-amber-500 text-white text-[10px]">{heldBills.length}</span>}
            </Link>
            <button
              onClick={clearCart}
              disabled={items.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 disabled:opacity-40 transition"
            >
              <X className="w-3.5 h-3.5" />
              Clear
            </button>
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 transition"
            >
              {dark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-600" />}
            </button>
            <button onClick={() => navigate('/settings')} className="pl-1">
              <Avatar name={session?.cashierName ?? 'Cashier'} size="sm" />
            </button>
            <button
              onClick={() => {
                logout();
                navigate('/login');
              }}
              className="p-2 rounded-xl bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500/20 transition"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-hidden p-3 lg:p-4">
        <Outlet />
      </main>

      <Drawer open={syncIssuesOpen} onClose={() => setSyncIssuesOpen(false)} title="Sync Issues" width="md">
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {failedSales.length === 0 && (
            <EmptyState icon={AlertTriangle} title="No sync issues" description="Offline sales that fail to sync will appear here." />
          )}
          {failedSales.map((sale) => (
            <div
              key={sale.id}
              className="p-3 rounded-2xl bg-red-500/5 dark:bg-red-500/10 border border-red-500/20 space-y-2"
            >
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-slate-800 dark:text-slate-100">
                  {sale.payload.items.length} item{sale.payload.items.length === 1 ? '' : 's'} &middot; {sale.payload.paymentMethod}
                </p>
                <span className="text-[10px] text-slate-400">{formatDateTime(sale.createdAt)}</span>
              </div>
              <p className="text-[11px] text-red-600 dark:text-red-400">{sale.error ?? 'Sync failed'}</p>
              <button
                onClick={() => handleRetry(sale.id)}
                className="w-full py-1.5 rounded-lg bg-blue-600 text-white font-bold text-[11px] hover:bg-blue-700 transition"
              >
                Retry
              </button>
            </div>
          ))}
        </div>
      </Drawer>
    </div>
  );
}
