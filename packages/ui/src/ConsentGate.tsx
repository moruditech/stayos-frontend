'use client';

import React, { useState } from 'react';

interface ConsentGateProps {
  /**
   * The full legal text — may include links, structured content, etc.
   * Rendered verbatim inside the consent panel; the component only
   * provides the checkbox behaviour and the structural shell.
   */
  legalText: React.ReactNode;
  /**
   * Called whenever the checkbox state changes. The parent form is
   * responsible for blocking submission when consented is false.
   */
  onConsent: (consented: boolean) => void;
  /**
   * Optional content rendered when consent has been given (e.g.
   * revealing a form section gated behind the consent).
   */
  children?: React.ReactNode;
  className?: string;
}

/**
 * Consent checkbox with legal-text slot.
 *
 * The checkbox is ALWAYS unchecked by default, with NO exceptions.
 * This is not a UX preference — a pre-checked consent box does not
 * represent an affirmative choice. The standing instruction on this
 * project is absolute: never pre-check a ConsentGate checkbox,
 * regardless of flow, plan tier, or how minor the data category seems.
 *
 * The `--advisory` left-border treatment from the design documentation
 * is applied by the consuming app's stylesheet via [data-consent-gate].
 */
export function ConsentGate({
  legalText,
  onConsent,
  children,
  className,
}: ConsentGateProps): React.ReactElement {
  // defaultChecked is deliberately false and not exposed as a prop —
  // removing the ability to pass it prevents accidental pre-checking.
  const [checked, setChecked] = useState(false);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>): void {
    const next = e.target.checked;
    setChecked(next);
    onConsent(next);
  }

  return (
    <div className={className} data-consent-gate>
      <div data-consent-legal-text>{legalText}</div>
      <label data-consent-label>
        <input
          type="checkbox"
          checked={checked}
          onChange={handleChange}
          data-consent-checkbox
        />
        <span>I have read and agree to the above</span>
      </label>
      {checked && children ? <div data-consent-children>{children}</div> : null}
    </div>
  );
}
