'use client';

import Link from 'next/link';

/**
 * Roster & HR — consolidated hub (was two separate pages: /roster and /hr).
 * Tabs: Roster | Time clock | Staff & HR | Timesheets.
 * Staff HR detail (profile/documents/disciplinary/performance) stays a
 * drill-down page at /hr/profiles/[staffId] — same pattern as
 * Promotions → Promotion usage, Maintenance → Work order detail.
 */

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api } from '@stayos/api-client';
import type { ApiError, StaffMember } from '@stayos/api-client';
import {
  SkeletonLoader, EmptyState, StatusBadge, useToast, Modal, InlineError,
  ConfirmDialog, applyServerErrors, RoleGate, DownloadButton,
} from '@stayos/ui';
import { PERMISSIONS } from '@stayos/constants';
import { rosterKeys, hrKeys, staffKeys } from '@/lib/query-keys';

// Must match the backend exactly (src/modules/roster/roster.validation.js).
const DEPARTMENTS = ['front_desk', 'housekeeping', 'maintenance', 'finance', 'management'] as const;
const DEPARTMENT_LABELS: Record<(typeof DEPARTMENTS)[number], string> = {
  front_desk: 'Front desk', housekeeping: 'Housekeeping', maintenance: 'Maintenance',
  finance: 'Finance', management: 'Management',
};

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' });
}
function fmtZAR(n: number): string {
  return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(n || 0);
}
// Shift.staffId and TimeClockEntry.staffId are populated-or-string unions
// with slightly different object shapes (Shift's also carries `role`) —
// this only needs the two name fields both shapes share.
function staffLabel(staffId: string | { firstName: string; lastName: string } | null | undefined): string {
  if (staffId && typeof staffId === 'object') return `${staffId.firstName} ${staffId.lastName}`;
  return '—';
}

type Tab = 'roster' | 'timeclock' | 'staff' | 'timesheets';
const TABS: { id: Tab; label: string }[] = [
  { id: 'roster', label: 'Roster' },
  { id: 'timeclock', label: 'Time clock' },
  { id: 'staff', label: 'Staff & HR' },
  { id: 'timesheets', label: 'Timesheets' },
];

export default function RosterHrPage(): React.ReactElement {
  const [tab, setTab] = useState<Tab>('roster');

  return (
    <div data-page="roster-hr">
      <div data-page-header>
        <h1>Roster &amp; HR</h1>
      </div>

      <div data-tab-bar role="tablist">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            data-tab
            data-active={tab === t.id || undefined}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'roster' && <RosterTab />}
      {tab === 'timeclock' && <TimeClockTab />}
      {tab === 'staff' && <StaffTab />}
      {tab === 'timesheets' && <TimesheetsTab />}
    </div>
  );
}

// =============================================================================
// ROSTER TAB — view shifts, create/cancel
// =============================================================================

const shiftSchema = z.object({
  staffId:       z.string().min(1, 'Select a staff member'),
  department:    z.enum(DEPARTMENTS, { errorMap: () => ({ message: 'Select a department' }) }),
  date:          z.string().min(1, 'Date is required'),
  startTime:     z.string().regex(/^\d{2}:\d{2}$/, 'Use 24-hour HH:mm, e.g. 08:00'),
  endTime:       z.string().regex(/^\d{2}:\d{2}$/, 'Use 24-hour HH:mm, e.g. 16:00'),
  budgetedHours: z.coerce.number().positive().optional(),
});
type ShiftInput = z.infer<typeof shiftSchema>;

