import { TextareaHTMLAttributes, forwardRef } from 'react';
import { cn } from '../utils/cn';
import { FieldError, FieldLabel, FieldLabelProps, fieldControlClass, fieldWrapperClass } from './Input';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement>, FieldLabelProps {}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, required, error, hint, className, rows = 3, ...props }, ref) => (
    <div className={fieldWrapperClass}>
      <FieldLabel label={label} required={required} />
      <textarea
        ref={ref}
        rows={rows}
        className={cn(fieldControlClass, 'resize-none', error && 'border-red-400 focus:ring-red-400', className)}
        {...props}
      />
      {hint && !error && <p className="text-[11px] text-slate-400">{hint}</p>}
      <FieldError error={error} />
    </div>
  ),
);
Textarea.displayName = 'Textarea';

export default Textarea;
