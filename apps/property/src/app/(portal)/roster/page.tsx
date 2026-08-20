'use client';

/**
 * Roster & Time Clock — TAD 11 §11.
 *
 * Permission rules:
 *   staff:roster:manage   → create/cancel shifts
 *   staff:manage          → view all timeclock entries, labour cost
 *   (no permission)       → clock in/out (self-action), request swap (own shift)
 *
 * Biometric consent (give/withdraw) is self-action ONLY — a manager cannot
 * act on behalf of a subordinate. The biometric consent section is rendered
 * for the current user's own record, not for managed staff.
 */

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@stayos/api-client';
import type { ApiError } from '@stayos/api-client';
import {
  SkeletonLoader,
  EmptyState,
  RoleGate,
  useToast,
  ConfirmDialog,
  Modal,
  InlineError,
} from '@stayos/ui';
import { PERMISSIONS } from '@stayos/constants';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { rosterKeys } from '@/lib/query-keys';
import { useSession } from '@stayos/auth';

const shiftSchema = z.object({
  staffId:   z.string().min(1, 'Staff member required'),
  startTime: z.string().min(1, 'Start time required'),
  endTime:   z.string().min(1, 'End time required'),
  role:      z.string().optional(),
  notes:     z.string().optional(),
});
type ShiftInput = z.infer<typeof shiftSchema>;

