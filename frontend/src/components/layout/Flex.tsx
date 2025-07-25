import React from 'react';
import { clsx } from 'clsx';
import { useTranslation } from 'react-i18next';

export interface FlexProps extends React.HTMLAttributes<HTMLDivElement> {
  direction?: 'row' | 'row-reverse' | 'col' | 'col-reverse';
  align?: 'start' | 'center' | 'end' | 'stretch' | 'baseline';
  justify?: 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly';
  wrap?: 'nowrap' | 'wrap' | 'wrap-reverse';
  gap?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  rtlAware?: boolean;
}

const Flex = React.forwardRef<HTMLDivElement, FlexProps>(
  (
    {
      className,
      direction = 'row',
      align = 'start',
      justify = 'start',
      wrap = 'nowrap',
      gap = 'none',
      rtlAware = true,
      children,
      ...props
    },
    ref
  ) => {
    const { i18n } = useTranslation();

    const directionClasses = {
      row: 'flex-row',
      'row-reverse': 'flex-row-reverse',
      col: 'flex-col',
      'col-reverse': 'flex-col-reverse',
    };

    const alignClasses = {
      start: 'items-start',
      center: 'items-center',
      end: 'items-end',
      stretch: 'items-stretch',
      baseline: 'items-baseline',
    };

    const justifyClasses = {
      start: 'justify-start',
      center: 'justify-center',
      end: 'justify-end',
      between: 'justify-between',
      around: 'justify-around',
      evenly: 'justify-evenly',
    };

    const wrapClasses = {
      nowrap: 'flex-nowrap',
      wrap: 'flex-wrap',
      'wrap-reverse': 'flex-wrap-reverse',
    };

    const gapClasses = {
      none: 'gap-0',
      sm: 'gap-2',
      md: 'gap-4',
      lg: 'gap-6',
      xl: 'gap-8',
    };

    // Handle RTL-aware direction
    let finalDirection = direction;
    if (rtlAware && i18n.language === 'fa') {
      if (direction === 'row') {
        finalDirection = 'row-reverse';
      } else if (direction === 'row-reverse') {
        finalDirection = 'row';
      }
    }

    const flexClasses = clsx(
      'flex',
      directionClasses[finalDirection],
      alignClasses[align],
      justifyClasses[justify],
      wrapClasses[wrap],
      gapClasses[gap],
      className
    );

    return (
      <div ref={ref} className={flexClasses} {...props}>
        {children}
      </div>
    );
  }
);

Flex.displayName = 'Flex';

export default Flex;