import { forwardRef, type SelectHTMLAttributes } from 'react';
import ReactSelect, { components, type DropdownIndicatorProps } from 'react-select';
import { ChevronDown } from 'lucide-react';
import { cn } from '../utils/cn';
import { FieldError, FieldLabel, type FieldLabelProps, fieldWrapperClass, syntheticChange } from './fieldStyles';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'value' | 'defaultValue' | 'size'>, FieldLabelProps {
  options: SelectOption[];
  placeholder?: string;
  value?: string | number | null;
  /** Same shape as a native select's: read the choice from e.target.value. */
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  /** Rounded pill look for filter bars. */
  compact?: boolean;
}

const DropdownIndicator = (props: DropdownIndicatorProps<SelectOption, false>) => (
  <components.DropdownIndicator {...props}>
    <ChevronDown className="w-3.5 h-3.5" />
  </components.DropdownIndicator>
);

/**
 * A searchable dropdown (react-select) that keeps the native select contract
 * the app already uses: a string `value`, and `onChange` receives an event
 * carrying the picked value on `e.target.value`.
 */
const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, required, error, hint, options, placeholder, className, value, onChange, disabled, name, id, compact, ...rest }, _ref) => {
    const current = options.find((o) => o.value === String(value ?? '')) ?? null;
    const ariaLabel = (rest as { 'aria-label'?: string })['aria-label'] ?? label;

    return (
      <div className={cn(fieldWrapperClass, className)}>
        <FieldLabel label={label} required={required} />
        <ReactSelect<SelectOption, false>
          inputId={id}
          name={name}
          aria-label={ariaLabel}
          options={options}
          value={current}
          placeholder={placeholder ?? 'Select…'}
          isDisabled={disabled}
          isSearchable
          isClearable={false}
          noOptionsMessage={() => 'No matches'}
          onChange={(opt) => onChange?.(syntheticChange<HTMLSelectElement>(opt?.value ?? '', name))}
          components={{ DropdownIndicator, IndicatorSeparator: null }}
          // Rendered in <body> so menus aren't clipped by drawers / scroll areas.
          menuPortalTarget={typeof document === 'undefined' ? undefined : document.body}
          menuPosition="fixed"
          styles={{
            menuPortal: (base) => ({ ...base, zIndex: 10000 }),
            menu: (base) => ({ ...base, width: 'max-content', minWidth: '100%', maxWidth: '24rem' }),
          }}
          unstyled
          classNames={{
            control: ({ isFocused, isDisabled }) =>
              cn(
                'min-h-[34px] w-full border bg-slate-100 dark:bg-slate-900 text-xs transition cursor-pointer',
                compact ? 'rounded-2xl px-1 font-semibold min-w-[9rem]' : 'rounded-xl px-0.5',
                isFocused ? 'ring-2 ring-blue-500 border-transparent' : error ? 'border-red-400' : 'border-slate-200 dark:border-slate-800',
                isDisabled && 'opacity-60 cursor-not-allowed',
              ),
            valueContainer: () => 'px-2 gap-1',
            singleValue: () => (compact ? 'text-slate-700 dark:text-slate-200' : 'text-slate-900 dark:text-slate-100'),
            placeholder: () => 'text-slate-400',
            input: () => 'text-slate-900 dark:text-slate-100',
            indicatorsContainer: () => 'pr-1.5',
            dropdownIndicator: ({ isFocused }) => cn('text-slate-400 transition', isFocused && 'text-blue-600 dark:text-blue-400'),
            menu: () => 'mt-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl p-2 text-xs animate-scale-in',
            menuList: () => 'max-h-60 space-y-0.5',
            option: ({ isFocused, isSelected }) =>
              cn(
                'px-3 py-2 rounded-xl cursor-pointer font-semibold transition-colors',
                isSelected
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/25'
                  : isFocused
                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white'
                    : 'text-slate-700 dark:text-slate-200',
              ),
            noOptionsMessage: () => 'px-3 py-2 text-slate-400 font-medium',
          }}
        />
        {hint && !error && <p className="text-[11px] text-slate-400">{hint}</p>}
        <FieldError error={error} />
      </div>
    );
  },
);
Select.displayName = 'Select';

export default Select;
