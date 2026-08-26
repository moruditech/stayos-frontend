'use client';

/**
 * Maintenance — work orders list and summary.
 * Matches the design image showing metrics bar, work order table with
 * status/priority, preventive maintenance list, and analytics.
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
} from '@stayos/ui';
import { maintenanceKeys } from '@/lib/query-keys';

const createSchema = z.object({
  title:       z.string().min(1, 'Title is required'),
  description: z.string().min(1, 'Description is required'),
  location:    z.string().optional(),
  priority:    z.enum(['low', 'medium', 'high']).default('medium'),
});
type CreateInput = z.infer<typeof createSchema>;

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
    defaultValues: { priority: 'medium' },
  });

  const createMutation = useMutation({
    mutationFn: (input: CreateInput) => api.maintenance.createWorkOrder(input as unknown as Parameters<typeof api.maintenance.createWorkOrder>[0]),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: maintenanceKeys.workOrders({}) });
      setShowNewModal(false);
      form.reset();
      toast('Work order created.', 'success');
    },
    onError: (err: ApiError) => {
      if (err.code === 'VALIDATION_ERROR') applyServerErrors(form, err);
      else toast(err.message ?? 'Failed.', 'error');
    },
  });

  const a = analytics as unknown as Record<string, unknown> ?? {};
  const metrics = [
    { label: 'Open', value: a['openWorkOrders'] ?? '—', key: 'open' },
    { label: 'In progress', value: a['inProgress'] ?? '—', key: 'in_progress' },
    { label: 'High priority', value: a['highPriority'] ?? '—', key: 'high' },
    { label: 'Completed today', value: a['completedToday'] ?? '—', key: 'done' },
    { label: 'Overdue', value: a['overdue'] ?? '—', key: 'overdue' },
    { label: 'Total assets', value: a['totalAssets'] ?? '—', key: 'assets' },
  ];

  return (
    <div data-page="maintenance">
      <div data-page-header>
        <div>
          <h1>Maintenance</h1>
          <p data-page-subtitle>Manage work orders, assets and preventive maintenance</p>
        </div>
        <div data-header-actions>
          <a href="/maintenance/assets" data-btn-ghost>Assets</a>
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
      <div data-metric-row>
        {metrics.map((m) => (
          <div key={m.key} data-metric-card>
            <span data-metric-label>{m.label}</span>
            <span data-metric-value>{String(m.value)}</span>
          </div>
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
                <option value="open">Open</option>
                <option value="in_progress">In progress</option>
                <option value="on_hold">On hold</option>
                <option value="closed">Completed</option>
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
                  <th>Due</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {workOrders.map((wo) => {
                  const assigneeName =
                    wo.assignedTo && typeof wo.assignedTo === 'object'
                      ? `${wo.assignedTo.firstName} ${wo.assignedTo.lastName}`
                      : '—';
                  return (
                    <tr key={wo._id} data-wo-row>
                      <td data-wo-id>WO-{wo._id.slice(-4).toUpperCase()}</td>
                      <td>{wo.title}</td>
                      <td>{wo.location ?? '—'}</td>
                      <td>
                        <span data-priority-badge data-priority={wo.priority}>
                          {wo.priority}
                        </span>
                      </td>
                      <td><StatusBadge status={wo.status} /></td>
                      <td>{assigneeName}</td>
                      <td>
                        {wo.dueDate
                          ? new Date(wo.dueDate).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })
                          : '—'}
                      </td>
                      <td>
                        <a href={`/maintenance/work-orders/${wo._id}`} data-btn-ghost data-btn-sm>
                          View
                        </a>
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
            <a href="/maintenance/schedules" data-link-action>View all</a>
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
                    {new Date(s.nextRun).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })}
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
          <div data-form-group>
            <label htmlFor="woLocation">Location <span data-optional>(optional)</span></label>
            <input id="woLocation" type="text" placeholder="e.g. Room 418, Lobby" {...form.register('location')} />
          </div>
          <div data-form-group>
            <label htmlFor="woPriority">Priority</label>
            <select id="woPriority" {...form.register('priority')}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
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
