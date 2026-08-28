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
      </div>
    </div>
  );
}
