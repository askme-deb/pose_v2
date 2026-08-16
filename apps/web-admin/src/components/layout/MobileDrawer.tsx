import { Link, useNavigate } from 'react-router-dom';
import { X, LogOut } from 'lucide-react';
import { Avatar } from '@pospe/ui-library';
import logo from '../../assets/logo.svg';
import { tenantOperationsLinks, superAdminLinks, publicLinks } from '../../constants/nav';
import { useAuthStore } from '../../store/useAuthStore';

export default function MobileDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  if (!open) return null;

  const section = (title: string, links: typeof tenantOperationsLinks) => (
    <div className="space-y-1">
      <p className="px-2 text-[10px] font-bold uppercase text-slate-400">{title}</p>
      {links.map((link) => (
        <Link
          key={link.href}
          to={link.href}
          onClick={onClose}
          className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200"
        >
          <link.icon className={`w-4 h-4 ${link.color}`} />
          {link.label}
        </Link>
      ))}
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 md:hidden">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-y-0 left-0 w-80 max-w-[85vw] bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col justify-between p-5 overflow-y-auto animate-fade-in">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <img src={logo} alt="ApexPOS Logo" className="h-8" />
            <button onClick={onClose} className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              <X className="w-4 h-4" />
            </button>
          </div>
          {section('Tenant Operations', tenantOperationsLinks)}
          {section('Super Admin Portal', superAdminLinks)}
          {section('Public & Design', publicLinks)}
        </div>
        <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
          <div className="flex items-center gap-2.5">
            <Avatar name={user?.name ?? 'Guest User'} />
            <div>
              <p className="text-xs font-bold text-slate-900 dark:text-white">{user?.name ?? 'Guest User'}</p>
              <p className="text-[10px] text-slate-400">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={() => {
              logout();
              onClose();
              navigate('/login');
            }}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl bg-red-500/10 text-red-600 dark:text-red-400 text-xs font-bold"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
