'use client';

/**
 * Reports hub — Property Operations Portal.
 *
 * TAD 11 §15 permission distinctions:
 *   report:read            → occupancy, bookings, housekeeping, maintenance
 *   report:revenue:read    → revenue report
 *   report:finance:read    → finance, night audit
 *   report:export          → export any report
 *   property:*             → student-financial report ONLY (distinct from report:*)
 *
 * The student-financial report's property:* requirement is materially different
 * from every other report route. A staff member with general reporting access
 * does not automatically see student financial data. RoleGate is applied
 * individually per report entry.
 */

import React from 'react';
import Link from 'next/link';
import { RoleGate, PlanGate, Icons } from '@stayos/ui';
import { PERMISSIONS, PLAN_FEATURES } from '@stayos/constants';

interface ReportEntry {
  id: string;
  title: string;
  description: string;
  href: string;
  perm: string | string[];
}

const REPORTS: ReportEntry[] = [
  {
    id: 'occupancy',
    title: 'Occupancy',
    description: 'Room occupancy rates, available vs. booked room-nights.',
    href: '/reports/occupancy',
    perm: PERMISSIONS.REPORT_READ,
  },
  {
    id: 'bookings',
    title: 'Bookings',
    description: 'Booking volume, channel mix, cancellation rates.',
    href: '/reports/bookings',
    perm: PERMISSIONS.REPORT_READ,
  },
  {
    id: 'revenue',
    title: 'Revenue',
    description: 'Revenue breakdown by room type, rate plan and period.',
    href: '/reports/revenue',
    perm: PERMISSIONS.REPORT_REVENUE_READ,
  },
  {
    id: 'finance',
    title: 'Finance',
    description: 'Financial summary, folio balances, outstanding amounts.',
    href: '/reports/finance',
    perm: PERMISSIONS.REPORT_FINANCE_READ,
  },
  {
    id: 'housekeeping',
    title: 'Housekeeping',
    description: 'Task completion rates, average cleaning times, staff performance.',
    href: '/reports/housekeeping',
    perm: PERMISSIONS.REPORT_READ,
  },
  {
    id: 'maintenance',
    title: 'Maintenance',
    description: 'Work order volumes, response times, overdue items.',
    href: '/reports/maintenance',
    perm: PERMISSIONS.REPORT_READ,
  },
  {
    id: 'night-audit',
    title: 'Night audit',
    description: 'End-of-day financial reconciliation for a specific date.',
    href: '/reports/finance?view=night-audit',
    perm: PERMISSIONS.REPORT_FINANCE_READ,
  },
];

// Restaurant / POS module (TAD 23 dashboard §3.6) — every one of these five
// needs both pos:reports:read AND the restaurant_module add-on, same dual-gate
// shape as student financials below, so they share one RoleGate+PlanGate pair
// rather than repeating it five times.
const RESTAURANT_REPORTS: Omit<ReportEntry, 'perm'>[] = [
  {
    id: 'restaurant-sales-summary',
    title: 'Sales Summary',
    description: 'Z-report style summary — totals by payment method, tips, refunds, discounts, voids.',
    href: '/reports/restaurant-sales-summary',
  },
  {
    id: 'restaurant-food-cost',
    title: 'Food Cost',
    description: 'Theoretical vs. actual food cost, comparing recipe-driven usage against wastage and stock-take adjustments.',
    href: '/reports/restaurant-food-cost',
  },
  {
    id: 'restaurant-shift-reconciliation',
    title: 'Shift Reconciliation',
    description: 'Cash variance history across cashier shifts, broken down by staff member.',
    href: '/reports/restaurant-shift-reconciliation',
  },
  {
    id: 'restaurant-tab-aging',
    title: 'Tab Aging',
    description: 'Currently open tabs, sorted by how long they have sat idle.',
    href: '/reports/restaurant-tab-aging',
  },
  {
    id: 'restaurant-sales-by-staff',
    title: 'Sales by Staff',
    description: 'Sales, tips, discounts and voids attributed to each cashier or waiter.',
    href: '/reports/restaurant-sales-by-staff',
  },
];

export default function ReportsPage(): React.ReactElement {
  return (
    <div data-page="reports">
      <div data-page-header>
        <h1>Reports</h1>
        <RoleGate perm={PERMISSIONS.REPORT_EXPORT}>
          <Link href="/reports/export" data-btn-ghost>Export data</Link>
        </RoleGate>
      </div>

      <div data-report-grid>
        {REPORTS.map((report) => (
          <RoleGate key={report.id} perm={report.perm}>
            <Link href={report.href} data-report-card>
              <h2 data-report-title>{report.title}</h2>
              <p data-report-description>{report.description}</p>
              <span data-report-link>View report <Icons.ArrowRight aria-hidden="true" /></span>
            </Link>
          </RoleGate>
        ))}

        {/* Student financials — property:* is explicitly different from report:*
            (TAD 11 §15), and the underlying university module is itself
            plan-gated, so this card needs both checks rather than joining
            the generic REPORTS loop above. */}
        <RoleGate perm={PERMISSIONS.PROPERTY_ALL}>
          <PlanGate feature={PLAN_FEATURES.UNIVERSITY_MODULE}>
            <Link href="/reports/students" data-report-card>
              <h2 data-report-title>Student financials</h2>
              <p data-report-description>
                Invoice status, NSFAS funding, outstanding balances by student.
              </p>
              <span data-report-link>View report <Icons.ArrowRight aria-hidden="true" /></span>
            </Link>
          </PlanGate>
        </RoleGate>

        {/* Restaurant / POS module — see RESTAURANT_REPORTS comment above. */}
        <RoleGate perm={PERMISSIONS.POS_REPORTS_READ}>
          <PlanGate feature={PLAN_FEATURES.RESTAURANT_MODULE}>
            {RESTAURANT_REPORTS.map((report) => (
              <Link key={report.id} href={report.href} data-report-card>
                <h2 data-report-title>{report.title}</h2>
                <p data-report-description>{report.description}</p>
                <span data-report-link>View report <Icons.ArrowRight aria-hidden="true" /></span>
              </Link>
            ))}
          </PlanGate>
        </RoleGate>
      </div>
    </div>
  );
}
