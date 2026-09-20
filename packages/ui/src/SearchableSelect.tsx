'use client';

import React, { useRef, useState } from 'react';
import type { DropdownOption } from './Dropdown';

// ── Searchable select ────────────────────────────────────────────────────────
// A combobox for filtering a long *static* option list in place (e.g.
// countries, currencies). Unlike the host-search combobox in
// apps/property/src/app/(portal)/access/visitors/page.tsx — which debounces
// input and hits the API — this filters the `options` array passed in, with
// no network round trip. Shares the same input + floating results-list shape
// as that combobox (see [data-host-search] in design-system.css) under a
// generic name (`data-search-select`) since it isn't tied to one feature.

interface SearchableSelectProps {
  id?: string;
  options: DropdownOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  emptyMessage?: string;
  disabled?: boolean;
  className?: string;
  'aria-label'?: string;
}

export function SearchableSelect({
  id,
  options,
  value,
  onChange,
  placeholder = 'Search…',
  emptyMessage = 'No options match.',
  disabled,
  className,
  ...rest
}: SearchableSelectProps): React.ReactElement {
  const selected = options.find((o) => o.value === value);
  // What the user is currently typing — only shown while the panel is open.
  // While closed the input just mirrors the selected option's label, so
  // clicking away without picking anything reverts any half-typed filter.
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const blurTimer = useRef<ReturnType<typeof setTimeout>>();

  const trimmed = query.trim().toLowerCase();
  const filtered =
    trimmed === '' ? options : options.filter((o) => o.label.toLowerCase().includes(trimmed));

  return (
    <div data-search-select className={className}>
      <input
        id={id}
        type="text"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-autocomplete="list"
        aria-label={rest['aria-label']}
        autoComplete="off"
        disabled={disabled}
        placeholder={placeholder}
        value={open ? query : (selected?.label ?? '')}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => {
          setQuery('');
          setOpen(true);
        }}
        onBlur={() => {
          blurTimer.current = setTimeout(() => setOpen(false), 150);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Escape') setOpen(false);
        }}
      />
      {open && (
        <ul data-search-select-results role="listbox" aria-label={rest['aria-label'] ?? placeholder}>
          {filtered.length === 0 && <li data-search-select-status>{emptyMessage}</li>}
          {filtered.map((opt) => (
            <li key={opt.value}>
              <button
                type="button"
                role="option"
                aria-selected={opt.value === value}
                data-search-select-option
                onMouseDown={(e) => e.preventDefault()} // keep input focus so onBlur doesn't beat the click
                onClick={() => {
                  clearTimeout(blurTimer.current);
                  onChange(opt.value);
                  setOpen(false);
                }}
              >
                {opt.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
