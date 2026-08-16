import { InputHTMLAttributes, forwardRef } from 'react';
import { cn } from '../utils/cn';

export interface CheckboxProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, className, id, ...props }, ref) => (
    <label htmlFor={id} className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer select-none">
      <input
        ref={ref}
        id={id}
        type="checkbox"
        className={cn(
          'w-4 h-4 rounded-md border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-900 text-blue-600 focus:ring-2 focus:ring-blue-500 cursor-pointer',
          className,
        )}
        {...props}
      />
      {label}
    </label>
  ),
);
Checkbox.displayName = 'Checkbox';

export default Checkbox;
