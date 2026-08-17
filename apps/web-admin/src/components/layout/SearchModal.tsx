import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, Package, Users, Receipt, Loader2 } from 'lucide-react';
import { tenantOperationsLinks, superAdminLinks, publicLinks } from '../../constants/nav';
import { search, type SearchResults } from '../../services/api/search';
import { formatINR } from '../../utils/format';

const emptyResults: SearchResults = { products: [], customers: [], invoices: [] };

export default function SearchModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [query, setQuery] = useState('');
  const [entityResults, setEntityResults] = useState<SearchResults>(emptyResults);
  const [searching, setSearching] = useState(false);
  const navigate = useNavigate();

  const allLinks = useMemo(() => [...tenantOperationsLinks, ...superAdminLinks, ...publicLinks], []);
  const results = useMemo(
    () => allLinks.filter((l) => l.label.toLowerCase().includes(query.toLowerCase())).slice(0, 8),
    [allLinks, query],
  );

  // Debounced real search — the nav-link filter above stays instant since
  // it's just an in-memory array; hitting the real backend on every
  // keystroke would be wasteful and racy.
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setEntityResults(emptyResults);
      setSearching(false);
      return;
    }
    setSearching(true);
    const timer = setTimeout(() => {
      search(q)
        .then(setEntityResults)
        .catch(() => setEntityResults(emptyResults))
        .finally(() => setSearching(false));
    }, 250);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  function goTo(path: string) {
    navigate(path);
    onClose();
    setQuery('');
  }

  const hasEntityResults =
    entityResults.products.length > 0 || entityResults.customers.length > 0 || entityResults.invoices.length > 0;

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
          {searching ? (
            <Loader2 className="w-3.5 h-3.5 text-slate-400 animate-spin shrink-0" />
          ) : (
            <kbd className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-mono text-slate-500 dark:text-slate-400 font-semibold border border-slate-300 dark:border-slate-700">
              ESC
            </kbd>
          )}
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 px-3 py-3 space-y-4 overflow-y-auto">
          {hasEntityResults && (
            <div className="space-y-3">
              {entityResults.products.length > 0 && (
                <div className="space-y-0.5">
                  <p className="px-3 pb-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Products</p>
                  {entityResults.products.map((p) => (
                    <button
                      key={p._id}
                      onClick={() => goTo('/inventory/products')}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-left text-xs font-semibold text-slate-700 dark:text-slate-200"
                    >
                      <Package className="w-4 h-4 text-indigo-600 shrink-0" />
                      <span className="flex-1 truncate">{p.name}</span>
                      <span className="text-slate-400 font-mono text-[11px]">{p.sku}</span>
                    </button>
                  ))}
                </div>
              )}
              {entityResults.customers.length > 0 && (
                <div className="space-y-0.5">
                  <p className="px-3 pb-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Customers</p>
                  {entityResults.customers.map((c) => (
                    <button
                      key={c._id}
                      onClick={() => goTo('/crm/customers')}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-left text-xs font-semibold text-slate-700 dark:text-slate-200"
                    >
                      <Users className="w-4 h-4 text-pink-600 shrink-0" />
                      <span className="flex-1 truncate">{c.name}</span>
                      <span className="text-slate-400 text-[11px]">{c.email || c.phone || ''}</span>
                    </button>
                  ))}
                </div>
              )}
              {entityResults.invoices.length > 0 && (
                <div className="space-y-0.5">
                  <p className="px-3 pb-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Invoices</p>
                  {entityResults.invoices.map((inv) => (
                    <button
                      key={inv._id}
                      onClick={() => goTo('/sales/invoices')}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-left text-xs font-semibold text-slate-700 dark:text-slate-200"
                    >
                      <Receipt className="w-4 h-4 text-blue-600 shrink-0" />
                      <span className="flex-1 truncate">{inv.invoiceNumber} &middot; {inv.customerName}</span>
                      <span className="text-slate-400 font-mono text-[11px]">{formatINR(inv.total)}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {results.length === 0 && !hasEntityResults && (
            <p className="px-3 py-6 text-center text-xs text-slate-400">No matches found.</p>
          )}
          {results.length > 0 && (
            <div className="space-y-0.5">
              {hasEntityResults && (
                <p className="px-3 pb-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Pages</p>
              )}
              {results.map((link) => (
                <button
                  key={link.href}
                  onClick={() => goTo(link.href)}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-left text-xs font-semibold text-slate-700 dark:text-slate-200"
                >
                  <link.icon className={`w-4 h-4 ${link.color}`} />
                  {link.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
