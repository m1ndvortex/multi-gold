import React from 'react';
import { clsx } from 'clsx';
import { useTranslation } from 'react-i18next';
import { rtlClass } from '@/utils/rtl';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      loading = false,
      icon,
      iconPosition = 'left',
      fullWidth = false,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const { i18n } = useTranslation();
    const rtl = rtlClass(i18n.language as 'fa' | 'en');

    const baseClasses = clsx(
      'inline-flex items-center justify-center rounded-md font-medium transition-colors',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
      'disabled:pointer-events-none disabled:opacity-50',
      {
        'w-full': fullWidth,
        'cursor-not-allowed': disabled || loading,
      }
    );

    const variantClasses = {
      primary: 'bg-primary-600 text-white hover:bg-primary-700 focus-visible:ring-primary-500',
      secondary: 'bg-gray-100 text-gray-900 hover:bg-gray-200 focus-visible:ring-gray-500',
      outline: 'border border-gray-300 bg-transparent hover:bg-gray-50 focus-visible:ring-gray-500',
      ghost: 'hover:bg-gray-100 focus-visible:ring-gray-500',
      danger: 'bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500',
    };

    const sizeClasses = {
      sm: 'h-8 px-3 text-sm',
      md: 'h-10 px-4 text-sm',
      lg: 'h-12 px-6 text-base',
    };

    const iconClasses = clsx({
      [rtl.transform()]: i18n.language === 'fa' && icon,
    });

    const contentOrder = i18n.language === 'fa' ? 'flex-row-reverse' : 'flex-row';

    return (
      <button
        className={clsx(
          baseClasses,
          variantClasses[variant],
          sizeClasses[size],
          contentOrder,
          className
        )}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading && (
          <div className={clsx('spinner', rtl.mr('2'))}>
            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        
        {icon && iconPosition === 'left' && !loading && (
          <span className={clsx(iconClasses, rtl.mr('2'))}>
            {icon}
          </span>
        )}
        
        {children}
        
        {icon && iconPosition === 'right' && !loading && (
          <span className={clsx(iconClasses, rtl.ml('2'))}>
            {icon}
          </span>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';

export default Button;