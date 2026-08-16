import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { tenantOperationsLinks, superAdminLinks, publicLinks } from '../../constants/nav';

export default function SearchModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [query, setQuery] = useState('');
  const navigate = useNavigate();

  const allLinks = useMemo(() => [...tenantOperationsLinks, ...superAdminLinks, ...publicLinks], []);
  const results = useMemo(
    () => allLinks.filter((l) => l.label.toLowerCase().includes(query.toLowerCase())).slice(0, 8),
    [allLinks, query],
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-start justify-center pt-24 p-4" onClick={onClose}>
      <div
        className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-lg shadow-2xl border border-slate-200 dark:border-slate-800 animate-scale-in overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-200 dark:border-slate-800">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search tenants, invoices, products..."
            className="flex-1 bg-transparent outline-none text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
          />
          <kbd className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-mono text-slate-500 dark:text-slate-400 font-semibold border border-slate-300 dark:border-slate-700">
            ESC
          </kbd>
        </div>
        <div className="max-h-80 overflow-y-auto p-2">
          {results.length === 0 && <p className="px-3 py-6 text-center text-xs text-slate-400">No matches found.</p>}
          {results.map((link) => (
            <button
              key={link.href}
              onClick={() => {
                navigate(link.href);
                onClose();
                setQuery('');
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-left text-xs font-semibold text-slate-700 dark:text-slate-200"
            >
              <link.icon className={`w-4 h-4 ${link.color}`} />
              {link.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
