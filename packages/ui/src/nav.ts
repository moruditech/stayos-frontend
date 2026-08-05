import type { Session } from '@stayos/types';
import { hasAnyPermission } from '@stayos/auth';

export interface NavItem {
  id: string;
  label: string;
  path: string;
  /**
   * One or more permission strings from @stayos/constants PERMISSIONS.
   * ANY one matching grants access. Omit to allow any authenticated user.
   */
  requiresPerm?: string[];
  /**
   * A PLAN_FEATURES value from @stayos/constants.
   * Plan-gated nav items are HIDDEN, not locked — a locked link in a
   * sidebar is confusing (Document 03 §5). This is the deliberate inversion
   * of PlanGate's general lock-not-hide rule.
   */
  requiresFeature?: string;
  children?: NavItem[] | undefined;
}

/**
 * Filters a nav config tree against the current session.
 * Returns only the items the session can see — children are filtered
 * recursively, so a section with no visible children is also removed.
 *
 * Call once per render with the current session; do not call inside a
 * loop or per-item. The filtered result is a stable value for the
 * sidebar renderer to map over.
 */
export function filterNav(items: NavItem[], session: Session): NavItem[] {
  return items.reduce<NavItem[]>((acc, item) => {
    // Permission gate
    if (item.requiresPerm?.length) {
      if (!hasAnyPermission(session.permissions, item.requiresPerm)) {
        return acc;
      }
    }

    // Plan feature gate — hidden in nav (not locked)
    if (item.requiresFeature) {
      if (!session.features.includes(item.requiresFeature)) {
        return acc;
      }
    }

    // Recurse into children
    const filteredChildren = item.children
      ? filterNav(item.children, session)
      : undefined;

    // A section whose children are all filtered out is itself hidden
    if (item.children && filteredChildren?.length === 0) {
      return acc;
    }

    acc.push({
      ...item,
      children: filteredChildren,
    });
    return acc;
  }, []);
}
