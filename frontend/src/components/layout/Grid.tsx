import React from 'react';
import { clsx } from 'clsx';

export interface GridProps extends React.HTMLAttributes<HTMLDivElement> {
  cols?: 1 | 2 | 3 | 4 | 5 | 6 | 12;
  gap?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  responsive?: {
    sm?: 1 | 2 | 3 | 4 | 5 | 6 | 12;
    md?: 1 | 2 | 3 | 4 | 5 | 6 | 12;
    lg?: 1 | 2 | 3 | 4 | 5 | 6 | 12;
    xl?: 1 | 2 | 3 | 4 | 5 | 6 | 12;
  };
}

export interface GridItemProps extends React.HTMLAttributes<HTMLDivElement> {
  span?: 1 | 2 | 3 | 4 | 5 | 6 | 12;
  responsive?: {
    sm?: 1 | 2 | 3 | 4 | 5 | 6 | 12;
    md?: 1 | 2 | 3 | 4 | 5 | 6 | 12;
    lg?: 1 | 2 | 3 | 4 | 5 | 6 | 12;
    xl?: 1 | 2 | 3 | 4 | 5 | 6 | 12;
  };
}

const Grid = React.forwardRef<HTMLDivElement, GridProps>(
  ({ className, cols = 1, gap = 'md', responsive, children, ...props }, ref) => {
    const gapClasses = {
      none: 'gap-0',
      sm: 'gap-2',
      md: 'gap-4',
      lg: 'gap-6',
      xl: 'gap-8',
    };

    const colClasses = {
      1: 'grid-cols-1',
      2: 'grid-cols-2',
      3: 'grid-cols-3',
      4: 'grid-cols-4',
      5: 'grid-cols-5',
      6: 'grid-cols-6',
      12: 'grid-cols-12',
    };

    const responsiveClasses = responsive ? {
      [`sm:${colClasses[responsive.sm!]}`]: responsive.sm,
      [`md:${colClasses[responsive.md!]}`]: responsive.md,
      [`lg:${colClasses[responsive.lg!]}`]: responsive.lg,
      [`xl:${colClasses[responsive.xl!]}`]: responsive.xl,
    } : {};

    const gridClasses = clsx(
      'grid',
      colClasses[cols],
      gapClasses[gap],
      responsiveClasses,
      className
    );

    return (
      <div ref={ref} className={gridClasses} {...props}>
        {children}
      </div>
    );
  }
);

const GridItem = React.forwardRef<HTMLDivElement, GridItemProps>(
  ({ className, span = 1, responsive, children, ...props }, ref) => {
    const spanClasses = {
      1: 'col-span-1',
      2: 'col-span-2',
      3: 'col-span-3',
      4: 'col-span-4',
      5: 'col-span-5',
      6: 'col-span-6',
      12: 'col-span-12',
    };

    const responsiveClasses = responsive ? {
      [`sm:${spanClasses[responsive.sm!]}`]: responsive.sm,
      [`md:${spanClasses[responsive.md!]}`]: responsive.md,
      [`lg:${spanClasses[responsive.lg!]}`]: responsive.lg,
      [`xl:${spanClasses[responsive.xl!]}`]: responsive.xl,
    } : {};

    const itemClasses = clsx(
      spanClasses[span],
      responsiveClasses,
      className
    );

    return (
      <div ref={ref} className={itemClasses} {...props}>
        {children}
      </div>
    );
  }
);

Grid.displayName = 'Grid';
GridItem.displayName = 'GridItem';

export { Grid, GridItem };