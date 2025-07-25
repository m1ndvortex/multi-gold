import React from 'react';
import { clsx } from 'clsx';
import { useTranslation } from 'react-i18next';
import { rtlClass } from '@/utils/rtl';

export interface Column<T = any> {
  key: string;
  title: string;
  dataIndex?: keyof T;
  render?: (value: any, record: T, index: number) => React.ReactNode;
  width?: string | number;
  align?: 'left' | 'center' | 'right';
  sortable?: boolean;
}

export interface TableProps<T = any> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  emptyText?: string;
  rowKey?: keyof T | ((record: T) => string);
  onRowClick?: (record: T, index: number) => void;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  striped?: boolean;
  bordered?: boolean;
}

function Table<T = any>({
  columns,
  data,
  loading = false,
  emptyText,
  rowKey = 'id' as keyof T,
  onRowClick,
  className,
  size = 'md',
  striped = false,
  bordered = false,
}: TableProps<T>) {
  const { i18n, t } = useTranslation();
  const rtl = rtlClass(i18n.language as 'fa' | 'en');

  const getRowKey = (record: T, index: number): string => {
    if (typeof rowKey === 'function') {
      return rowKey(record);
    }
    return String(record[rowKey] || index);
  };

  const getCellAlignment = (column: Column<T>): string => {
    if (column.align) {
      if (i18n.language === 'fa') {
        // Reverse alignment for RTL
        return column.align === 'left' ? 'text-right' : 
               column.align === 'right' ? 'text-left' : 'text-center';
      }
      return `text-${column.align}`;
    }
    return rtl.textRight();
  };

  const sizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  };

  const paddingClasses = {
    sm: 'px-3 py-2',
    md: 'px-4 py-3',
    lg: 'px-6 py-4',
  };

  const tableClasses = clsx(
    'min-w-full divide-y divide-gray-200',
    sizeClasses[size],
    {
      'border border-gray-200': bordered,
    },
    className
  );

  const headerClasses = clsx(
    'bg-gray-50',
    paddingClasses[size],
    'font-medium text-gray-900 uppercase tracking-wider'
  );

  const cellClasses = clsx(
    paddingClasses[size],
    'whitespace-nowrap text-gray-900'
  );

  const rowClasses = (index: number) => clsx(
    'hover:bg-gray-50 transition-colors',
    {
      'bg-gray-50': striped && index % 2 === 1,
      'cursor-pointer': onRowClick,
    }
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="spinner w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
        <span className={clsx('text-gray-500', rtl.ml('3'))}>
          {t('common.loading')}
        </span>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">
          {emptyText || t('common.noData', 'No data available')}
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className={tableClasses} dir={i18n.language === 'fa' ? 'rtl' : 'ltr'}>
        <thead>
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                className={clsx(headerClasses, getCellAlignment(column))}
                style={{ width: column.width }}
              >
                {column.title}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {data.map((record, index) => (
            <tr
              key={getRowKey(record, index)}
              className={rowClasses(index)}
              onClick={() => onRowClick?.(record, index)}
            >
              {columns.map((column) => {
                let cellContent: React.ReactNode;
                
                if (column.render) {
                  const value = column.dataIndex ? record[column.dataIndex] : record;
                  cellContent = column.render(value, record, index);
                } else if (column.dataIndex) {
                  cellContent = String(record[column.dataIndex] || '');
                } else {
                  cellContent = '';
                }

                return (
                  <td
                    key={column.key}
                    className={clsx(cellClasses, getCellAlignment(column))}
                  >
                    {cellContent}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default Table;