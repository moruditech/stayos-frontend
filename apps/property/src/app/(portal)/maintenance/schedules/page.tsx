'use client';

import Link from 'next/link';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api } from '@stayos/api-client';
import type { ApiError } from '@stayos/api-client';
import { SkeletonLoader, EmptyState, useToast, Modal, InlineError, ConfirmDialog, applyServerErrors, Icons } from '@stayos/ui';
import { maintenanceKeys } from '@/lib/query-keys';

// Must match the backend exactly (src/models/MaintenanceSchedule.model.js).
const CATEGORIES = ['inspection', 'servicing', 'cleaning', 'testing', 'replacement', 'other'] as const;
const FREQUENCIES = ['daily', 'weekly', 'fortnightly', 'monthly', 'quarterly', 'bi_annual', 'annual', 'custom'] as const;

const CATEGORY_LABELS: Record<(typeof CATEGORIES)[number], string> = {
  inspection: 'Inspection', servicing: 'Servicing', cleaning: 'Cleaning',
  testing: 'Testing', replacement: 'Replacement', other: 'Other',
};
const FREQUENCY_LABELS: Record<(typeof FREQUENCIES)[number], string> = {
  daily: 'Daily', weekly: 'Weekly', fortnightly: 'Fortnightly', monthly: 'Monthly',
  quarterly: 'Every 3 months', bi_annual: 'Every 6 months', annual: 'Annually', custom: 'Custom interval',
};

const scheduleSchema = z.object({
  title:        z.string().min(1, 'Title is required'),
  description:  z.string().optional(),
  category:     z.enum(CATEGORIES, { errorMap: () => ({ message: 'Select a category' }) }),
  frequency:    z.enum(FREQUENCIES),
  intervalDays: z.coerce.number().int().positive().optional(),
  nextRunDate:  z.string().min(1, 'Next run date is required'),
});
type ScheduleInput = z.infer<typeof scheduleSchema>;

