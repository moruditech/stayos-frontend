'use client';

import React, { useState } from 'react';
import { useSession } from '@stayos/auth';
import { hasPermission } from '@stayos/auth';

interface PiiFieldProps {
  /** The actual value — present in the API response but controlled here */
  value: string;
  label: string;
  /**
   * Permission required to reveal. If omitted, any authenticated user
   * can reveal. If set, the reveal button is not rendered for sessions
   * that don't hold the permission.
   *
   * Note: bankAccount fields on PropertySessionBootstrap arrive pre-masked
   * as literal '****' from the backend — there is no real value in the
   * response to reveal. Do not use PiiField with a reveal action for those
   * fields; render them as ReadOnlyField instead. See Document 07 §2/§6.
   */
  revealPerm?: string;
  className?: string;
}

const MASK = '••••••••';

/**
 * Controlled PII display with explicit reveal gesture.
 *
 * A masked value is never rendered as a plain string elsewhere on the page
 * as a "convenience" — if a component needs to show a PII field it renders
 * it through PiiField, every time. Consistency here is not cosmetic: a raw
 * string in the DOM is one screen-share or browser extension away from
 * exposure that a component with a defined reveal gesture avoids.
 *
 * The reveal action is rate-limited and logged server-side — this component
 * only controls the local display state. The consuming page is responsible
 * for calling the reveal endpoint (e.g. POST /customers/me/reveal) before
 * passing the unmasked value here.
 */
export function PiiField({
  value,
  label,
  revealPerm,
  className,
}: PiiFieldProps): React.ReactElement {
  const [revealed, setRevealed] = useState(false);
  const session = useSession();

  const canReveal =
    !revealPerm ||
    (session !== null && hasPermission(session.permissions, revealPerm));

  return (
    <div className={className} data-pii-field>
      <span data-pii-label>{label}</span>
      <span data-pii-value aria-label={label}>
        {revealed ? value : MASK}
      </span>
      {canReveal && (
        <button
          type="button"
          data-pii-reveal
          onClick={() => setRevealed((r) => !r)}
          aria-pressed={revealed}
        >
          {revealed ? 'Hide' : 'Reveal'}
        </button>
      )}
    </div>
  );
}
