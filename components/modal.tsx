'use client';

import { useEffect } from 'react';

type ModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
};

export default function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
}: ModalProps) {
  useEffect(() => {
    if (!open) return;

    const body = document.body;
    const lockCount = Number(body.dataset.modalLockCount || '0');

    body.dataset.modalLockCount = String(lockCount + 1);

    if (lockCount === 0) {
      body.dataset.modalOriginalOverflow = body.style.overflow;
      body.style.overflow = 'hidden';
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose();
      }
    }

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);

      const currentLockCount = Number(body.dataset.modalLockCount || '0');

      const newLockCount = Math.max(currentLockCount - 1, 0);

      body.dataset.modalLockCount = String(newLockCount);

      if (newLockCount === 0) {
        body.style.overflow = body.dataset.modalOriginalOverflow || '';

        delete body.dataset.modalLockCount;
        delete body.dataset.modalOriginalOverflow;
      }
    };
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-2 backdrop-blur-sm sm:p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className={`flex max-h-[calc(100dvh-1rem)] w-full ${sizeClasses[size]} flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900 sm:max-h-[calc(100dvh-2rem)] sm:rounded-3xl`}
      >
        {/* Header - always visible */}
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-200 bg-white px-4 py-4 dark:border-slate-800 dark:bg-slate-900 sm:px-6 sm:py-5">
          <div className="min-w-0">
            <h2
              id="modal-title"
              className="truncate text-lg font-bold text-slate-900 dark:text-white sm:text-xl"
            >
              {title}
            </h2>

            {description && (
              <p className="mt-1 text-sm leading-5 text-slate-500 dark:text-slate-400">
                {description}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-300 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white dark:focus:ring-slate-600 sm:h-10 sm:w-10"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Scrollable content */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6 sm:py-5">
          {children}
        </div>

        {/* Footer - always visible when supplied */}
        {footer && (
          <div className="shrink-0 border-t border-slate-200 bg-white px-4 py-4 dark:border-slate-800 dark:bg-slate-900 sm:px-6">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
