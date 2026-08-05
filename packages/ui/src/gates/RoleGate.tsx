'use client';

import React from 'react';
import { useSession } from '@stayos/auth';
import { hasPermission, hasAnyPermission } from '@stayos/auth';

interface RoleGateProps {
  /**
   * Permission string(s) from @stayos/constants PERMISSIONS — ANY one
   * matching grants access. Omit to allow any authenticated user.
   */
  perm?: string | string[];
  /**
   * Explicit deny — takes precedence over perm. If the effective permission
   * set includes any of these, renders fallback regardless of perm.
   */
  deny?: string | string[];
  /**
   * Rendered when access is denied. Defaults to null (nothing rendered).
   * RoleGate always hides — it never shows a locked/upgrade state.
   * That's PlanGate's job.
   */
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Hides children the role can never see.
 *
 * Gates on permission strings from @stayos/constants, not role identity —
 * this means a new role added to ROLE_PERMISSIONS on the backend is
 * automatically covered the next time a permission it holds is used here,
 * rather than requiring every allow={[...]} list to be updated.
 *
 * NEVER add an accessMode prop. Read-only mode is not a gating concern —
 * it's a write-blocking concern handled at the transport layer
 * (Document 04 §4 / Document 08 §6). Adding accessMode here would
 * create a second mechanism doing the same job, and the two would
 * eventually disagree about which actions are blocked.
 *
 * Reads session.permissions (client-computed from the JWT's raw role/
 * grantedPermissions/deniedPermissions fields, mirroring checkPermission.
 * js#_evaluate() exactly). Never calls an API.
 */
export function RoleGate({
  perm,
  deny,
  fallback = null,
  children,
}: RoleGateProps): React.ReactElement {
  const session = useSession();

  // No session → not authenticated → show fallback
  if (!session) return <>{fallback}</>;

  const perms = session.permissions;

  // Deny takes precedence
  if (deny) {
    const denyList = Array.isArray(deny) ? deny : [deny];
    if (denyList.some((d) => hasPermission(perms, d))) {
      return <>{fallback}</>;
    }
  }

  // No perm requirement — authenticated is sufficient
  if (!perm) return <>{children}</>;

  const permList = Array.isArray(perm) ? perm : [perm];
  if (hasAnyPermission(perms, permList)) return <>{children}</>;

  return <>{fallback}</>;
}
