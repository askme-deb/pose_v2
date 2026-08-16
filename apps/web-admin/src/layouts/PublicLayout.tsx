import { Outlet, Link } from 'react-router-dom';
import { Moon, Sun } from 'lucide-react';
import logo from '../assets/logo.svg';
import { useThemeStore } from '../store/useThemeStore';

export default function PublicLayout() {
  const { dark, toggleTheme } = useThemeStore();

  return (
    <div className="relative min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 overflow-hidden">
      <div className="pointer-events-none fixed inset-0 bg-gradient-glow" />

      <header className="relative z-10 flex items-center justify-between px-4 lg:px-8 py-4">
        <Link to="/" className="flex items-center gap-2.5 group">
          <img src={logo} alt="ApexPOS Logo" className="h-8 group-hover:scale-105 transition-transform" />
        </Link>
        <div className="flex items-center gap-3">
          <button
            onClick={toggleTheme}
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 transition"
          >
            {dark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-600" />}
          </button>
          <Link
            to="/"
            className="text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition"
          >
            Back to Website
          </Link>
        </div>
      </header>

      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-8">
        <Outlet />
      </main>

      <footer className="relative z-10 text-center text-[11px] text-slate-400 py-6">
        © {new Date().getFullYear()} ApexPOS Enterprise. All rights reserved.
      </footer>
    </div>
  );
}
