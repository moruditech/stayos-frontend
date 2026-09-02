'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Icons } from '@stayos/ui';

interface FilterDropdownProps {
  label: string;
  active?: boolean;
  children: (close: () => void) => React.ReactNode;
}

/**
 * A filter-bar chip that opens a small popover panel. Handles its own
 * open/close state, outside-click, and Escape — the caller only supplies
 * the panel contents via `children`, which receives a `close` callback so
 * "Apply" buttons inside the panel can close it after committing state.
 */
export function FilterDropdown({ label, active, children }: FilterDropdownProps): React.ReactElement {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div data-filter-dropdown ref={ref}>
      <button type="button" data-filter-chip data-active={active ? '' : undefined}
        aria-haspopup="true" aria-expanded={open}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-1)' }}
        onClick={() => setOpen((o) => !o)}>
        {label} <Icons.ChevronDown size={14} />
      </button>
      {open && (
        <div data-filter-panel role="dialog" aria-label={label}>
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
}
