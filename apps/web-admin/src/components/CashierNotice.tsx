import { useNavigate } from 'react-router-dom';
import { ShoppingCart } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { signOut } from '../services/api/client';

const POS_URL = (import.meta.env.VITE_POS_URL as string | undefined) ?? 'http://localhost:5174';

/**
 * Cashiers don't use the back office: its dashboards, reports, purchasing and
 * staff pages are business information the server refuses them anyway.
 */
export default function CashierNotice() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
      <div className="w-full max-w-md glass-card rounded-3xl border border-slate-200/80 dark:border-slate-800 p-8 text-center space-y-4">
        <ShoppingCart className="w-10 h-10 text-blue-600 mx-auto" />
        <h1 className="text-xl font-extrabold text-slate-900 dark:text-white">Hi {user?.name}, billing happens on the POS</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Cashier accounts use the POS terminal. The back office (sales reports, purchasing, stock and staff) is for
          managers and owners.
        </p>
        <a
          href={POS_URL}
          className="block w-full py-3 rounded-2xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700"
        >
          Open the POS
        </a>
        <button
          onClick={() => void signOut().then(() => navigate('/login'))}
          className="block w-full py-3 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm font-bold"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
