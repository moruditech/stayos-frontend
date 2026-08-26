/**
 * Navigation configuration for the Property Operations Portal.
 *
 * Every nav item is filtered at render time against session.permissions
 * and session.features (Document 03 §5).
 *
 * Plan-gated nav items are hidden (not locked) — a locked sidebar link
 * is confusing in a way a locked page section isn't (TAD 03 §5).
 *
 * requiresPerm: ANY permission in the list satisfies visibility.
 * If requiresPerm is omitted: visible to any authenticated tenant-scope session.
 */

import { PERMISSIONS } from '@stayos/constants';
import type { NavItem } from '@stayos/ui';
import { Icons } from '@stayos/ui';

// NavGroup extends NavItem with optional path (group headers have no path)
type NavGroup = Omit<NavItem, 'path'> & { group?: boolean; path?: string; };

export const NAV_CONFIG: NavGroup[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    path: '/dashboard',
    icon: Icons.LayoutDashboard,
  },

  // ── FRONT DESK ───────────────────────────────────────────────────────────
  {
    id: 'front-desk-group',
    label: 'Front Desk',
    group: true,
    children: [
      {
        id: 'bookings',
        label: 'Bookings',
        path: '/bookings',
        icon: Icons.ClipboardList,
        requiresPerm: [PERMISSIONS.BOOKING_READ],
      },
      {
        id: 'rooms',
        label: 'Rooms & Availability',
        path: '/rooms',
        icon: Icons.Bed,
        requiresPerm: [PERMISSIONS.ROOM_READ],
      },
      {
        id: 'housekeeping',
        label: 'Housekeeping',
        path: '/housekeeping',
        icon: Icons.Sparkles,
        requiresPerm: [PERMISSIONS.HOUSEKEEPING_TASK_READ, PERMISSIONS.HOUSEKEEPING_ALL],
      },
      {
        id: 'folios',
        label: 'Folios & Checkout',
        path: '/folios',
        icon: Icons.Receipt,
        requiresPerm: [PERMISSIONS.FOLIO_READ],
      },
    ],
  },

  // ── OPERATIONS ───────────────────────────────────────────────────────────
  {
    id: 'operations-group',
    label: 'Operations',
    group: true,
    children: [
      {
        id: 'maintenance',
        label: 'Maintenance',
        path: '/maintenance/work-orders',
        icon: Icons.Wrench,
        // Any staff can view work orders (TAD 11 §7 — creation open to any)
      },
      {
        id: 'pricing',
        label: 'Pricing & Revenue',
        path: '/pricing/rate-plans',
        icon: Icons.TrendingUp,
        requiresPerm: [PERMISSIONS.RATE_ALL],
      },
      {
        id: 'promotions',
        label: 'Promotions',
        path: '/promotions',
        icon: Icons.Tag,
        requiresPerm: [PERMISSIONS.PROMOTION_MANAGE],
      },
      {
        id: 'access',
        label: 'Access Control',
        path: '/access/visitors',
        icon: Icons.ShieldCheck,
        requiresPerm: [PERMISSIONS.ACCESS_MANAGE],
      },
    ],
  },

  // ── TEAM & HR ────────────────────────────────────────────────────────────
  {
    id: 'team-group',
    label: 'Team & HR',
    group: true,
    children: [
      {
        id: 'roster',
        label: 'Roster & Time Clock',
        path: '/roster',
        icon: Icons.CalendarClock,
        requiresPerm: [PERMISSIONS.STAFF_ROSTER_MANAGE, PERMISSIONS.STAFF_MANAGE],
      },
      {
        id: 'hr',
        label: 'HR',
        path: '/hr',
        icon: Icons.Users,
        requiresPerm: [PERMISSIONS.STAFF_MANAGE],
      },
      {
        id: 'chat',
        label: 'Staff Chat',
        path: '/chat',
        icon: Icons.MessageSquare,
      },
    ],
  },

  // ── FINANCE & ADMIN ──────────────────────────────────────────────────────
  {
    id: 'finance-group',
    label: 'Finance & Admin',
    group: true,
    children: [
      {
        id: 'reports',
        label: 'Reports',
        path: '/reports',
        icon: Icons.BarChart3,
        requiresPerm: [PERMISSIONS.REPORT_READ, PERMISSIONS.REPORT_REVENUE_READ, PERMISSIONS.REPORT_FINANCE_READ],
      },
      {
        id: 'expenses',
        label: 'Expenses',
        path: '/expenses',
        icon: Icons.Wallet,
      },
      {
        id: 'procurement',
        label: 'Procurement',
        path: '/procurement/suppliers',
        icon: Icons.Building2,
        requiresPerm: [PERMISSIONS.PROCUREMENT_MANAGE],
      },
    ],
  },

  // ── SETTINGS & SUPPORT ──────────────────────────────────────────────────
  {
    id: 'settings-group',
    label: 'Settings & Support',
    group: true,
    children: [
      {
        id: 'settings',
        label: 'Settings',
        path: '/settings/property',
        icon: Icons.Settings,
        requiresPerm: [PERMISSIONS.PROPERTY_MANAGE],
      },
      {
        id: 'support',
        label: 'Support',
        path: '/support',
        icon: Icons.LifeBuoy,
      },
    ],
  },
];

// Alias required by the portal layout
export const propertyNav: NavItem[] = NAV_CONFIG as NavItem[];
