'use client';

/**
 * Student financials report (TAD 11 §15).
 *
 * Gated on PERMISSIONS.PROPERTY_ALL — deliberately different from the
 * report:* permissions every other report in this section uses — plus
 * PLAN_FEATURES.UNIVERSITY_MODULE, since the underlying data only exists
 * for properties with the university module enabled. Mirrors the gating
 * already applied to this card on the reports hub (reports/page.tsx).
 *
 * Renders exactly what GET /reports/students/financial returns:
 * { summary: { totalCharged, totalPaidBySelf, totalPaidByBursary,
 *   totalOutstanding, accountCount }, invoiceStatus: [{_id, count, total}],
 *   outstandingByFunder: [{_id, outstanding}] }
 * (src/modules/reports/reports.service.js#getStudentFinancialReport).
 */

import React, { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { api } from '@stayos/api-client';
import { RoleGate, PlanGate, SkeletonLoader, ReadOnlyField, EmptyState, Icons } from '@stayos/ui';
import { PERMISSIONS, PLAN_FEATURES } from '@stayos/constants';
import { reportKeys } from '@/lib/query-keys';

interface InvoiceStatusRow {
  _id: string;
  count: number;
  total: number;
}

interface OutstandingByFunderRow {
  _id: string;
  outstanding: number;
}

interface StudentFinancialReport {
  summary: {
    totalCharged: number;
    totalPaidBySelf: number;
    totalPaidByBursary: number;
    totalOutstanding: number;
    accountCount: number;
  };
  invoiceStatus: InvoiceStatusRow[];
  outstandingByFunder: OutstandingByFunderRow[];
}

function fmtCurrency(n: number): string {
  return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(n || 0);
}

function StudentFinancialsInner(): React.ReactElement {
  const [academicYear, setAcademicYear] = useState('');
  const [semester, setSemester] = useState('');

  const params = Object.fromEntries(
    Object.entries({ academicYear, semester }).filter(([, v]) => v)
  );

  const { data, isLoading } = useQuery({
    queryKey: reportKeys.students(params),
    queryFn: () => api.reports.getStudentsFinancial(params) as unknown as Promise<StudentFinancialReport>,
  });

  return (
    <div data-page="report-students">
      <div data-page-header>
        <div>
          <Link href="/reports" data-breadcrumb><Icons.ChevronLeft data-breadcrumb-icon aria-hidden="true" /> Reports</Link>
          <h1>Student financials</h1>
        </div>
      </div>

      <div data-filter-bar>
        <input
          type="text"
          value={academicYear}
          onChange={(e) => setAcademicYear(e.target.value)}
          data-filter-input
          placeholder="Academic year (e.g. 2026)"
        />
        <input
          type="text"
          value={semester}
          onChange={(e) => setSemester(e.target.value)}
          data-filter-input
          placeholder="Semester (e.g. 1)"
        />
      </div>

      {isLoading || !data ? (
        <SkeletonLoader rows={6} />
      ) : (
        <>
          <div data-stat-grid>
            <ReadOnlyField label="Total charged" value={fmtCurrency(data.summary.totalCharged)} />
            <ReadOnlyField label="Paid by student" value={fmtCurrency(data.summary.totalPaidBySelf)} />
            <ReadOnlyField label="Paid by bursary / NSFAS" value={fmtCurrency(data.summary.totalPaidByBursary)} />
            <ReadOnlyField label="Outstanding balance" value={fmtCurrency(data.summary.totalOutstanding)} />
            <ReadOnlyField label="Student accounts" value={data.summary.accountCount} />
          </div>

          <section data-report-section>
            <h2>Invoice status</h2>
            {!data.invoiceStatus.length ? (
              <EmptyState title="No invoices" description="No student invoices found for this filter." />
            ) : (
              <table data-table>
                <thead>
                  <tr><th>Status</th><th>Count</th><th>Total</th></tr>
                </thead>
                <tbody>
                  {data.invoiceStatus.map((row) => (
                    <tr key={row._id}>
                      <td><span data-status-cell>{row._id?.replace(/_/g, ' ') ?? '—'}</span></td>
                      <td>{row.count}</td>
                      <td>{fmtCurrency(row.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          <section data-report-section>
            <h2>Outstanding balance by funding type</h2>
            {!data.outstandingByFunder.length ? (
              <EmptyState title="No outstanding balances" description="No outstanding balances found for this filter." />
            ) : (
              <table data-table>
                <thead>
                  <tr><th>Funding type</th><th>Outstanding</th></tr>
                </thead>
                <tbody>
                  {data.outstandingByFunder.map((row) => (
                    <tr key={row._id}>
                      <td>{row._id?.replace(/_/g, ' ') ?? '—'}</td>
                      <td>{fmtCurrency(row.outstanding)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </>
      )}
    </div>
  );
}

export default function StudentFinancialsPage(): React.ReactElement {
  return (
    <RoleGate
      perm={PERMISSIONS.PROPERTY_ALL}
      fallback={<EmptyState title="Not available" description="You don't have permission to view this report." />}
    >
      <PlanGate feature={PLAN_FEATURES.UNIVERSITY_MODULE}>
        <StudentFinancialsInner />
      </PlanGate>
    </RoleGate>
  );
}
