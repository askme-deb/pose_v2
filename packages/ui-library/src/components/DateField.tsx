import { forwardRef } from 'react';
import DatePicker from 'react-datepicker';
import { Calendar } from 'lucide-react';
import 'react-datepicker/dist/react-datepicker.css';
import '../styles/pickers.css';
import { cn } from '../utils/cn';
import { FieldError, FieldLabel, type FieldLabelProps, fieldControlClass, fieldWrapperClass, syntheticChange } from './fieldStyles';

export interface DateFieldProps extends FieldLabelProps {
  /** YYYY-MM-DD, or '' for no date: the same value a native date input uses. */
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  /** YYYY-MM-DD bounds. */
  min?: string;
  max?: string;
  placeholder?: string;
  disabled?: boolean;
  name?: string;
  id?: string;
  className?: string;
  /** Borderless, label-less variant for toolbars / pill containers. */
  bare?: boolean;
}

const pad = (n: number) => String(n).padStart(2, '0');

/** YYYY-MM-DD to a local-midnight Date (never via UTC, so the day can't shift). */
export function parseDateValue(value?: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value ?? '');
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(d.getTime()) ? null : d;
}
export const formatDateValue = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

const DateField = forwardRef<HTMLDivElement, DateFieldProps>(
  ({ label, required, error, hint, value, onChange, min, max, placeholder, disabled, name, id, className, bare }, ref) => {
    const picker = (
      <DatePicker
        id={id}
        name={name}
        selected={parseDateValue(value)}
        onChange={(d: Date | null) => onChange?.(syntheticChange<HTMLInputElement>(d ? formatDateValue(d) : '', name))}
        minDate={parseDateValue(min) ?? undefined}
        maxDate={parseDateValue(max) ?? undefined}
        dateFormat="dd MMM yyyy"
        placeholderText={placeholder ?? 'Select date'}
        disabled={disabled}
        autoComplete="off"
        showMonthDropdown
        showYearDropdown
        dropdownMode="select"
        isClearable={!required && !disabled && !!value}
        portalId="pospe-picker-portal"
        popperPlacement="bottom-start"
        wrapperClassName="w-full"
        className={
          bare
            ? cn('bg-transparent text-slate-700 dark:text-slate-200 font-semibold outline-none text-xs w-28', className)
            : cn(fieldControlClass, 'cursor-pointer pr-9', error && 'border-red-400 focus:ring-red-400', className)
        }
      />
    );

    if (bare) return <div ref={ref}>{picker}</div>;
    return (
      <div ref={ref} className={fieldWrapperClass}>
        <FieldLabel label={label} required={required} />
        <div className="relative">
          {picker}
          <Calendar className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
        </div>
        {hint && !error && <p className="text-[11px] text-slate-400">{hint}</p>}
        <FieldError error={error} />
      </div>
    );
  },
);
DateField.displayName = 'DateField';

export default DateField;
