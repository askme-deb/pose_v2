import { InputHTMLAttributes, forwardRef } from 'react';
import { cn } from '../utils/cn';
import { FieldError, FieldLabel, type FieldLabelProps, fieldControlClass, fieldWrapperClass } from './fieldStyles';
import DateField from './DateField';

// Re-exported so existing `import … from './Input'` keeps working.
export { FieldError, FieldLabel, fieldControlClass, fieldLabelClass, fieldWrapperClass } from './fieldStyles';
export type { FieldLabelProps } from './fieldStyles';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement>, FieldLabelProps {}

const Input = forwardRef<HTMLInputElement, InputProps>(({ label, required, error, hint, className, id, ...props }, ref) => {
  // Dates use a calendar picker instead of the browser's native date control.
  if (props.type === 'date') {
    return (
      <DateField
        label={label}
        error={error}
        hint={hint}
        className={className}
        id={id}
        name={props.name}
        value={props.value == null ? undefined : String(props.value)}
        onChange={props.onChange}
        min={props.min == null ? undefined : String(props.min)}
        max={props.max == null ? undefined : String(props.max)}
        placeholder={props.placeholder}
        disabled={props.disabled}
      />
    );
  }
  return (
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
  );
});
Input.displayName = 'Input';

export default Input;
