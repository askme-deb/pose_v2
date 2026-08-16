import { HTMLAttributes } from 'react';
import { cn } from '../utils/cn';

export type BadgeColor = 'blue' | 'emerald' | 'amber' | 'red' | 'purple' | 'cyan' | 'slate' | 'pink' | 'teal';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  color?: BadgeColor;
  dot?: boolean;
  pill?: boolean;
}

const colorClasses: Record<BadgeColor, string> = {
  blue: 'bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400 border-blue-500/20',
  emerald: 'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 border-emerald-500/20',
  amber: 'bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400 border-amber-500/20',
  red: 'bg-red-500/10 text-red-600 dark:bg-red-500/20 dark:text-red-400 border-red-500/20',
  purple: 'bg-purple-500/10 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400 border-purple-500/20',
  cyan: 'bg-cyan-500/10 text-cyan-600 dark:bg-cyan-500/20 dark:text-cyan-400 border-cyan-500/20',
  slate: 'bg-slate-500/10 text-slate-600 dark:bg-slate-500/20 dark:text-slate-400 border-slate-500/20',
  pink: 'bg-pink-500/10 text-pink-600 dark:bg-pink-500/20 dark:text-pink-400 border-pink-500/20',
  teal: 'bg-teal-500/10 text-teal-600 dark:bg-teal-500/20 dark:text-teal-400 border-teal-500/20',
};

const dotColorClasses: Record<BadgeColor, string> = {
  blue: 'bg-blue-500',
  emerald: 'bg-emerald-500',
  amber: 'bg-amber-500',
  red: 'bg-red-500',
  purple: 'bg-purple-500',
  cyan: 'bg-cyan-500',
  slate: 'bg-slate-500',
  pink: 'bg-pink-500',
  teal: 'bg-teal-500',
};

export default function Badge({ color = 'slate', dot, pill, className, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 border font-extrabold uppercase tracking-wider',
        pill ? 'px-2.5 py-0.5 rounded-full text-[10px]' : 'px-2 py-0.5 rounded-md text-[10px]',
        colorClasses[color],
        className,
      )}
      {...props}
    >
      {dot && <span className={cn('w-1.5 h-1.5 rounded-full', dotColorClasses[color])} />}
      {children}
    </span>
  );
}
