import { cn } from '../utils/cn';

export interface PillTabOption {
  value: string;
  label: string;
}

export interface PillTabsProps {
  options: PillTabOption[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export default function PillTabs({ options, value, onChange, className }: PillTabsProps) {
  return (
    <div
      className={cn(
        'inline-flex items-center gap-1 bg-slate-100 dark:bg-slate-900/90 p-1 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs font-semibold',
        className,
      )}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={cn(
              'px-3 py-1.5 rounded-xl transition',
              active
                ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-500/20'
                : 'hover:text-blue-600 text-slate-500 dark:text-slate-400',
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
