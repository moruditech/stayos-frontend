'use client';

import React from 'react';

// ── MandateBanner ─────────────────────────────────────────────────────────────

interface MandateBannerProps {
  className?: string;
}

/**
 * Persistent, non-dismissible banner shown across the Property Operations
 * Portal whenever session.accessMode === 'read_only'.
 *
 * States that the property is under agency management and the account has
 * view access only. Does NOT enumerate blocked actions — the transport
 * layer's onError handler delivers that contextually when a specific write
 * is actually attempted and rejected (Document 04 §4, Document 08 §5).
 *
 * RoleGate and PlanGate are unaffected by read-only mode — this banner
 * is the complete read-only UX, not one layer of a multi-layer gate.
 * See Document 08 §6 / Document 03 §7.
 */
export function MandateBanner({ className }: MandateBannerProps): React.ReactElement {
  return (
    <div role="status" aria-live="polite" data-mandate-banner className={className}>
      <span data-mandate-banner-icon aria-hidden="true" />
      <span data-mandate-banner-text>
        This property is currently managed by an agency. You have view-only access.
        Actions that make changes are not available during the active management period.
      </span>
    </div>
  );
}

// ── MandateTerminationBanner ──────────────────────────────────────────────────

interface MandateTerminationBannerProps {
  /**
   * Server-computed ISO date string. Treated as opaque — the frontend
   * displays it, never derives it from terminationNoticeDays + a start date.
   * See Document 08 §2/§7.
   *
   * Until the missing GET /owner/mandates/:id route is built on the backend
   * (flagged as a backend ticket), this may be null — callers must handle
   * the loading/unknown-date state.
   */
  terminationDate: string | null;
  className?: string;
}

/**
 * Shown during mandate_status === 'termination_notice' — a countdown to
 * the server-computed terminationDate. Distinct in content and urgency
 * from MandateBanner. Both can be visible at once (read-only owner viewing
 * a property mid-termination-notice); they are separate components because
 * their triggers (accessMode vs. mandateStatus) are genuinely independent.
 */
export function MandateTerminationBanner({
  terminationDate,
  className,
}: MandateTerminationBannerProps): React.ReactElement {
  const formattedDate = terminationDate
    ? new Date(terminationDate).toLocaleDateString('en-ZA', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : null;

  return (
    <div role="status" aria-live="polite" data-mandate-termination-banner className={className}>
      <span data-mandate-termination-icon aria-hidden="true" />
      <span data-mandate-termination-text>
        {formattedDate
          ? `This property's management mandate is ending on ${formattedDate}. Agency access will be revoked and full operational control will be restored on that date.`
          : 'This property\'s management mandate is ending. Agency access will be revoked when the notice period concludes.'}
      </span>
    </div>
  );
}
