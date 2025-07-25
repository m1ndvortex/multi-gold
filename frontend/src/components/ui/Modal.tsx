import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { clsx } from 'clsx';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import { rtlClass } from '@/utils/rtl';
import Button from './Button';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  closeOnOverlayClick?: boolean;
  showCloseButton?: boolean;
  className?: string;
}

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  closeOnOverlayClick = true,
  showCloseButton = true,
  className,
}) => {
  const { i18n, t } = useTranslation();
  const rtl = rtlClass(i18n.language as 'fa' | 'en');

  // Handle escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-full mx-4',
  };

  const handleOverlayClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget && closeOnOverlayClick) {
      onClose();
    }
  };

  const modalContent = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50"
      onClick={handleOverlayClick}
      dir={i18n.language === 'fa' ? 'rtl' : 'ltr'}
    >
      <div
        className={clsx(
          'relative w-full bg-white rounded-lg shadow-xl',
          'animate-fade-in',
          sizeClasses[size],
          className
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        {(title || showCloseButton) && (
          <div className={clsx(
            'flex items-center justify-between p-6 border-b border-gray-200',
            i18n.language === 'fa' ? 'flex-row-reverse' : 'flex-row'
          )}>
            {title && (
              <h2 className={clsx('text-lg font-semibold text-gray-900', rtl.textRight())}>
                {title}
              </h2>
            )}
            {showCloseButton && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className={clsx('p-2', rtl.ml('4'))}
                aria-label={t('common.close')}
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        )}

        {/* Content */}
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default Modal;