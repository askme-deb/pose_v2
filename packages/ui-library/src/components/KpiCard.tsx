import { LucideIcon } from 'lucide-react';
import { cn } from '../utils/cn';

export type KpiColor = 'blue' | 'indigo' | 'emerald' | 'purple' | 'amber' | 'cyan' | 'red';

export interface KpiCardProps {
  icon: LucideIcon;
  label: string;
  value: string;
  delta?: string;
  deltaTone?: 'positive' | 'negative' | 'neutral';
  color?: KpiColor;
}

const iconBg: Record<KpiColor, string> = {
  blue: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  indigo: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400',
  emerald: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  purple: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
  amber: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  cyan: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400',
  red: 'bg-red-500/10 text-red-600 dark:text-red-400',
};

const hoverBorder: Record<KpiColor, string> = {
  blue: 'hover:border-blue-500/50',
  indigo: 'hover:border-indigo-500/50',
  emerald: 'hover:border-emerald-500/50',
  purple: 'hover:border-purple-500/50',
  amber: 'hover:border-amber-500/50',
  cyan: 'hover:border-cyan-500/50',
  red: 'hover:border-red-500/50',
};

const deltaTone = {
  positive: 'text-emerald-600 dark:text-emerald-400',
  negative: 'text-red-600 dark:text-red-400',
  neutral: 'text-slate-400',
};

export default function KpiCard({ icon: Icon, label, value, delta, deltaTone: tone = 'positive', color = 'blue' }: KpiCardProps) {
  return (
    <div
      className={cn(
        'glass-card p-4 rounded-2xl relative overflow-hidden group transition duration-300 border border-slate-200/80 dark:border-slate-800',
        hoverBorder[color],
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <div className={cn('w-7 h-7 rounded-xl flex items-center justify-center', iconBg[color])}>
          <Icon className="w-3.5 h-3.5" />
        </div>
        {delta && <span className={cn('text-[10px] font-extrabold', deltaTone[tone])}>{delta}</span>}
      </div>
      <p className="text-[11px] font-bold uppercase text-slate-400 tracking-wide">{label}</p>
      <p className="text-xl font-black tracking-tight text-slate-900 dark:text-white mt-0.5">{value}</p>
    </div>
  );
}
