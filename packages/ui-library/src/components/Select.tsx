import { SelectHTMLAttributes, forwardRef } from 'react';
import { cn } from '../utils/cn';
import { FieldError, FieldLabel, FieldLabelProps, fieldControlClass, fieldWrapperClass } from './Input';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement>, FieldLabelProps {
  options: SelectOption[];
  placeholder?: string;
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, required, error, hint, options, placeholder, className, ...props }, ref) => (
    <div className={fieldWrapperClass}>
      <FieldLabel label={label} required={required} />
      <select
        ref={ref}
        className={cn(fieldControlClass, 'cursor-pointer', error && 'border-red-400 focus:ring-red-400', className)}
        {...props}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {hint && !error && <p className="text-[11px] text-slate-400">{hint}</p>}
      <FieldError error={error} />
    </div>
  ),
);
Select.displayName = 'Select';

export default Select;
