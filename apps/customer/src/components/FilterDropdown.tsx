'use client';

import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Icons } from '@stayos/ui';

interface FilterDropdownProps {
  label: string;
  active?: boolean | undefined;
  children: (close: () => void) => React.ReactNode;
}

/**
 * A filter-bar chip that opens a small popover panel. Handles its own
 * open/close state, outside-click, and Escape — the caller only supplies
 * the panel contents via `children`, which receives a `close` callback so
 * "Apply" buttons inside the panel can close it after committing state.
 *
 * The panel is portaled into document.body and positioned with
 * `position: fixed` against the trigger button's own bounding rect,
 * instead of being absolutely positioned inside [data-filter-bar]. That
 * bar scrolls horizontally (overflow-x: auto), and once one overflow axis
 * is non-`visible` the browser clips the other axis too — so a panel
 * anchored *inside* the bar was getting cut off instead of floating
 * below it. Portaling it out avoids that clipping entirely. Position is
 * measured twice: once immediately (so the panel — and its width — exist
 * to measure), then again on the next frame, clamped to stay inside the
 * viewport, before it's made visible.
 */
export function FilterDropdown({ label, active, children }: FilterDropdownProps): React.ReactElement {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number; visible: boolean }>({ top: 0, left: 0, visible: false });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      setPos((p) => ({ ...p, visible: false }));
      return;
    }

    const place = (clamp: boolean) => {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const margin = 16;
      let left = rect.left;
      if (clamp) {
        const panelWidth = panelRef.current?.offsetWidth ?? 0;
        if (panelWidth && left + panelWidth > window.innerWidth - margin) {
          left = Math.max(margin, window.innerWidth - panelWidth - margin);
        }
      }
      setPos({ top: rect.bottom + 8, left, visible: clamp });
    };

    place(false);
    const raf = requestAnimationFrame(() => place(true));

    const onClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    const onReposition = () => place(true);
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    window.addEventListener('scroll', onReposition, true);
    window.addEventListener('resize', onReposition);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', onReposition, true);
      window.removeEventListener('resize', onReposition);
    };
  }, [open]);

  return (
    <div data-filter-dropdown>
      <button type="button" ref={triggerRef} data-filter-chip data-active={active ? '' : undefined}
        aria-haspopup="true" aria-expanded={open}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-1)' }}
        onClick={() => setOpen((o) => !o)}>
        {label} <Icons.ChevronDown size={14} />
      </button>
      {open && typeof document !== 'undefined' && createPortal(
        <div ref={panelRef} data-filter-panel role="dialog" aria-label={label}
          style={{ top: pos.top, left: pos.left, opacity: pos.visible ? 1 : 0 }}>
          {children(() => setOpen(false))}
        </div>,
        document.body
      )}
    </div>
  );
}
