'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useId,
  useRef,
  useState,
} from 'react';
import type { Pagination as PaginationMeta } from '@stayos/types';
import { Icons } from './icons';

// ── Modal ─────────────────────────────────────────────────────────────────────

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  className?: string;
}

export function Modal({
  open,
  onClose,
  title,
  children,
  className,
}: ModalProps): React.ReactElement | null {
  const titleId = useId();
  if (!open) return null;
  return (
    <div role="dialog" aria-modal aria-labelledby={titleId} data-modal className={className}>
      <div data-modal-backdrop onClick={onClose} />
      <div data-modal-panel>
        <div data-modal-header>
          <h2 id={titleId} data-modal-title>{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close" data-modal-close>
            <Icons.X aria-hidden="true" />
          </button>
        </div>
        <div data-modal-body>{children}</div>
      </div>
    </div>
  );
}

// ── ConfirmDialog ─────────────────────────────────────────────────────────────
// Two-step confirm for destructive actions.

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  /** When true, the confirm button renders in a destructive (red) style */
  destructive?: boolean;
  className?: string;
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  destructive = false,
  className,
}: ConfirmDialogProps): React.ReactElement | null {
  if (!open) return null;
  return (
    <div role="alertdialog" aria-modal aria-label={title} data-confirm-dialog className={className}>
      <div data-confirm-dialog-backdrop onClick={onCancel} />
      <div data-confirm-dialog-panel>
        <p data-confirm-dialog-title>{title}</p>
        <p data-confirm-dialog-message>{message}</p>
        <div data-confirm-dialog-actions>
          <button type="button" onClick={onCancel} data-confirm-dialog-cancel>
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            data-confirm-dialog-confirm
            data-destructive={destructive || undefined}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Toast / ToastStack ────────────────────────────────────────────────────────

interface Toast {
  id: string;
  message: string;
  variant: 'success' | 'error' | 'info' | 'warning';
}

interface ToastContextValue {
  toast: (message: string, variant?: Toast['variant']) => void;
}

const ToastContext = createContext<ToastContextValue>({
  toast: () => undefined,
});

export function useToast(): ToastContextValue {
  return useContext(ToastContext);
}

export function ToastStack({ children }: { children: React.ReactNode }): React.ReactElement {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: string) => {
    setToasts((t) => t.filter((x) => x.id !== id));
    const timer = timers.current.get(id);
    if (timer !== undefined) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const toast = useCallback(
    (message: string, variant: Toast['variant'] = 'info') => {
      const id = crypto.randomUUID();
      setToasts((t) => [...t, { id, message, variant }]);
      const timer = setTimeout(() => dismiss(id), 5000);
      timers.current.set(id, timer);
    },
    [dismiss]
  );

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div role="region" aria-label="Notifications" data-toast-stack>
        {toasts.map((t) => (
          <div
            key={t.id}
            role="alert"
            data-toast
            data-toast-variant={t.variant}
          >
            <span>{t.message}</span>
            <button
              type="button"
              onClick={() => dismiss(t.id)}
              aria-label="Dismiss"
              data-toast-dismiss
            >
              <Icons.X aria-hidden="true" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

// ── SkeletonLoader ────────────────────────────────────────────────────────────

interface SkeletonLoaderProps {
  /** Number of skeleton rows to show */
  rows?: number;
  className?: string;
}

export function SkeletonLoader({ rows = 3, className }: SkeletonLoaderProps): React.ReactElement {
  return (
    <div role="status" aria-label="Loading" data-skeleton className={className}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} data-skeleton-row />
      ))}
    </div>
  );
}

// ── EmptyState ────────────────────────────────────────────────────────────────

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  title,
  description,
  action,
  className,
}: EmptyStateProps): React.ReactElement {
  return (
    <div data-empty-state className={className}>
      <p data-empty-state-title>{title}</p>
      {description && <p data-empty-state-description>{description}</p>}
      {action && <div data-empty-state-action>{action}</div>}
    </div>
  );
}

// ── StatusBadge ───────────────────────────────────────────────────────────────

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps): React.ReactElement {
  return (
    <span data-status-badge data-status={status} className={className}>
      {status.replace(/_/g, ' ')}
    </span>
  );
}

// ── ReadOnlyField ─────────────────────────────────────────────────────────────

interface ReadOnlyFieldProps {
  label: string;
  value: React.ReactNode;
  className?: string;
}

export function ReadOnlyField({ label, value, className }: ReadOnlyFieldProps): React.ReactElement {
  return (
    <div data-readonly-field className={className}>
      <span data-readonly-label>{label}</span>
      <span data-readonly-value>{value}</span>
    </div>
  );
}

// ── Pagination ────────────────────────────────────────────────────────────────

interface PaginationProps {
  /** Reads directly from ApiResponse.pagination per Document 01 §2.1 */
  meta: PaginationMeta;
  onPageChange: (page: number) => void;
  className?: string;
}

export function Pagination({ meta, onPageChange, className }: PaginationProps): React.ReactElement {
  const { page, totalPages, total, limit } = meta;
  const start = (page - 1) * limit + 1;
  const end = Math.min(page * limit, total);

  return (
    <nav aria-label="Pagination" data-pagination className={className}>
      <span data-pagination-summary>
        {start}–{end} of {total}
      </span>
      <button
        type="button"
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        aria-label="Previous page"
        data-pagination-prev
      >
        ‹
      </button>
      <span data-pagination-current aria-current="page">
        {page} / {totalPages}
      </span>
      <button
        type="button"
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
        aria-label="Next page"
        data-pagination-next
      >
        ›
      </button>
    </nav>
  );
}

// ── CopyButton ────────────────────────────────────────────────────────────────

interface CopyButtonProps {
  value: string;
  label?: string;
  className?: string;
}

export function CopyButton({ value, label = 'Copy', className }: CopyButtonProps): React.ReactElement {
  const [copied, setCopied] = useState(false);

  async function handleCopy(): Promise<void> {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      type="button"
      onClick={() => void handleCopy()}
      aria-label={copied ? 'Copied' : label}
      data-copy-button
      data-copied={copied || undefined}
      className={className}
    >
      {copied ? 'Copied' : label}
    </button>
  );
}

// ── DownloadButton ────────────────────────────────────────────────────────────

interface DownloadButtonProps {
  /** Blob URL or a function that resolves to one */
  href: string | (() => Promise<string>);
  filename: string;
  label?: string;
  className?: string;
}

export function DownloadButton({
  href,
  filename,
  label = 'Download',
  className,
}: DownloadButtonProps): React.ReactElement {
  const [loading, setLoading] = useState(false);

  async function handleDownload(): Promise<void> {
    setLoading(true);
    try {
      const url = typeof href === 'string' ? href : await href();
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={() => void handleDownload()}
      disabled={loading}
      data-download-button
      className={className}
    >
      {loading ? 'Preparing…' : label}
    </button>
  );
}
