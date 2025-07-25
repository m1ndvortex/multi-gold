import React from 'react';
import { clsx } from 'clsx';

export interface ContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  center?: boolean;
}

const Container = React.forwardRef<HTMLDivElement, ContainerProps>(
  ({ className, size = 'xl', padding = 'md', center = false, children, ...props }, ref) => {
    const sizeClasses = {
      sm: 'max-w-sm',
      md: 'max-w-md',
      lg: 'max-w-4xl',
      xl: 'max-w-7xl',
      full: 'max-w-full',
    };

    const paddingClasses = {
      none: '',
      sm: 'px-4 py-2',
      md: 'px-6 py-4',
      lg: 'px-8 py-6',
    };

    const containerClasses = clsx(
      'w-full',
      sizeClasses[size],
      paddingClasses[padding],
      {
        'mx-auto': center,
      },
      className
    );

    return (
      <div ref={ref} className={containerClasses} {...props}>
        {children}
      </div>
    );
  }
);

Container.displayName = 'Container';

export default Container;