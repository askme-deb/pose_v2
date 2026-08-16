import { ReactNode, useEffect, useRef, useState } from 'react';
import { cn } from '../utils/cn';

export interface DropdownMenuProps {
  trigger: (opts: { open: boolean; toggle: () => void }) => ReactNode;
  children: ReactNode;
  align?: 'left' | 'right';
  width?: string;
}

export default function DropdownMenu({ trigger, children, align = 'left', width = 'w-56' }: DropdownMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      {trigger({ open, toggle: () => setOpen((v) => !v) })}
      {open && (
        <div
          onClick={() => setOpen(false)}
          className={cn(
            'absolute top-full mt-2 glass-card bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-2 z-50 space-y-0.5 animate-scale-in',
            align === 'right' ? 'right-0' : 'left-0',
            width,
          )}
        >
          {children}
        </div>
      )}
    </div>
  );
}

export function DropdownMenuItem({
  icon,
  children,
  className,
  ...props
}: { icon?: ReactNode; children: ReactNode } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={cn(
        'w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-left text-xs font-semibold',
        className,
      )}
      {...props}
    >
      {icon}
      {children}
    </button>
  );
}