export default function RosterPage(): React.ReactElement {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const session = useSession();
  const [activeTab, setActiveTab] = useState<'roster' | 'timeclock'>('roster');
  const [showNewShiftModal, setShowNewShiftModal] = useState(false);
  const [clockedIn, setClockedIn] = useState(false);
  const [confirmBiometric, setConfirmBiometric] = useState<'give' | 'withdraw' | null>(null);

  const { data: roster, isLoading: rosterLoading } = useQuery({
    queryKey: rosterKeys.roster(),
    queryFn: () => api.roster.getRoster(),
  });

  const { data: staff } = useQuery({
    queryKey: ['staff', 'list'],
    queryFn: () => api.staff.list(),
  });

  const form = useForm<ShiftInput>({ resolver: zodResolver(shiftSchema) });

  const createShiftMutation = useMutation({
    mutationFn: (input: ShiftInput) => api.roster.createShift(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: rosterKeys.roster() });
      setShowNewShiftModal(false);
      form.reset();
      toast('Shift created.', 'success');
    },
    onError: (err: ApiError) => {
      if (err.code === 'VALIDATION_ERROR') {
        Object.entries(err.fields ?? {}).forEach(([field, message]) => {
          form.setError(field as keyof ShiftInput, { message: (message as {message:string}).message });
        });
      } else {
        toast(err.message ?? 'Failed.', 'error');
      }
    },
  });

  const clockInMutation = useMutation({
    mutationFn: () => api.roster.clockIn(),
    onSuccess: () => {
      setClockedIn(true);
      toast('Clocked in successfully.', 'success');
    },
    onError: (err: ApiError) => toast(err.message ?? 'Clock-in failed.', 'error'),
  });

  const clockOutMutation = useMutation({
    mutationFn: () => api.roster.clockOut(),
    onSuccess: () => {
      setClockedIn(false);
      toast('Clocked out.', 'success');
    },
    onError: (err: ApiError) => toast(err.message ?? 'Clock-out failed.', 'error'),
  });

  const biometricMutation = useMutation({
    mutationFn: (action: 'give' | 'withdraw') =>
      action === 'give'
        ? api.roster.giveBiometricConsent()
        : api.roster.withdrawBiometricConsent(),
    onSuccess: (_, action) => {
      setConfirmBiometric(null);
      toast(
        action === 'give'
          ? 'Biometric consent given.'
          : 'Biometric consent withdrawn.',
        'success'
      );
    },
    onError: (err: ApiError) => {
      setConfirmBiometric(null);
      toast(err.message ?? 'Failed.', 'error');
    },
  });

  return (
    <div data-page="roster">
      <div data-page-header>
        <h1>Roster &amp; Time Clock</h1>
        <div data-header-actions>
          <RoleGate perm={PERMISSIONS.STAFF_ROSTER_MANAGE}>
            <button type="button" data-btn-primary onClick={() => setShowNewShiftModal(true)}>
              + Add shift
            </button>
          </RoleGate>
        </div>
      </div>

      {/* Tab bar */}
      <div data-tab-bar role="tablist">
        <button
          type="button" role="tab"
          aria-selected={activeTab === 'roster'}
          data-tab data-active={activeTab === 'roster' || undefined}
          onClick={() => setActiveTab('roster')}
        >Roster</button>
        <button
          type="button" role="tab"
          aria-selected={activeTab === 'timeclock'}
          data-tab data-active={activeTab === 'timeclock' || undefined}
          onClick={() => setActiveTab('timeclock')}
        >Time clock</button>
      </div>

      {activeTab === 'roster' && (
        <div data-roster-view>
          {rosterLoading ? (
            <SkeletonLoader rows={5} />
          ) : !roster?.length ? (
            <EmptyState
              title="No shifts scheduled"
              description="Create shifts to assign staff to their working hours."
              action={
                <RoleGate perm={PERMISSIONS.STAFF_ROSTER_MANAGE}>
                  <button type="button" data-btn-primary onClick={() => setShowNewShiftModal(true)}>
                    Add first shift
                  </button>
                </RoleGate>
              }
            />
          ) : (
            <table data-table>
              <thead>
                <tr>
                  <th>Staff member</th>
                  <th>Start</th>
                  <th>End</th>
                  <th>Role</th>
                  <th>Notes</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {(roster ?? []).map((shift) => {
                  const s = shift as unknown as Record<string, unknown>;
                  return (
                    <tr key={String(s['_id'])}>
                      <td>{String(s['staffName'] ?? s['staffId'] ?? '—')}</td>
                      <td>{s['startTime'] ? new Date(String(s['startTime'])).toLocaleString('en-ZA', { dateStyle: 'short', timeStyle: 'short' }) : '—'}</td>
                      <td>{s['endTime'] ? new Date(String(s['endTime'])).toLocaleString('en-ZA', { dateStyle: 'short', timeStyle: 'short' }) : '—'}</td>
                      <td>{String(s['role'] ?? '—')}</td>
                      <td>{String(s['notes'] ?? '')}</td>
                      <td>
                        <RoleGate perm={PERMISSIONS.STAFF_ROSTER_MANAGE}>
                          <button
                            type="button" data-btn-ghost data-btn-sm data-destructive
                            onClick={() => {
                              void api.roster.cancelShift(String(s['_id'])).then(() => {
                                void queryClient.invalidateQueries({ queryKey: rosterKeys.roster() });
                                toast('Shift cancelled.', 'success');
                              }).catch((err: ApiError) => toast(err.message ?? 'Failed.', 'error'));
                            }}
                          >
                            Cancel
                          </button>
                        </RoleGate>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {activeTab === 'timeclock' && (
        <div data-timeclock-view>
          {/* Self-service clock in/out — no permission required */}
          <section data-timeclock-self>
            <h2>Your time clock</h2>
            <div data-clock-actions>
              {clockedIn ? (
                <button
                  type="button"
                  data-btn-primary data-btn-lg data-clock-out
                  disabled={clockOutMutation.isPending}
                  onClick={() => clockOutMutation.mutate()}
                >
                  {clockOutMutation.isPending ? 'Clocking out…' : 'Clock out'}
                </button>
              ) : (
                <button
                  type="button"
                  data-btn-primary data-btn-lg data-clock-in
                  disabled={clockInMutation.isPending}
                  onClick={() => clockInMutation.mutate()}
                >
                  {clockInMutation.isPending ? 'Clocking in…' : 'Clock in'}
                </button>
              )}
            </div>

            {/* Biometric consent — self-action only, never acted on by a manager */}
            <div data-biometric-consent>
              <h3>Biometric consent</h3>
              <p data-field-hint>
                You can give or withdraw consent for biometric time-clock recording at any
                time. Only you can manage this setting.
              </p>
              <div data-consent-actions>
                <button
                  type="button" data-btn-ghost
                  onClick={() => setConfirmBiometric('give')}
                >
                  Give consent
                </button>
                <button
                  type="button" data-btn-ghost data-destructive
                  onClick={() => setConfirmBiometric('withdraw')}
                >
                  Withdraw consent
                </button>
              </div>
            </div>
          </section>

          {/* All entries — staff:manage only */}
          <RoleGate perm={PERMISSIONS.STAFF_MANAGE}>
            <section data-timeclock-entries>
              <h2>All clock entries</h2>
              <TimeclockEntries queryClient={queryClient} />
            </section>
          </RoleGate>
        </div>
      )}

      {/* Add shift modal */}
      <Modal open={showNewShiftModal} onClose={() => setShowNewShiftModal(false)} title="Add shift">
        <form onSubmit={form.handleSubmit((v) => createShiftMutation.mutate(v))} noValidate data-form>
          <div data-form-group>
            <label htmlFor="shiftStaff">Staff member</label>
            <select id="shiftStaff" {...form.register('staffId')}>
              <option value="">Select staff…</option>
              {(staff ?? []).map((s) => (
                <option key={s._id} value={s._id}>
                  {s.firstName} {s.lastName} ({s.role.replace(/_/g, ' ')})
                </option>
              ))}
            </select>
            <InlineError message={form.formState.errors.staffId?.message} />
          </div>
          <div data-form-row>
            <div data-form-group>
              <label htmlFor="shiftStart">Start</label>
              <input id="shiftStart" type="datetime-local" {...form.register('startTime')} />
              <InlineError message={form.formState.errors.startTime?.message} />
            </div>
            <div data-form-group>
              <label htmlFor="shiftEnd">End</label>
              <input id="shiftEnd" type="datetime-local" {...form.register('endTime')} />
              <InlineError message={form.formState.errors.endTime?.message} />
            </div>
          </div>
          <div data-form-group>
            <label htmlFor="shiftNotes">Notes <span data-optional>(optional)</span></label>
            <textarea id="shiftNotes" rows={2} {...form.register('notes')} />
          </div>
          <div data-modal-actions>
            <button type="button" data-btn-ghost onClick={() => setShowNewShiftModal(false)}>Cancel</button>
            <button type="submit" data-btn-primary disabled={createShiftMutation.isPending}>
              {createShiftMutation.isPending ? 'Creating…' : 'Create shift'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!confirmBiometric}
        title={confirmBiometric === 'give' ? 'Give biometric consent?' : 'Withdraw biometric consent?'}
        message={confirmBiometric === 'give'
          ? 'You are consenting to biometric data being used for time-clock recording.'
          : 'Withdrawing consent stops biometric recording for your account. You can give consent again at any time.'}
        confirmLabel={confirmBiometric === 'give' ? 'Give consent' : 'Withdraw consent'}
        cancelLabel="Cancel"
        destructive={confirmBiometric === 'withdraw'}
        onConfirm={() => { if (confirmBiometric) biometricMutation.mutate(confirmBiometric); }}
        onCancel={() => setConfirmBiometric(null)}
      />
    </div>
  );
}

function TimeclockEntries({ queryClient }: { queryClient: ReturnType<typeof useQueryClient> }): React.ReactElement {
  const { data: entries, isLoading } = useQuery({
    queryKey: ['timeclock', 'entries'],
    queryFn: () => api.roster.getTimeclockEntries(),
  });

  if (isLoading) return <SkeletonLoader rows={4} />;
  if (!entries?.length) return <p data-empty-note>No entries found.</p>;

  return (
    <table data-table>
      <thead>
        <tr>
          <th>Staff</th>
          <th>Clock in</th>
          <th>Clock out</th>
          <th>Duration</th>
        </tr>
      </thead>
      <tbody>
        {entries.map((e) => {
          const entry = e as unknown as Record<string, unknown>;
          const inTime = entry['clockIn'] ? new Date(String(entry['clockIn'])) : null;
          const outTime = entry['clockOut'] ? new Date(String(entry['clockOut'])) : null;
          const duration = inTime && outTime
            ? `${Math.round((outTime.getTime() - inTime.getTime()) / 60000)} min`
            : 'In progress';
          return (
            <tr key={String(entry['_id'])}>
              <td>{String(entry['staffName'] ?? entry['staffId'] ?? '—')}</td>
              <td>{inTime ? inTime.toLocaleString('en-ZA', { dateStyle: 'short', timeStyle: 'short' }) : '—'}</td>
              <td>{outTime ? outTime.toLocaleString('en-ZA', { dateStyle: 'short', timeStyle: 'short' }) : '—'}</td>
              <td>{duration}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
