'use client';

import React, { useState } from 'react';
import { X, Plus } from './icons';

interface TagInputProps {
  id?: string;
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
}

/**
 * Free-text tag entry — type a value, press Enter or click "+" to add it as
 * a chip, click a chip's × to remove it. For an open-ended list the user
 * defines themselves (room amenities, etc.), as opposed to MultiSelectDropdown
 * (packages/ui/src/Dropdown.tsx), which is for picking from a fixed,
 * predefined set of options. Deliberately not built on top of that
 * component — a closed-option dropdown and free-text tag entry are
 * different interactions — but reuses its chip visual language under a
 * generic name (data-tag-* rather than data-dropdown-tag*) since this isn't
 * a dropdown at all.
 */
export function TagInput({ id, value, onChange, placeholder = 'Add an amenity…', disabled }: TagInputProps): React.ReactElement {
  const [draft, setDraft] = useState('');

  function commitDraft(): void {
    const tag = draft.trim();
    setDraft('');
    if (!tag) return;
    // Case-insensitive de-dupe — "Wi-Fi" and "wi-fi" are the same amenity.
    if (value.some((v) => v.toLowerCase() === tag.toLowerCase())) return;
    onChange([...value, tag]);
  }

  function removeTag(index: number): void {
    onChange(value.filter((_, i) => i !== index));
  }

  return (
    <div data-tag-input>
      <div data-tag-input-row>
        <input
          id={id}
          type="text"
          autoComplete="off"
          value={draft}
          disabled={disabled}
          placeholder={placeholder}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            // Comma still works as a quick separator for anyone used to
            // typing lists that way, without requiring it — Enter or "+"
            // both add the current draft on their own.
            if (e.key === 'Enter' || e.key === ',') {
              e.preventDefault();
              commitDraft();
            }
          }}
        />
        <button
          type="button"
          data-btn-secondary
          data-btn-sm
          disabled={disabled || !draft.trim()}
          onClick={commitDraft}
          aria-label="Add amenity"
        >
          <Plus size={15} aria-hidden="true" />
        </button>
      </div>
      {value.length > 0 && (
        <ul data-tag-list>
          {value.map((tag, index) => (
            <li key={`${tag}-${index}`} data-tag-chip>
              {tag}
              {!disabled && (
                <button
                  type="button"
                  data-tag-chip-remove
                  onClick={() => removeTag(index)}
                  aria-label={`Remove ${tag}`}
                >
                  <X aria-hidden="true" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
