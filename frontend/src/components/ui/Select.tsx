import React from 'react';
import { clsx } from 'clsx';
import { useTranslation } from 'react-i18next';
import { ChevronDown } from 'lucide-react';
import { rtlClass } from '@/utils/rtl';

export interface SelectOption {
  value: string | number;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  label?: string;
  error?: string;
  helperText?: string;
  options: SelectOption[];
  placeholder?: string;
  fullWidth?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      className,
      label,
      error,
      helperText,
      options,
      placeholder,
      fullWidth = false,
      size = 'md',
      id,
      ...props
    },
    ref
  ) => {
    const { i18n } = useTranslation();
    const rtl = rtlClass(i18n.language as 'fa' | 'en');
    const selectId = id || `select-${Math.random().toString(36).substr(2, 9)}`;

    const sizeClasses = {
      sm: 'h-8 text-sm',
      md: 'h-10 text-sm',
      lg: 'h-12 text-base',
    };

    const selectClasses = clsx(
      'w-full rounded-md border border-gray-300 bg-white px-3 py-2',
      'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent',
      'disabled:cursor-not-allowed disabled:opacity-50',
      'appearance-none cursor-pointer',
      sizeClasses[size],
      {
        'border-red-500 focus:ring-red-500': error,
      },
      className
    );

    const containerClasses = clsx('relative', {
      'w-full': fullWidth,
    });

    const iconClasses = clsx(
      'absolute top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none',
      'w-5 h-5',
      {
        'right-3': i18n.language === 'en',
        'left-3': i18n.language === 'fa',
      }
    );

    return (
      <div className={clsx('space-y-2', { 'w-full': fullWidth })}>
        {label && (
          <label
            htmlFor={selectId}
            className={clsx(
              'block text-sm font-medium text-gray-700',
              rtl.textRight()
            )}
          >
            {label}
          </label>
        )}
        
        <div className={containerClasses}>
          <select
            ref={ref}
            id={selectId}
            className={selectClasses}
            dir={i18n.language === 'fa' ? 'rtl' : 'ltr'}
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((option) => (
              <option
                key={option.value}
                value={option.value}
                disabled={option.disabled}
              >
                {option.label}
              </option>
            ))}
          </select>
          
          <div className={iconClasses}>
            <ChevronDown className={clsx({
              [rtl.transform()]: i18n.language === 'fa'
            })} />
          </div>
        </div>
        
        {error && (
          <p className={clsx('text-sm text-red-600', rtl.textRight())}>
            {error}
          </p>
        )}
        
        {helperText && !error && (
          <p className={clsx('text-sm text-gray-500', rtl.textRight())}>
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';

export default Select;