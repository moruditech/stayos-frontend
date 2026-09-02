import { PERMISSIONS } from '@stayos/constants';
import type { NavItem } from '@stayos/ui';

export interface NavSection {
  label: string | null;
  items: NavItem[];
}

// Every requiresPerm below is the exact permission the corresponding backend
// route checks (Document 14) — not a role-identity guess (Document 03 §0).
// Sections with zero visible items after filtering are simply not rendered
// (see AppShell) — a role never sees an empty section header.
export const adminNav: NavSection[] = [
  {
    label: null,
    items: [{ id: 'dashboard', label: 'Dashboard', path: '/dashboard' }],
  },
  {
    label: 'Overview',
    items: [
      { id: 'tenants', label: 'Tenants', path: '/tenants', requiresPerm: [PERMISSIONS.TENANT_MANAGE] },
      { id: 'agencies', label: 'Agencies', path: '/agencies', requiresPerm: [PERMISSIONS.AGENCY_MANAGE] },
      { id: 'analytics', label: 'Analytics', path: '/analytics', requiresPerm: [PERMISSIONS.PLATFORM_READ] },
    ],
  },
  {
    label: 'Revenue & Subscriptions',
    items: [
      { id: 'revenue', label: 'Revenue', path: '/revenue', requiresPerm: [PERMISSIONS.PLATFORM_FINANCE_READ] },
      { id: 'subscriptions', label: 'Subscriptions', path: '/subscriptions', requiresPerm: [PERMISSIONS.PLATFORM_FINANCE_READ] },
      // Refunds live on each subscription's own detail page (there is no
      // standalone refunds list endpoint) — this entry is a super_admin-only
      // shortcut into Subscriptions, gated on the literal '*' wildcard the
      // refund route itself requires, matching Document 14 §4 exactly.
      { id: 'refunds', label: 'Refunds (Super Admin)', path: '/subscriptions', requiresPerm: [PERMISSIONS.WILDCARD] },
    ],
  },
  {
    label: 'Platform Management',
    items: [
      { id: 'users', label: 'Users', path: '/users', requiresPerm: [PERMISSIONS.PLATFORM_USERS_MANAGE] },
      { id: 'plans', label: 'Plans', path: '/plans', requiresPerm: [PERMISSIONS.PLATFORM_PLANS_MANAGE] },
      { id: 'coupons', label: 'Coupons', path: '/coupons', requiresPerm: [PERMISSIONS.PLATFORM_COUPONS_MANAGE] },
      { id: 'referrals', label: 'Referrals', path: '/referrals', requiresPerm: [PERMISSIONS.PLATFORM_READ] },
      { id: 'audit-logs', label: 'Audit Logs', path: '/audit-logs', requiresPerm: [PERMISSIONS.PLATFORM_AUDIT_READ] },
    ],
  },
  {
    label: 'Vetting & Onboarding',
    items: [
      { id: 'vetting-queue', label: 'Vetting Queue', path: '/vetting', requiresPerm: [PERMISSIONS.VETTING_MANAGE] },
      { id: 'all-applications', label: 'All Applications', path: '/vetting/applications', requiresPerm: [PERMISSIONS.ONBOARDING_READ] },
    ],
  },
  {
    label: 'Support & Moderation',
    items: [
      { id: 'support-tickets', label: 'Support Tickets', path: '/support/tickets', requiresPerm: [PERMISSIONS.TICKET_MANAGE] },
      { id: 'review-moderation', label: 'Review Moderation', path: '/moderation/reviews', requiresPerm: [PERMISSIONS.CONTENT_MANAGE] },
    ],
  },
  {
    label: 'Marketing',
    items: [
      { id: 'newsletter', label: 'Newsletter', path: '/newsletter', requiresPerm: [PERMISSIONS.NEWSLETTER_MANAGE] },
      { id: 'mailbox', label: 'Mailbox', path: '/mailbox', requiresPerm: [PERMISSIONS.MAILBOX_MANAGE] },
    ],
  },
];
