'use client';

/**
 * Report export (M-06). Queues a PDF export job — the backend responds with
 * a jobId, not an immediate download (see reports.service.js#queueExport).
 * Valid `type` values are exactly the keys of REPORT_TYPE_MAP on the backend:
 * revenue, occupancy, night-audit, students.
 */

import React, { useState } from 'react';
import Link from 'next/link';
import { useMutation } from '@tanstack/react-query';
import { api } from '@stayos/api-client';
import type { ApiError } from '@stayos/api-client';
import { RoleGate, EmptyState, useToast, Icons } from '@stayos/ui';
import { PERMISSIONS } from '@stayos/constants';

const EXPORT_TYPES = [
  { value: 'revenue', label: 'Revenue' },
  { value: 'occupancy', label: 'Occupancy' },
  { value: 'night-audit', label: 'Night audit' },
  { value: 'students', label: 'Student financials' },
];

function ExportPageInner(): React.ReactElement {
  const { toast } = useToast();
  const [type, setType] = useState('revenue');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [date, setDate] = useState('');

  const exportMutation = useMutation({
    mutationFn: () => {
      const params =
        type === 'night-audit'
          ? Object.fromEntries(Object.entries({ date }).filter(([, v]) => v))
          : Object.fromEntries(Object.entries({ from, to }).filter(([, v]) => v));
      return api.reports.export(type, params);
    },
    onSuccess: () => {
      toast('Export queued — the PDF will be available shortly.', 'success');
    },
    onError: (err: ApiError) => {
      toast(err.message ?? 'Failed to queue export.', 'error');
    },
  });

  return (
    <div data-page="report-export">
      <div data-page-header>
        <div>
          <Link href="/reports" data-breadcrumb><Icons.ChevronLeft data-breadcrumb-icon aria-hidden="true" /> Reports</Link>
          <h1>Export data</h1>
        </div>
      </div>

      <div data-form-container>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            exportMutation.mutate();
          }}
          data-form
        >
          <div data-form-group>
            <label htmlFor="exportType">Report type</label>
            <select id="exportType" value={type} onChange={(e) => setType(e.target.value)}>
              {EXPORT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          {type === 'night-audit' ? (
            <div data-form-group>
              <label htmlFor="exportDate">Date</label>
              <input id="exportDate" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          ) : (
            <div data-form-row>
              <div data-form-group>
                <label htmlFor="exportFrom">From</label>
                <input id="exportFrom" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
              </div>
              <div data-form-group>
                <label htmlFor="exportTo">To</label>
                <input id="exportTo" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
              </div>
            </div>
          )}

          <div data-form-actions>
            <button type="submit" data-btn-primary disabled={exportMutation.isPending}>
              {exportMutation.isPending ? 'Queuing export…' : 'Queue export'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ExportPage(): React.ReactElement {
  return (
    <RoleGate
      perm={PERMISSIONS.REPORT_EXPORT}
      fallback={<EmptyState title="Not available" description="You don't have permission to export reports." />}
    >
      <ExportPageInner />
    </RoleGate>
  );
}
