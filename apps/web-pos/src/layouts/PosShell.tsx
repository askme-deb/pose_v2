import { Outlet, Link, useNavigate } from 'react-router-dom';
import { Sun, Moon, PauseCircle, X, LogOut } from 'lucide-react';
import { Avatar, Badge } from '@pospe/ui-library';
import logo from '../assets/logo.svg';
import { useThemeStore } from '../store/useThemeStore';
import { usePosSessionStore } from '../store/usePosSessionStore';
import { useCartStore } from '../store/useCartStore';

export default function PosShell() {
  const { dark, toggleTheme } = useThemeStore();
  const { session, logout } = usePosSessionStore();
  const { clearCart, heldBills, items } = useCartStore();
  const navigate = useNavigate();

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
    </div>
  );
}
