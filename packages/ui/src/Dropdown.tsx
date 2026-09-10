'use client';

import React, { useEffect, useId, useRef, useState } from 'react';
import { ChevronDown, Check, X } from './icons';

export interface DropdownOption {
  value: string;
  label: string;
}

// ── Shared popover shell ─────────────────────────────────────────────────────
// Handles open/close state, outside-click, and Escape — both Dropdown and
// MultiSelectDropdown render their own trigger/panel content inside it.
function useDropdownOpenState(): [boolean, (v: boolean) => void, React.RefObject<HTMLDivElement | null>] {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent): void {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent): void {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return [open, setOpen, ref];
}

// ── Single-select dropdown ───────────────────────────────────────────────────
// A styled replacement for <select> where a nicer popover is wanted (e.g.
// alongside MultiSelectDropdown for a consistent look). For plain forms a
// native <select> is still fine — this is for when a native <select multiple>
// would otherwise be reached for (see MultiSelectDropdown) or when visual
// consistency with it matters.

interface DropdownProps {
  id?: string;
  options: DropdownOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  'aria-label'?: string;
}

export function Dropdown({
  id,
  options,
  value,
  onChange,
  placeholder = 'Select…',
  disabled,
  className,
  ...rest
}: DropdownProps): React.ReactElement {
  const [open, setOpen, ref] = useDropdownOpenState();
  const selected = options.find((o) => o.value === value);
  const labelId = useId();

  return (
    <div data-dropdown data-dropdown-open={open || undefined} className={className} ref={ref}>
      <button
        id={id}
        type="button"
        data-dropdown-trigger
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-labelledby={labelId}
        disabled={disabled}
        onClick={() => setOpen(!open)}
      >
        <span id={labelId} data-dropdown-trigger-label data-placeholder={!selected || undefined}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown data-dropdown-trigger-chevron aria-hidden="true" />
      </button>
      {open && (
        <ul data-dropdown-panel role="listbox" aria-label={rest['aria-label'] ?? placeholder}>
          {options.length === 0 && <li data-dropdown-empty>No options available.</li>}
          {options.map((opt) => (
            <li key={opt.value}>
              <button
                type="button"
                role="option"
                aria-selected={opt.value === value}
                data-dropdown-option
                data-selected={opt.value === value || undefined}
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
              >
                <Check data-dropdown-option-check aria-hidden="true" />
                {opt.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ── Multi-select dropdown ────────────────────────────────────────────────────
// Replaces native <select multiple> (which renders as an always-open,
// scrollable listbox — not a dropdown at all). Click to open, click options
// to toggle them, selections show as removable chips below the trigger.

interface MultiSelectDropdownProps {
  id?: string;
  options: DropdownOption[];
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  'aria-label'?: string;
}

export function MultiSelectDropdown({
  id,
  options,
  value,
  onChange,
  placeholder = 'Select…',
  disabled,
  className,
  ...rest
}: MultiSelectDropdownProps): React.ReactElement {
  const [open, setOpen, ref] = useDropdownOpenState();
  const labelId = useId();

  function toggle(optValue: string): void {
    if (value.includes(optValue)) onChange(value.filter((v) => v !== optValue));
    else onChange([...value, optValue]);
  }

  function remove(optValue: string): void {
    onChange(value.filter((v) => v !== optValue));
  }

  const selectedLabel =
    value.length === 0
      ? placeholder
      : value.length === 1
        ? (options.find((o) => o.value === value[0])?.label ?? placeholder)
        : `${value.length} selected`;

  return (
    <div data-dropdown data-dropdown-open={open || undefined} className={className} ref={ref}>
      <button
        id={id}
        type="button"
        data-dropdown-trigger
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-labelledby={labelId}
        disabled={disabled}
        onClick={() => setOpen(!open)}
      >
        <span id={labelId} data-dropdown-trigger-label data-placeholder={value.length === 0 || undefined}>
          {selectedLabel}
        </span>
        <ChevronDown data-dropdown-trigger-chevron aria-hidden="true" />
      </button>
      {open && (
        <ul data-dropdown-panel role="listbox" aria-multiselectable aria-label={rest['aria-label'] ?? placeholder}>
          {options.length === 0 && <li data-dropdown-empty>No options available.</li>}
          {options.map((opt) => {
            const isSelected = value.includes(opt.value);
            return (
              <li key={opt.value}>
                <button
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  data-dropdown-option
                  data-selected={isSelected || undefined}
                  onClick={() => toggle(opt.value)}
                >
                  <Check data-dropdown-option-check aria-hidden="true" />
                  {opt.label}
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {value.length > 0 && (
        <div data-dropdown-tags>
          {value.map((v) => {
            const opt = options.find((o) => o.value === v);
            return (
              <span key={v} data-dropdown-tag>
                {opt?.label ?? v}
                <button
                  type="button"
                  data-dropdown-tag-remove
                  aria-label={`Remove ${opt?.label ?? v}`}
                  onClick={() => remove(v)}
                >
                  <X aria-hidden="true" />
                </button>
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}
