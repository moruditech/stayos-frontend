'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Icons } from '@stayos/ui';

export interface GuestsRoomsValue {
  guests: number;
  rooms: number;
}

interface GuestsRoomsFieldProps {
  value: GuestsRoomsValue;
  onChange: (value: GuestsRoomsValue) => void;
}

/**
 * The "Guests & Rooms" control shown on both the Home and Accommodation
 * search widgets. Kept as one shared component so the two pages can't
 * drift apart — fix it once, both pages stay in sync.
 */
export function GuestsRoomsField({ value, onChange }: GuestsRoomsFieldProps): React.ReactElement {
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

  function step(field: keyof GuestsRoomsValue, delta: number, min: number, max: number): void {
    const next = Math.min(max, Math.max(min, value[field] + delta));
    onChange({ ...value, [field]: next });
  }

  const summary = `${value.guests} guest${value.guests !== 1 ? 's' : ''}, ${value.rooms} room${value.rooms !== 1 ? 's' : ''}`;

  return (
    <div data-search-field data-guests-field ref={ref}>
      <label htmlFor="guests-trigger">Guests &amp; Rooms</label>
      <button
        id="guests-trigger"
        type="button"
        data-guests-trigger
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <Icons.User size={16} aria-hidden="true" />
        {summary}
        <Icons.ChevronDown size={16} aria-hidden="true" />
      </button>

      {open && (
        <div data-guests-popover role="dialog" aria-label="Guests and rooms">
          <div data-guests-row>
            <span>Guests</span>
            <div data-guests-stepper>
              <button type="button" data-guests-stepper-btn
                disabled={value.guests <= 1}
                aria-label="Decrease guests"
                onClick={() => step('guests', -1, 1, 20)}>
                <Icons.Minus size={14} />
              </button>
              <span data-guests-stepper-value>{value.guests}</span>
              <button type="button" data-guests-stepper-btn
                disabled={value.guests >= 20}
                aria-label="Increase guests"
                onClick={() => step('guests', 1, 1, 20)}>
                <Icons.Plus size={14} />
              </button>
            </div>
          </div>
          <div data-guests-row>
            <span>Rooms</span>
            <div data-guests-stepper>
              <button type="button" data-guests-stepper-btn
                disabled={value.rooms <= 1}
                aria-label="Decrease rooms"
                onClick={() => step('rooms', -1, 1, 10)}>
                <Icons.Minus size={14} />
              </button>
              <span data-guests-stepper-value>{value.rooms}</span>
              <button type="button" data-guests-stepper-btn
                disabled={value.rooms >= 10}
                aria-label="Increase rooms"
                onClick={() => step('rooms', 1, 1, 10)}>
                <Icons.Plus size={14} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
