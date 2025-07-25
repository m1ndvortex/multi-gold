import React from 'react';
import { clsx } from 'clsx';
import { useTranslation } from 'react-i18next';
import { rtlClass } from '@/utils/rtl';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      label,
      error,
      helperText,
      leftIcon,
      rightIcon,
      fullWidth = false,
      id,
      ...props
    },
    ref
  ) => {
    const { i18n } = useTranslation();
    const rtl = rtlClass(i18n.language as 'fa' | 'en');
    const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;

    const inputClasses = clsx(
      'flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm',
      'placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent',
      'disabled:cursor-not-allowed disabled:opacity-50',
      {
        'border-red-500 focus:ring-red-500': error,
        [rtl.pl('10')]: leftIcon && i18n.language === 'en',
        [rtl.pr('10')]: rightIcon && i18n.language === 'en',
        [rtl.pr('10')]: leftIcon && i18n.language === 'fa',
        [rtl.pl('10')]: rightIcon && i18n.language === 'fa',
      },
      className
    );

    const containerClasses = clsx('relative', {
      'w-full': fullWidth,
    });

    const iconClasses = clsx(
      'absolute top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none',
      'w-5 h-5'
    );

    const leftIconClasses = clsx(iconClasses, {
      [rtl.textLeft()]: true,
      'left-3': i18n.language === 'en',
      'right-3': i18n.language === 'fa',
    });

    const rightIconClasses = clsx(iconClasses, {
      [rtl.textRight()]: true,
      'right-3': i18n.language === 'en',
      'left-3': i18n.language === 'fa',
    });

    return (
      <div className={clsx('space-y-2', { 'w-full': fullWidth })}>
        {label && (
          <label
            htmlFor={inputId}
            className={clsx(
              'block text-sm font-medium text-gray-700',
              rtl.textRight()
            )}
          >
            {label}
          </label>
        )}
        
        <div className={containerClasses}>
          {leftIcon && (
            <div className={leftIconClasses}>
              {leftIcon}
            </div>
          )}
          
          <input
            ref={ref}
            id={inputId}
            className={inputClasses}
            dir={i18n.language === 'fa' ? 'rtl' : 'ltr'}
            {...props}
          />
          
          {rightIcon && (
            <div className={rightIconClasses}>
              {rightIcon}
            </div>
          )}
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

Input.displayName = 'Input';

export default Input;