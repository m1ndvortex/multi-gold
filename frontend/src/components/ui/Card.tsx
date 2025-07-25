import React from 'react';
import { clsx } from 'clsx';
import { useTranslation } from 'react-i18next';
import { rtlClass } from '@/utils/rtl';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'outlined' | 'elevated';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export interface CardContentProps extends React.HTMLAttributes<HTMLDivElement> {}

export interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = 'default', padding = 'md', children, ...props }, ref) => {
    const baseClasses = clsx(
      'rounded-lg bg-white',
      {
        'border border-gray-200': variant === 'outlined',
        'shadow-sm': variant === 'default',
        'shadow-lg': variant === 'elevated',
        'p-0': padding === 'none',
        'p-4': padding === 'sm',
        'p-6': padding === 'md',
        'p-8': padding === 'lg',
      }
    );

    return (
      <div
        ref={ref}
        className={clsx(baseClasses, className)}
        {...props}
      >
        {children}
      </div>
    );
  }
);

const CardHeader = React.forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ className, title, subtitle, action, children, ...props }, ref) => {
    const { i18n } = useTranslation();
    const rtl = rtlClass(i18n.language as 'fa' | 'en');

    return (
      <div
        ref={ref}
        className={clsx(
          'flex items-center justify-between space-y-1.5 pb-4',
          i18n.language === 'fa' ? 'flex-row-reverse' : 'flex-row',
          className
        )}
        {...props}
      >
        <div className="space-y-1">
          {title && (
            <h3 className={clsx('text-lg font-semibold leading-none tracking-tight', rtl.textRight())}>
              {title}
            </h3>
          )}
          {subtitle && (
            <p className={clsx('text-sm text-gray-500', rtl.textRight())}>
              {subtitle}
            </p>
          )}
          {children}
        </div>
        {action && (
          <div className={clsx(rtl.ml('4'))}>
            {action}
          </div>
        )}
      </div>
    );
  }
);

const CardContent = React.forwardRef<HTMLDivElement, CardContentProps>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={clsx('text-sm', className)}
        {...props}
      />
    );
  }
);

const CardFooter = React.forwardRef<HTMLDivElement, CardFooterProps>(
  ({ className, ...props }, ref) => {
    const { i18n } = useTranslation();

    return (
      <div
        ref={ref}
        className={clsx(
          'flex items-center pt-4',
          i18n.language === 'fa' ? 'flex-row-reverse' : 'flex-row',
          className
        )}
        {...props}
      />
    );
  }
);

Card.displayName = 'Card';
CardHeader.displayName = 'CardHeader';
CardContent.displayName = 'CardContent';
CardFooter.displayName = 'CardFooter';

export { Card, CardHeader, CardContent, CardFooter };