export default function SchedulesPage(): React.ReactElement {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showNew, setShowNew] = useState(false);
  const [runNowId, setRunNowId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: schedules, isLoading } = useQuery({
    queryKey: maintenanceKeys.schedules(),
    queryFn: () => api.maintenance.listSchedules(),
    staleTime: 120_000,
  });

  const form = useForm<ScheduleInput>({
    resolver: zodResolver(scheduleSchema),
    defaultValues: { frequency: 'monthly' },
  });
  const frequency = form.watch('frequency');

  const createMutation = useMutation({
    mutationFn: (input: ScheduleInput) => api.maintenance.createSchedule(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: maintenanceKeys.schedules() });
      setShowNew(false); form.reset({ frequency: 'monthly' });
      toast('Schedule created.', 'success');
    },
    onError: (err: ApiError) => {
      if (err.code === 'VALIDATION_ERROR') {
        applyServerErrors(form, err);
        const hasUnattachedError = err.fields?.some((f) => !f.field);
        if (hasUnattachedError || !err.fields?.length) toast(err.message, 'error');
      } else {
        toast(err.message ?? 'Failed to create schedule.', 'error');
      }
    },
  });

  const runNowMutation = useMutation({
    mutationFn: (id: string) => api.maintenance.runScheduleNow(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: maintenanceKeys.workOrders({}) });
      void queryClient.invalidateQueries({ queryKey: maintenanceKeys.schedules() });
      setRunNowId(null);
      toast('Work order created from schedule.', 'success');
    },
    onError: (err: ApiError) => { setRunNowId(null); toast(err.message ?? 'Failed.', 'error'); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.maintenance.deleteSchedule(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: maintenanceKeys.schedules() });
      setDeleteId(null);
      toast('Schedule deleted.', 'success');
    },
    onError: (err: ApiError) => { setDeleteId(null); toast(err.message ?? 'Failed.', 'error'); },
  });

  return (
    <div data-page="schedules">
      <div data-page-header>
        <div>
          <Link href="/maintenance/work-orders" data-breadcrumb><Icons.ChevronLeft data-breadcrumb-icon aria-hidden="true" /> Maintenance</Link>
          <h1>Preventive maintenance schedules</h1>
        </div>
        <button type="button" data-btn-primary onClick={() => setShowNew(true)}>
          + New schedule
        </button>
      </div>

      {isLoading ? <SkeletonLoader rows={4} /> : !schedules?.length ? (
        <EmptyState
          title="No schedules"
          description="Create recurring maintenance schedules to stay on top of asset servicing."
          action={<button type="button" data-btn-primary onClick={() => setShowNew(true)}>Create schedule</button>}
        />
      ) : (
        <table data-table>
          <thead>
            <tr>
              <th>Title</th>
              <th>Category</th>
              <th>Frequency</th>
              <th>Next run</th>
              <th>Last run</th>
              <th>Active</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {schedules.map((s) => (
              <tr key={s._id}>
                <td>{s.title}</td>
                <td>{CATEGORY_LABELS[s.category] ?? s.category}</td>
                <td>{FREQUENCY_LABELS[s.frequency] ?? s.frequency}</td>
                <td>{new Date(s.nextRunDate).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                <td>{s.lastRunDate ? new Date(s.lastRunDate).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' }) : '—'}</td>
                <td>{s.isActive ? 'Yes' : 'No'}</td>
                <td>
                  <div data-action-cluster>
                    <button type="button" data-btn-ghost data-btn-sm onClick={() => setRunNowId(s._id)}>
                      Run now
                    </button>
                    <button type="button" data-btn-ghost data-btn-sm data-destructive onClick={() => setDeleteId(s._id)}>
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <Modal open={showNew} onClose={() => setShowNew(false)} title="New schedule">
        <form onSubmit={form.handleSubmit((v) => createMutation.mutate(v))} noValidate data-form>
          <div data-form-group>
            <label htmlFor="sch-title">Title</label>
            <input id="sch-title" type="text" placeholder="e.g. AC System Inspection" {...form.register('title')} />
            <InlineError message={form.formState.errors.title?.message} />
          </div>
          <div data-form-group>
            <label htmlFor="sch-desc">Description <span data-optional>(optional)</span></label>
            <textarea id="sch-desc" rows={2} {...form.register('description')} />
          </div>
          <div data-form-group>
            <label htmlFor="sch-cat">Category</label>
            <select id="sch-cat" defaultValue="" {...form.register('category')}>
              <option value="" disabled>Select…</option>
              {CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
            </select>
            <InlineError message={form.formState.errors.category?.message} />
          </div>
          <div data-form-row>
            <div data-form-group>
              <label htmlFor="sch-freq">Frequency</label>
              <select id="sch-freq" {...form.register('frequency')}>
                {FREQUENCIES.map((f) => <option key={f} value={f}>{FREQUENCY_LABELS[f]}</option>)}
              </select>
              <InlineError message={form.formState.errors.frequency?.message} />
            </div>
            <div data-form-group>
              <label htmlFor="sch-next">First run date</label>
              <input id="sch-next" type="date" {...form.register('nextRunDate')} />
              <InlineError message={form.formState.errors.nextRunDate?.message} />
            </div>
          </div>
          {frequency === 'custom' && (
            <div data-form-group>
              <label htmlFor="sch-interval">Repeat every (days)</label>
              <input id="sch-interval" type="number" min={1} {...form.register('intervalDays')} />
              <InlineError message={form.formState.errors.intervalDays?.message} />
            </div>
          )}
          <div data-modal-actions>
            <button type="button" data-btn-ghost onClick={() => setShowNew(false)}>Cancel</button>
            <button type="submit" data-btn-primary disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Creating…' : 'Create schedule'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!runNowId}
        title="Run this schedule now?"
        message="This will create a new work order immediately from this schedule."
        confirmLabel="Run now"
        cancelLabel="Cancel"
        onConfirm={() => { if (runNowId) runNowMutation.mutate(runNowId); }}
        onCancel={() => setRunNowId(null)}
      />

      <ConfirmDialog
        open={!!deleteId}
        title="Delete this schedule?"
        message="This schedule will be permanently removed. Existing work orders created from it are not affected."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        destructive
        onConfirm={() => { if (deleteId) deleteMutation.mutate(deleteId); }}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
