import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X } from 'lucide-react';
import { tenantOperationsLinks, superAdminLinks, publicLinks } from '../../constants/nav';

export default function SearchModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [query, setQuery] = useState('');
  const navigate = useNavigate();

  const allLinks = useMemo(() => [...tenantOperationsLinks, ...superAdminLinks, ...publicLinks], []);
  const results = useMemo(
    () => allLinks.filter((l) => l.label.toLowerCase().includes(query.toLowerCase())).slice(0, 8),
    [allLinks, query],
  );

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl h-full overflow-y-auto flex flex-col animate-fade-in">
        <div className="sticky top-0 z-10 flex items-center gap-3 px-6 py-5 border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
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
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 px-3 py-3 space-y-1 overflow-y-auto">
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
