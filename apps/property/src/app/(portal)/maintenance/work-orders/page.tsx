'use client';

import Link from 'next/link';

/**
 * Maintenance — work orders list and summary.
 *
 * TAD 11 §7:
 *  - Any staff member can create a work order (no permission check on POST).
 *  - Assignment requires maintenance:* — client-side assignee picker filtered
 *    to maintenance-relevant roles since backend does not validate assignee role.
 *  - Close/assign/update require maintenance:*.
 */

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api } from '@stayos/api-client';
import type { ApiError } from '@stayos/api-client';
import {
  SkeletonLoader,
  EmptyState,
  StatusBadge,
  useToast,
  useSocketEvent,
  Modal,
  InlineError,
  applyServerErrors,
  StatCard,
  Icons,
} from '@stayos/ui';
import { maintenanceKeys } from '@/lib/query-keys';

// Must match the backend exactly (src/models/MaintenanceWorkOrder.model.js) —
// field names here are what applyServerErrors maps 422 responses onto.
const CATEGORIES = ['plumbing', 'electrical', 'hvac', 'appliance', 'structural', 'pest', 'cosmetic', 'it', 'pool', 'other'] as const;
const PRIORITIES = ['critical', 'high', 'normal', 'low'] as const;

const createSchema = z.object({
  title:       z.string().min(1, 'Title is required'),
  description: z.string().min(1, 'Description is required'),
  category:    z.enum(CATEGORIES, { errorMap: () => ({ message: 'Select a category' }) }),
  location:    z.string().optional(),
  priority:    z.enum(PRIORITIES).default('normal'),
});
type CreateInput = z.infer<typeof createSchema>;

const CATEGORY_LABELS: Record<(typeof CATEGORIES)[number], string> = {
  plumbing: 'Plumbing', electrical: 'Electrical', hvac: 'HVAC', appliance: 'Appliance',
  structural: 'Structural', pest: 'Pest control', cosmetic: 'Cosmetic', it: 'IT',
  pool: 'Pool', other: 'Other',
};

const STATUS_FILTERS = ['submitted', 'assigned', 'in_progress', 'on_hold', 'completed', 'verified', 'closed'] as const;