function RosterTab(): React.ReactElement {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showNew, setShowNew] = useState(false);
  const [cancelId, setCancelId] = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState('');

  const filters = dateFilter ? { date: dateFilter } : {};

  const { data: shifts, isLoading } = useQuery({
    queryKey: rosterKeys.roster(filters),
    queryFn: () => api.roster.getRoster(filters),
  });

  const { data: staff } = useQuery({
    queryKey: staffKeys.list(),
    queryFn: () => api.staff.list(),
    staleTime: 120_000,
  });

  const form = useForm<ShiftInput>({ resolver: zodResolver(shiftSchema) });

  const createMutation = useMutation({
    mutationFn: (input: ShiftInput) => api.roster.createShift(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: rosterKeys.all() });
      setShowNew(false);
      form.reset();
      toast('Shift created.', 'success');
    },
    onError: (err: ApiError) => {
      if (err.code === 'VALIDATION_ERROR') {
        applyServerErrors(form, err);
        const hasUnattachedError = err.fields?.some((f) => !f.field);
        if (hasUnattachedError || !err.fields?.length) toast(err.message, 'error');
      } else {
        toast(err.message ?? 'Failed to create shift.', 'error');
      }
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => api.roster.cancelShift(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: rosterKeys.all() });
      setCancelId(null);
      toast('Shift cancelled.', 'success');
    },
    onError: (err: ApiError) => { setCancelId(null); toast(err.message ?? 'Failed.', 'error'); },
  });

  return (
    <section data-tab-panel>
      <div data-section-header>
        <input
          type="date"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          aria-label="Filter by date"
        />
        <RoleGate perm={PERMISSIONS.STAFF_ROSTER_MANAGE}>
          <button type="button" data-btn-primary onClick={() => setShowNew(true)}>
            + New shift
          </button>
        </RoleGate>
      </div>

      {isLoading ? <SkeletonLoader rows={4} /> : !shifts?.length ? (
        <EmptyState title="No shifts scheduled" description="Create shifts to assign staff to their working hours." />
      ) : (
        <table data-table>
          <thead>
            <tr><th>Staff</th><th>Department</th><th>Date</th><th>Time</th><th>Status</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {shifts.map((shift) => (
              <tr key={shift._id}>
                <td>{staffLabel(shift.staffId)}</td>
                <td>{DEPARTMENT_LABELS[shift.department] ?? shift.department}</td>
                <td>{fmtDate(shift.date)}</td>
                <td>{shift.startTime}–{shift.endTime}</td>
                <td><StatusBadge status={shift.status} /></td>
                <td>
                  {shift.status !== 'cancelled' && (
                    <RoleGate perm={PERMISSIONS.STAFF_ROSTER_MANAGE}>
                      <button type="button" data-btn-ghost data-btn-sm data-destructive
                        onClick={() => setCancelId(shift._id)}>
                        Cancel
                      </button>
                    </RoleGate>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <Modal open={showNew} onClose={() => { setShowNew(false); form.reset(); }} title="New shift">
        <form onSubmit={form.handleSubmit((v) => createMutation.mutate(v))} noValidate data-form>
          <div data-form-group>
            <label htmlFor="sh-staff">Staff member</label>
            <select id="sh-staff" defaultValue="" {...form.register('staffId')}>
              <option value="" disabled>Select…</option>
              {(staff ?? []).map((s) => (
                <option key={s._id} value={s._id}>{s.firstName} {s.lastName} ({s.role.replace(/_/g, ' ')})</option>
              ))}
            </select>
            <InlineError message={form.formState.errors.staffId?.message} />
          </div>
          <div data-form-group>
            <label htmlFor="sh-dept">Department</label>
            <select id="sh-dept" defaultValue="" {...form.register('department')}>
              <option value="" disabled>Select…</option>
              {DEPARTMENTS.map((d) => <option key={d} value={d}>{DEPARTMENT_LABELS[d]}</option>)}
            </select>
            <InlineError message={form.formState.errors.department?.message} />
          </div>
          <div data-form-group>
            <label htmlFor="sh-date">Date</label>
            <input id="sh-date" type="date" {...form.register('date')} />
            <InlineError message={form.formState.errors.date?.message} />
          </div>
          <div data-form-row>
            <div data-form-group>
              <label htmlFor="sh-start">Start time</label>
              <input id="sh-start" type="time" {...form.register('startTime')} />
              <InlineError message={form.formState.errors.startTime?.message} />
            </div>
            <div data-form-group>
              <label htmlFor="sh-end">End time</label>
              <input id="sh-end" type="time" {...form.register('endTime')} />
              <InlineError message={form.formState.errors.endTime?.message} />
            </div>
          </div>
          <div data-form-group>
            <label htmlFor="sh-budget">Budgeted hours <span data-optional>(optional)</span></label>
            <input id="sh-budget" type="number" min={0} step="0.5" {...form.register('budgetedHours')} />
          </div>
          <div data-modal-actions>
            <button type="button" data-btn-ghost onClick={() => { setShowNew(false); form.reset(); }}>Cancel</button>
            <button type="submit" data-btn-primary disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Creating…' : 'Create shift'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!cancelId}
        title="Cancel this shift?"
        message="The assigned staff member will no longer be scheduled for this shift."
        confirmLabel="Cancel shift"
        cancelLabel="Keep shift"
        destructive
        onConfirm={() => { if (cancelId) cancelMutation.mutate(cancelId); }}
        onCancel={() => setCancelId(null)}
      />
    </section>
  );
}

// =============================================================================
// TIME CLOCK TAB — self-service clock in/out + (manager) entries & labour cost
// =============================================================================

function TimeClockTab(): React.ReactElement {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: entries, isLoading: entriesLoading } = useQuery({
    queryKey: rosterKeys.timeclockEntries(),
    queryFn: () => api.roster.getTimeclockEntries(),
  });

  const { data: labourCost } = useQuery({
    queryKey: rosterKeys.labourCost(),
    queryFn: () => api.roster.getLabourCost(),
  });

  const clockInMutation = useMutation({
    mutationFn: () => api.roster.clockIn({ method: 'manual' }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: rosterKeys.timeclockEntries() });
      toast('Clocked in.', 'success');
    },
    onError: (err: ApiError) => toast(err.message ?? 'Failed to clock in.', 'error'),
  });

  const clockOutMutation = useMutation({
    mutationFn: () => api.roster.clockOut(),
    onSuccess: (entry) => {
      void queryClient.invalidateQueries({ queryKey: rosterKeys.timeclockEntries() });
      toast(`Clocked out — ${entry.hoursWorked ?? 0}h worked.`, 'success');
    },
    onError: (err: ApiError) => toast(err.message ?? 'Failed to clock out.', 'error'),
  });

  return (
    <section data-tab-panel>
      <div data-header-actions>
        <button type="button" data-btn-primary
          disabled={clockInMutation.isPending}
          onClick={() => clockInMutation.mutate()}>
          {clockInMutation.isPending ? 'Clocking in…' : 'Clock in'}
        </button>
        <button type="button" data-btn-ghost
          disabled={clockOutMutation.isPending}
          onClick={() => clockOutMutation.mutate()}>
          {clockOutMutation.isPending ? 'Clocking out…' : 'Clock out'}
        </button>
      </div>

      <RoleGate perm={PERMISSIONS.STAFF_MANAGE}>
        {labourCost && labourCost.length > 0 && (
          <div data-stat-grid>
            {labourCost.map((row) => (
              <div key={row.department} data-stat-card>
                <span data-stat-label>{DEPARTMENT_LABELS[row.department as (typeof DEPARTMENTS)[number]] ?? row.department}</span>
                <span data-stat-value>{row.totalHours}h</span>
                <span data-stat-sublabel>{row.headcount} staff · {row.overtimeHours}h overtime</span>
              </div>
            ))}
          </div>
        )}

        <h2>Recent time clock entries</h2>
        {entriesLoading ? <SkeletonLoader rows={4} /> : !entries?.length ? (
          <p data-empty-note>No time clock entries yet.</p>
        ) : (
          <table data-table>
            <thead>
              <tr><th>Staff</th><th>Clocked in</th><th>Clocked out</th><th>Hours</th><th>Overtime</th></tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e._id}>
                  <td>{staffLabel(e.staffId)}</td>
                  <td>{new Date(e.clockInAt).toLocaleString('en-ZA', { dateStyle: 'short', timeStyle: 'short' })}</td>
                  <td>{e.clockOutAt ? new Date(e.clockOutAt).toLocaleString('en-ZA', { dateStyle: 'short', timeStyle: 'short' }) : '—'}</td>
                  <td>{e.hoursWorked ?? '—'}</td>
                  <td>{e.overtimeHours || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </RoleGate>
    </section>
  );
}

// =============================================================================
// STAFF TAB — directory, drills into /hr/profiles/[staffId]
// =============================================================================

function StaffTab(): React.ReactElement {
  const { data: staff, isLoading } = useQuery({
    queryKey: staffKeys.list(),
    queryFn: () => api.staff.list(),
  });

  if (isLoading) return <SkeletonLoader rows={5} />;
  if (!staff?.length) return <EmptyState title="No staff yet" description="Add staff members under Settings to see them here." />;

  return (
    <section data-tab-panel>
      <table data-table>
        <thead>
          <tr><th>Name</th><th>Role</th><th>Email</th><th>Status</th><th /></tr>
        </thead>
        <tbody>
          {staff.map((s: StaffMember) => (
            <tr key={s._id}>
              <td>{s.firstName} {s.lastName}</td>
              <td>{s.role.replace(/_/g, ' ')}</td>
              <td>{s.email}</td>
              <td><StatusBadge status={s.status} /></td>
              <td>
                <Link href={`/hr/profiles/${s._id}`} data-btn-ghost data-btn-sm>
                  HR record
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

// =============================================================================
// TIMESHEETS TAB — preview, export to CSV, past exports
// =============================================================================

function currentPeriod(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function TimesheetsTab(): React.ReactElement {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [period, setPeriod] = useState(currentPeriod());

  const { data: preview, isLoading } = useQuery({
    queryKey: hrKeys.timesheets(period),
    queryFn: () => api.hr.getTimesheets(period),
  });

  const { data: exportsList } = useQuery({
    queryKey: hrKeys.timesheetExports(),
    queryFn: () => api.hr.listTimesheetExports(),
  });

  const exportMutation = useMutation({
    mutationFn: () => api.hr.exportTimesheets(period),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: hrKeys.timesheetExports() });
      toast('Timesheet exported as CSV.', 'success');
    },
    onError: (err: ApiError) => toast(err.message ?? 'Export failed.', 'error'),
  });

  return (
    <section data-tab-panel>
      <div data-section-header>
        <input
          type="month"
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          aria-label="Timesheet period"
        />
        <RoleGate perm={PERMISSIONS.PAYROLL_EXPORT_READ}>
          <button type="button" data-btn-primary
            disabled={exportMutation.isPending}
            onClick={() => exportMutation.mutate()}>
            {exportMutation.isPending ? 'Exporting…' : 'Export CSV'}
          </button>
        </RoleGate>
      </div>

      <RoleGate perm={PERMISSIONS.PAYROLL_EXPORT_READ}>
        {isLoading ? <SkeletonLoader rows={4} /> : !preview?.length ? (
          <p data-empty-note>No completed shifts with clock-out times for this period yet.</p>
        ) : (
          <table data-table>
            <thead>
              <tr><th>Staff</th><th>Role</th><th>Hours</th><th>Overtime</th><th>Est. cost</th></tr>
            </thead>
            <tbody>
              {preview.map((row) => (
                <tr key={row.staffId}>
                  <td>{row.staff ? `${row.staff.firstName} ${row.staff.lastName}` : row.staffId}</td>
                  <td>{row.staff?.role.replace(/_/g, ' ') ?? '—'}</td>
                  <td>{row.totalHours}</td>
                  <td>{row.overtimeHours || '—'}</td>
                  <td>{fmtZAR(row.estimatedCost)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {!!exportsList?.length && (
          <>
            <h2>Past exports</h2>
            <table data-table>
              <thead>
                <tr><th>Period</th><th>Staff</th><th>Total hours</th><th>Generated</th><th /></tr>
              </thead>
              <tbody>
                {exportsList.map((exp) => (
                  <tr key={exp._id}>
                    <td>{exp.period}</td>
                    <td>{exp.summary?.totalStaff ?? '—'}</td>
                    <td>{exp.summary?.totalHours ?? '—'}</td>
                    <td>{fmtDate(exp.createdAt)}</td>
                    <td>
                      {exp.status === 'generated' && exp.fileUrl ? (
                        <DownloadButton href={exp.fileUrl} filename={`timesheet-${exp.period}.csv`} label="Download" />
                      ) : (
                        <StatusBadge status={exp.status} />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </RoleGate>
    </section>
  );
}
