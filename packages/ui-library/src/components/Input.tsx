import { InputHTMLAttributes, forwardRef } from 'react';
import { cn } from '../utils/cn';

export interface FieldLabelProps {
  label?: string;
  required?: boolean;
  error?: string;
  hint?: string;
}

export const fieldWrapperClass = 'space-y-1.5';
export const fieldLabelClass = 'block text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400';
export const fieldControlClass =
  'w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-slate-400 transition';

export function FieldLabel({ label, required }: FieldLabelProps) {
  if (!label) return null;
  return (
    <label className={fieldLabelClass}>
      {label} {required && <span className="text-red-500">*</span>}
    </label>
  );
}

export function FieldError({ error }: { error?: string }) {
  if (!error) return null;
  return <p className="text-[11px] font-semibold text-red-500">{error}</p>;
}

export interface InputProps extends InputHTMLAttributes<HTMLInputElement>, FieldLabelProps {}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, required, error, hint, className, id, ...props }, ref) => (
    <div className={fieldWrapperClass}>
      <FieldLabel label={label} required={required} />
      <input
        ref={ref}
        id={id}
        className={cn(fieldControlClass, error && 'border-red-400 focus:ring-red-400', className)}
        {...props}
      />
      {hint && !error && <p className="text-[11px] text-slate-400">{hint}</p>}
      <FieldError error={error} />
    </div>
  ),
);
Input.displayName = 'Input';

export default Input;
