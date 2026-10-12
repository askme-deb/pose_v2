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

/** A change event as a native control would send it, for components that wrap a non-native widget. */
export function syntheticChange<T extends HTMLElement>(value: string, name?: string): React.ChangeEvent<T> {
  const target = { value, name: name ?? '' } as unknown as EventTarget & T;
  return { target, currentTarget: target, type: 'change' } as unknown as React.ChangeEvent<T>;
}

export { cn };
