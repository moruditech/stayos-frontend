'use client';

import Link from 'next/link';

/**
 * Timesheets & payroll export — HR.
 *
 * GET /hr/timesheets?period=YYYY-MM     → per-staff hours/cost preview
 * POST /hr/timesheets/export            → generates a CSV/PDF export record
 * GET /hr/timesheets/exports            → history of generated exports
 *
 * All three require payroll_export:read (src/modules/hr/hr.routes.js).
 */

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@stayos/api-client';
import type { ApiError } from '@stayos/api-client';
import {
  RoleGate, SkeletonLoader, EmptyState, useToast, DownloadButton, Icons,
} from '@stayos/ui';
import { PERMISSIONS } from '@stayos/constants';
import { hrKeys } from '@/lib/query-keys';

interface TimesheetPreviewRow {
  staffId: string;
  staff: { firstName: string; lastName: string; role: string } | null;
  hourlyRate: number;
  totalHours: number;
  overtimeHours: number;
  estimatedCost: number;
}

interface TimesheetExportRecord {
  _id: string;
  period: string;
  format: 'csv' | 'pdf';
  status: 'generated' | 'failed';
  fileUrl?: string;
  createdAt: string;
  summary?: {
    totalStaff: number;
    totalHours: number;
    totalOvertimeHours: number;
    estimatedCost: number;
  };
}

function fmtCurrency(n: number): string {
  return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(n || 0);
}

function currentPeriod(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function TimesheetsInner(): React.ReactElement {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [period, setPeriod] = useState(currentPeriod());
  const [format, setFormat] = useState<'csv' | 'pdf'>('csv');

  const { data: preview, isLoading } = useQuery({
    queryKey: [...hrKeys.timesheets(), period],
    queryFn: () => api.hr.getTimesheets({ period }) as unknown as Promise<TimesheetPreviewRow[]>,
  });

  const { data: exports, isLoading: exportsLoading } = useQuery({
    queryKey: [...hrKeys.timesheets(), 'exports'],
    queryFn: () => api.hr.listTimesheetExports() as unknown as Promise<TimesheetExportRecord[]>,
  });

  const exportMutation = useMutation({
    mutationFn: () => api.hr.exportTimesheets({ period, format }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [...hrKeys.timesheets(), 'exports'] });
      toast('Timesheet export generated.', 'success');
    },
    onError: (err: ApiError) => toast(err.message ?? 'Failed to generate export.', 'error'),
  });

  const totals = (preview ?? []).reduce(
    (acc, row) => ({
      totalHours: acc.totalHours + row.totalHours,
      overtimeHours: acc.overtimeHours + row.overtimeHours,
      estimatedCost: acc.estimatedCost + row.estimatedCost,
    }),
    { totalHours: 0, overtimeHours: 0, estimatedCost: 0 }
  );

  return (
    <div data-page="hr-timesheets">
      <div data-page-header>
        <div>
          <Link href="/hr" data-breadcrumb><Icons.ChevronLeft data-breadcrumb-icon aria-hidden="true" /> HR</Link>
          <h1>Timesheets &amp; payroll export</h1>
        </div>
      </div>

      <div data-filter-bar>
        <div data-form-group>
          <label htmlFor="ts-period">Period</label>
          <input
            id="ts-period"
            type="month"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
          />
        </div>
      </div>

      <section data-report-section>
        <h2>Preview</h2>
        {isLoading ? (
          <SkeletonLoader rows={5} />
        ) : !preview?.length ? (
          <EmptyState
            title="No clocked hours"
            description={`No completed timeclock entries found for ${period}.`}
          />
        ) : (
          <>
            <table data-table>
              <thead>
                <tr>
                  <th>Staff</th>
                  <th>Role</th>
                  <th>Hourly rate</th>
                  <th>Total hours</th>
                  <th>Overtime hours</th>
                  <th>Estimated cost</th>
                </tr>
              </thead>
              <tbody>
                {preview.map((row) => (
                  <tr key={row.staffId}>
                    <td>
                      {row.staff ? `${row.staff.firstName} ${row.staff.lastName}` : row.staffId}
                    </td>
                    <td>{row.staff?.role.replace(/_/g, ' ') ?? '—'}</td>
                    <td>{fmtCurrency(row.hourlyRate)}</td>
                    <td>{row.totalHours}</td>
                    <td>{row.overtimeHours}</td>
                    <td>{fmtCurrency(row.estimatedCost)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={3}><strong>Total</strong></td>
                  <td><strong>{totals.totalHours}</strong></td>
                  <td><strong>{totals.overtimeHours}</strong></td>
                  <td><strong>{fmtCurrency(totals.estimatedCost)}</strong></td>
                </tr>
              </tfoot>
            </table>

            <div data-form-actions data-form-actions-inline>
              <div data-form-group>
                <label htmlFor="ts-format">Export format</label>
                <select id="ts-format" value={format} onChange={(e) => setFormat(e.target.value as 'csv' | 'pdf')}>
                  <option value="csv">CSV</option>
                  <option value="pdf">PDF</option>
                </select>
              </div>
              <button
                type="button"
                data-btn-primary
                disabled={exportMutation.isPending}
                onClick={() => exportMutation.mutate()}
              >
                {exportMutation.isPending ? 'Generating…' : 'Generate export'}
              </button>
            </div>
          </>
        )}
      </section>

      <section data-report-section>
        <h2>Export history</h2>
        {exportsLoading ? (
          <SkeletonLoader rows={3} />
        ) : !exports?.length ? (
          <EmptyState title="No exports yet" description="Generated payroll exports will appear here." />
        ) : (
          <table data-table>
            <thead>
              <tr>
                <th>Period</th>
                <th>Format</th>
                <th>Status</th>
                <th>Total staff</th>
                <th>Estimated cost</th>
                <th>Generated</th>
                <th>File</th>
              </tr>
            </thead>
            <tbody>
              {exports.map((exp) => (
                <tr key={exp._id}>
                  <td>{exp.period}</td>
                  <td>{exp.format.toUpperCase()}</td>
                  <td>{exp.status}</td>
                  <td>{exp.summary?.totalStaff ?? '—'}</td>
                  <td>{exp.summary ? fmtCurrency(exp.summary.estimatedCost) : '—'}</td>
                  <td>{new Date(exp.createdAt).toLocaleDateString('en-ZA')}</td>
                  <td>
                    {exp.fileUrl ? (
                      <DownloadButton
                        href={exp.fileUrl}
                        filename={`timesheet-${exp.period}.${exp.format}`}
                        label="Download"
                      />
                    ) : (
                      <span data-empty-cell>—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}

export default function TimesheetsPage(): React.ReactElement {
  return (
    <RoleGate
      perm={PERMISSIONS.PAYROLL_EXPORT_READ}
      fallback={<EmptyState title="Not available" description="You don't have permission to view payroll exports." />}
    >
      <TimesheetsInner />
    </RoleGate>
  );
}
