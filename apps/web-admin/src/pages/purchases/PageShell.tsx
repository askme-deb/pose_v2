import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

interface PageShellProps {
  /** Where "Back" goes — also where Cancel returns to. */
  backTo: string;
  backLabel: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
  /** Sticky action bar at the bottom (Cancel / Save …). */
  footer?: ReactNode;
  /** Page width; forms stay narrow, tables get more room. */
  width?: 'md' | 'lg' | 'xl';
}

const widths = { md: 'max-w-2xl', lg: 'max-w-4xl', xl: 'max-w-5xl' };

/** Common frame for the dedicated purchasing pages (new PO, supplier, receive, return, ledger). */
export default function PageShell({ backTo, backLabel, title, subtitle, children, footer, width = 'lg' }: PageShellProps) {
  return (
    <div className={`space-y-6 mx-auto ${widths[width]}`}>
      <div>
        <Link to={backTo} className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-purple-600 mb-2">
          <ArrowLeft className="w-3.5 h-3.5" /> {backLabel}
        </Link>
        <h1 className="text-xl font-black text-slate-900 dark:text-white">{title}</h1>
        {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
      </div>
      {children}
      {footer && (
        <div className="sticky bottom-0 z-10 -mx-1 flex items-center justify-end gap-3 px-1 py-3 bg-gradient-to-t from-slate-50 dark:from-slate-950 via-slate-50/90 dark:via-slate-950/90 to-transparent">
          {footer}
        </div>
      )}
    </div>
  );
}

export const cancelButtonClass = 'px-5 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs';
export const primaryButtonClass = 'px-8 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-lg shadow-purple-500/25 disabled:opacity-50';