export default function MaintenancePage(): React.ReactElement {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showNewModal, setShowNewModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');

  const filters = statusFilter ? { status: statusFilter } : {};

  const { data: workOrders, isLoading } = useQuery({
    queryKey: maintenanceKeys.workOrders(filters),
    queryFn: () => api.maintenance.listWorkOrders(filters),
  });

  const { data: analytics } = useQuery({
    queryKey: maintenanceKeys.analytics(),
    queryFn: () => api.maintenance.getAnalytics(),
    staleTime: 60_000,
  });

  const { data: schedules } = useQuery({
    queryKey: maintenanceKeys.schedules(),
    queryFn: () => api.maintenance.listSchedules(),
    staleTime: 120_000,
  });

  // Real-time
  useSocketEvent('maintenance:updated', () => {
    void queryClient.invalidateQueries({ queryKey: maintenanceKeys.workOrders({}) });
    void queryClient.invalidateQueries({ queryKey: maintenanceKeys.analytics() });
  });

  const form = useForm<CreateInput>({
    resolver: zodResolver(createSchema),
    defaultValues: { priority: 'normal' },
  });

  const createMutation = useMutation({
    mutationFn: (input: CreateInput) => api.maintenance.createWorkOrder(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: maintenanceKeys.workOrders({}) });
      void queryClient.invalidateQueries({ queryKey: maintenanceKeys.analytics() });
      setShowNewModal(false);
      form.reset({ priority: 'normal' });
      toast('Work order created.', 'success');
    },
    onError: (err: ApiError) => {
      if (err.code === 'VALIDATION_ERROR') {
        applyServerErrors(form, err);
        const hasUnattachedError = err.fields?.some((f) => !f.field);
        if (hasUnattachedError || !err.fields?.length) toast(err.message, 'error');
      } else {
        toast(err.message ?? 'Failed to create work order.', 'error');
      }
    },
  });

  // byStatus/byCategory are unfiltered totals from the analytics endpoint —
  // independent of the table's status filter above, so these stay accurate
  // no matter what's selected in the dropdown.
  const byStatus = analytics?.byStatus ?? [];
  const statusCount = (s: string): number => byStatus.find((b) => b._id === s)?.count ?? 0;
  const openCount = byStatus.reduce((sum, b) => (
    ['closed', 'verified'].includes(b._id) ? sum : sum + b.count
  ), 0);

  const metrics: Array<{ label: string; value: string; icon: keyof typeof Icons; tone: 'amber' | 'blue' | 'rose' | 'green' }> = [
    { label: 'Open', value: String(openCount), icon: 'Wrench', tone: 'amber' },
    { label: 'In progress', value: String(statusCount('in_progress')), icon: 'Clock', tone: 'blue' },
    { label: 'SLA breaches', value: String(analytics?.slaBreaches ?? '—'), icon: 'AlertTriangle', tone: 'rose' },
    { label: 'Avg resolution', value: analytics ? `${analytics.avgResolutionHours}h` : '—', icon: 'CheckCircle2', tone: 'green' },
  ];

  return (
    <div data-page="maintenance">
      <div data-page-header>
        <div>
          <h1>Maintenance</h1>
          <p data-page-subtitle>Manage work orders, assets and preventive maintenance</p>
        </div>
        <div data-header-actions>
          <Link href="/maintenance/assets" data-btn-ghost>Assets</Link>
          <button
            type="button"
            data-btn-primary
            onClick={() => setShowNewModal(true)}
          >
            + New work order
          </button>
        </div>
      </div>

      {/* Metrics */}
      <div data-stat-grid>
        {metrics.map((m) => (
          <StatCard key={m.label} icon={Icons[m.icon]} tone={m.tone} label={m.label} value={m.value} />
        ))}
      </div>

      <div data-maintenance-grid>
        {/* Work orders */}
        <section data-maintenance-section data-wo-section>
          <div data-section-header>
            <h2>Work orders</h2>
            <div data-filter-bar>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                data-filter-select
              >
                <option value="">All ({workOrders?.length ?? 0})</option>
                {STATUS_FILTERS.map((s) => (
                  <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                ))}
              </select>
            </div>
          </div>

          {isLoading ? (
            <SkeletonLoader rows={5} />
          ) : !workOrders?.length ? (
            <EmptyState title="No work orders" description="Report a maintenance issue to get started." />
          ) : (
            <table data-table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Description</th>
                  <th>Location</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Assigned to</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {workOrders.map((wo) => {
                  const assigneeName =
                    wo.assignedTo && typeof wo.assignedTo === 'object'
                      ? `${wo.assignedTo.firstName} ${wo.assignedTo.lastName}`
                      : '—';
                  const locationLabel =
                    wo.roomId && typeof wo.roomId === 'object' ? `Room ${wo.roomId.roomNumber}` : wo.location ?? '—';
                  return (
                    <tr key={wo._id} data-wo-row>
                      <td data-wo-id>WO-{wo._id.slice(-4).toUpperCase()}</td>
                      <td>{wo.title}</td>
                      <td>{locationLabel}</td>
                      <td>
                        <span data-priority-badge data-priority={wo.priority}>
                          {wo.priority}
                        </span>
                      </td>
                      <td><StatusBadge status={wo.status} /></td>
                      <td>{assigneeName}</td>
                      <td>
                        <Link href={`/maintenance/work-orders/${wo._id}`} data-btn-ghost data-btn-sm>
                          View
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </section>

        {/* Preventive maintenance */}
        <section data-maintenance-section data-pm-section>
          <div data-section-header>
            <h2>Preventive maintenance</h2>
            <Link href="/maintenance/schedules" data-link-action>View all</Link>
          </div>
          {!schedules?.length ? (
            <p data-empty-note>No schedules configured.</p>
          ) : (
            <div data-pm-list>
              {(schedules ?? []).slice(0, 5).map((s) => (
                <div key={s._id} data-pm-row>
                  <span data-pm-title>{s.title}</span>
                  <span data-pm-frequency>{s.frequency}</span>
                  <span data-pm-next>
                    {new Date(s.nextRunDate).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* New work order modal */}
      <Modal
        open={showNewModal}
        onClose={() => setShowNewModal(false)}
        title="New work order"
      >
        <form
          onSubmit={form.handleSubmit((v) => createMutation.mutate(v))}
          noValidate
          data-form
        >
          <div data-form-group>
            <label htmlFor="woTitle">Title</label>
            <input id="woTitle" type="text" placeholder="e.g. AC not cooling" {...form.register('title')} />
            <InlineError message={form.formState.errors.title?.message} />
          </div>
          <div data-form-group>
            <label htmlFor="woDesc">Description</label>
            <textarea id="woDesc" rows={3} {...form.register('description')} />
            <InlineError message={form.formState.errors.description?.message} />
          </div>
          <div data-form-row>
            <div data-form-group>
              <label htmlFor="woCategory">Category</label>
              <select id="woCategory" defaultValue="" {...form.register('category')}>
                <option value="" disabled>Select…</option>
                {CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
              </select>
              <InlineError message={form.formState.errors.category?.message} />
            </div>
            <div data-form-group>
              <label htmlFor="woPriority">Priority</label>
              <select id="woPriority" {...form.register('priority')}>
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
          </div>
          <div data-form-group>
            <label htmlFor="woLocation">Location <span data-optional>(optional)</span></label>
            <input id="woLocation" type="text" placeholder="e.g. Room 418, Lobby" {...form.register('location')} />
          </div>
          <div data-modal-actions>
            <button type="button" data-btn-ghost onClick={() => setShowNewModal(false)}>
              Cancel
            </button>
            <button type="submit" data-btn-primary disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Creating…' : 'Create work order'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
