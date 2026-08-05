import { PERMISSIONS } from '@stayos/constants';
import type { NavItem } from '@stayos/ui';

// Every requiresPerm below is the exact permission the corresponding backend
// route checks (Document 13) — not a role-identity guess. See Document 03 §0.
export const agencyNav: NavItem[] = [
  { id: 'home', label: 'Home', path: '/dashboard' },
  { id: 'portfolio', label: 'Portfolio', path: '/portfolio', requiresPerm: [PERMISSIONS.AGENCY_ALL] },
  { id: 'mandates', label: 'Mandates', path: '/mandates', requiresPerm: [PERMISSIONS.AGENCY_ALL] },
  { id: 'properties', label: 'Properties', path: '/properties', requiresPerm: [PERMISSIONS.AGENCY_ALL] },
  // Only agency_owner / agency_manager hold staff:manage (Document 13 §5) —
  // every other role has no staff-management access at all, so this item
  // is simply absent from their nav rather than shown locked.
  { id: 'staff', label: 'Staff', path: '/staff', requiresPerm: [PERMISSIONS.STAFF_MANAGE] },
  { id: 'statements', label: 'Statements', path: '/statements', requiresPerm: [PERMISSIONS.AGENCY_ALL] },
  // billing:manage is agency_owner-exclusive (Document 13 §6) — the one
  // point of separation between the two full-access roles.
  { id: 'billing', label: 'Billing', path: '/billing', requiresPerm: [PERMISSIONS.BILLING_MANAGE] },
  { id: 'analytics', label: 'Analytics', path: '/analytics', requiresPerm: [PERMISSIONS.ANALYTICS_READ] },
  { id: 'onboarding', label: 'Onboarding', path: '/onboarding', requiresPerm: [PERMISSIONS.AGENCY_ALL] },
  { id: 'support', label: 'Support', path: '/support' },
];
