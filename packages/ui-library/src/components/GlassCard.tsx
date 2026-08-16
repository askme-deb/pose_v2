import { HTMLAttributes } from 'react';
import { cn } from '../utils/cn';

export interface GlassCardProps extends HTMLAttributes<HTMLDivElement> {
  padding?: 'sm' | 'md' | 'lg';
}

const paddings = { sm: 'p-4 rounded-2xl', md: 'p-6 rounded-3xl', lg: 'p-8 rounded-3xl' };

export default function GlassCard({ padding = 'md', className, children, ...props }: GlassCardProps) {
  return (
    <div
      className={cn(
        'glass-card border border-slate-200/80 dark:border-slate-800',
        paddings[padding],
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
