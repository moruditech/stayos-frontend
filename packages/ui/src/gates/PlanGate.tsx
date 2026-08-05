'use client';

import React from 'react';
import { useSession } from '@stayos/auth';
import type { PlanFeature } from '@stayos/constants';

interface PlanGateProps {
  /**
   * A PLAN_FEATURES value from @stayos/constants.
   * Using a value not in that enum means the gate is permanently locked
   * for every tenant on every plan — a silent bug, not a fail-safe.
   * See plan-features.ts in @stayos/constants for the full caveat.
   */
  feature: PlanFeature;
  children: React.ReactNode;
  /**
   * Custom locked state. Defaults to the standard upgrade overlay:
   * children rendered inert (no pointer events) with an upgrade prompt
   * linking to /settings/subscription.
   * The plan feature name is available to the custom locked renderer
   * if needed for copy.
   */
  locked?: React.ReactNode;
}

// Default locked overlay — children visible but inert, upgrade prompt on top.
// Styling is provided by the consuming app's brand system; this component
// only provides the structure and pointer-events: none.
function DefaultLockedOverlay({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <div style={{ position: 'relative' }}>
      <div style={{ pointerEvents: 'none', userSelect: 'none', opacity: 0.4 }}>
        {children}
      </div>
      <div
        data-plan-gate-overlay
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Consuming app styles this via [data-plan-gate-overlay] */}
        <a href="/settings/subscription" data-plan-gate-upgrade>
          Upgrade your plan to unlock this feature
        </a>
      </div>
    </div>
  );
}

/**
 * Shows a locked/upgrade state for features the current plan doesn't include.
 *
 * Unlike RoleGate, PlanGate shows the content LOCKED, not hidden — there's
 * a route to unlock it (upgrade). The one exception is navigation items,
 * where the NavRenderer hides plan-gated items entirely (hiding a locked
 * link in a sidebar is confusing). That exception is handled in NavRenderer,
 * not here — PlanGate itself always shows locked.
 *
 * No automatic redirect — the user chooses whether to follow the upgrade link.
 *
 * Reads session.features (from planId.features via GET /properties/me).
 * Not called for non-tenant scopes — planId doesn't exist for those.
 * See the divergence note in @stayos/types session.ts about feature
 * correctness under an active mandate.
 */
export function PlanGate({
  feature,
  children,
  locked,
}: PlanGateProps): React.ReactElement {
  const session = useSession();

  // Non-tenant scope or no session — render children directly.
  // PlanGate is only meaningful for tenant-scoped sessions where planId
  // is populated. Other scopes have no plan to gate against.
  if (!session || session.scope !== 'tenant') return <>{children}</>;

  if (session.features.includes(feature)) return <>{children}</>;

  if (locked !== undefined) return <>{locked}</>;

  return <DefaultLockedOverlay>{children}</DefaultLockedOverlay>;
}
