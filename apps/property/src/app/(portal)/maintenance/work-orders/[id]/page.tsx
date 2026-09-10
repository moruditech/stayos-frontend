'use client';

import Link from 'next/link';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { api } from '@stayos/api-client';
import type { ApiError, WorkOrder } from '@stayos/api-client';
import {
  SkeletonLoader, StatusBadge, ReadOnlyField, RoleGate, useToast, Icons } from '@stayos/ui';
import { PERMISSIONS } from '@stayos/constants';
import { maintenanceKeys, staffKeys } from '@/lib/query-keys';

const MX_ROLES = ['maintenance_technician', 'maintenance_supervisor', 'property_admin', 'property_manager'];

export default function WorkOrderDetailPage(): React.ReactElement {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [noteText, setNoteText] = useState('');
  const [assignId, setAssignId] = useState('');
  const [closing, setClosing] = useState(false);
  const [resolution, setResolution] = useState('');

  const { data: wo, isLoading } = useQuery({
    queryKey: maintenanceKeys.workOrder(id),
    queryFn: () => api.maintenance.getWorkOrder(id),
    staleTime: 30_000,
  });

  const { data: allStaff } = useQuery({
    queryKey: staffKeys.list(),
    queryFn: () => api.staff.list(),
    staleTime: 120_000,
    enabled: !!wo,
  });

  const mxStaff = (allStaff ?? []).filter((s) => MX_ROLES.includes(s.role));

  const statusMutation = useMutation({
    mutationFn: (status: WorkOrder['status']) => api.maintenance.updateStatus(id, status),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: maintenanceKeys.workOrder(id) });
      void queryClient.invalidateQueries({ queryKey: maintenanceKeys.workOrders({}) });
      toast('Status updated.', 'success');
    },
    onError: (err: ApiError) => toast(err.message ?? 'Failed.', 'error'),
  });

  const assignMutation = useMutation({
    mutationFn: (assigneeId: string) => api.maintenance.assignWorkOrder(id, assigneeId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: maintenanceKeys.workOrder(id) });
      setAssignId('');
      toast('Assigned.', 'success');
    },
    onError: (err: ApiError) => toast(err.message ?? 'Failed.', 'error'),
  });

  const noteMutation = useMutation({
    mutationFn: (text: string) => api.maintenance.addNote(id, text),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: maintenanceKeys.workOrder(id) });
      setNoteText('');
      toast('Note added.', 'success');
    },
    onError: (err: ApiError) => toast(err.message ?? 'Failed.', 'error'),
  });

  const closeMutation = useMutation({
    mutationFn: () => api.maintenance.closeWorkOrder(id, { resolution: resolution.trim() || undefined }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: maintenanceKeys.workOrder(id) });
      void queryClient.invalidateQueries({ queryKey: maintenanceKeys.workOrders({}) });
      setClosing(false);
      setResolution('');
      toast('Work order closed.', 'success');
    },
    onError: (err: ApiError) => toast(err.message ?? 'Failed.', 'error'),
  });

  if (isLoading) return <SkeletonLoader rows={5} />;
  if (!wo) return <p>Work order not found.</p>;

  const assigneeName = wo.assignedTo && typeof wo.assignedTo === 'object'
    ? `${wo.assignedTo.firstName} ${wo.assignedTo.lastName}`
    : '—';
  const roomLabel = wo.roomId && typeof wo.roomId === 'object'
    ? `Room ${wo.roomId.roomNumber}`
    : wo.location ?? '—';
  // 'closed' is the only terminal status (see MaintenanceWorkOrder.model.js) —
  // 'completed'/'verified' still show the action bar so a supervisor can
  // close them out.
  const isOpen = wo.status !== 'closed';

  return (
    <div data-page="wo-detail">
      <div data-page-header>
        <div>
          <Link href="/maintenance/work-orders" data-breadcrumb><Icons.ChevronLeft data-breadcrumb-icon aria-hidden="true" /> Work orders</Link>
          <h1>WO-{id.slice(-4).toUpperCase()}</h1>
        </div>
        <div data-header-right>
          <span data-priority-badge data-priority={wo.priority}>{wo.priority}</span>
          <StatusBadge status={wo.status} />
        </div>
      </div>

      <div data-detail-grid>
        <section data-detail-section>
          <h2>Details</h2>
          <div data-field-list>
            <ReadOnlyField label="Title" value={wo.title} />
            <ReadOnlyField label="Description" value={wo.description} />
            <ReadOnlyField label="Category" value={wo.category.replace(/_/g, ' ')} />
            <ReadOnlyField label="Location" value={roomLabel} />
            <ReadOnlyField label="Assigned to" value={assigneeName} />
            {wo.slaTarget && (
              <ReadOnlyField label="SLA target" value={new Date(wo.slaTarget).toLocaleString('en-ZA', { dateStyle: 'short', timeStyle: 'short' })} />
            )}
            {wo.closedAt && (
              <ReadOnlyField label="Closed" value={new Date(wo.closedAt).toLocaleDateString('en-ZA')} />
            )}
            {wo.resolution && (
              <ReadOnlyField label="Resolution" value={wo.resolution} />
            )}
          </div>
        </section>

        <section data-detail-section>
          <h2>Activity log</h2>
          {!wo.notes.length ? (
            <p data-empty-note>No notes yet.</p>
          ) : (
            <div data-note-list>
              {wo.notes.map((note, idx) => (
                <div key={idx} data-note-item>
                  <p data-note-text>{note.text}</p>
                  <span data-note-meta>
                    {new Date(note.addedAt).toLocaleString('en-ZA', { dateStyle: 'short', timeStyle: 'short' })}
                  </span>
                </div>
              ))}
            </div>
          )}

          {isOpen && (
            <div data-note-compose>
              <textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Add a note…"
                rows={2}
                data-note-input
              />
              <button
                type="button"
                data-btn-ghost data-btn-sm
                disabled={!noteText.trim() || noteMutation.isPending}
                onClick={() => noteMutation.mutate(noteText.trim())}
              >
                {noteMutation.isPending ? 'Adding…' : 'Add note'}
              </button>
            </div>
          )}
        </section>
      </div>

      {isOpen && (
        <div data-action-bar>
          {(wo.status === 'submitted' || wo.status === 'assigned') && (
            <button type="button" data-btn-ghost
              onClick={() => statusMutation.mutate('in_progress')}>
              Start work
            </button>
          )}
          {wo.status === 'in_progress' && (
            <>
              <button type="button" data-btn-ghost
                onClick={() => statusMutation.mutate('on_hold')}>
                Put on hold
              </button>
              <button type="button" data-btn-ghost
                onClick={() => statusMutation.mutate('completed')}>
                Mark completed
              </button>
            </>
          )}
          {wo.status === 'on_hold' && (
            <button type="button" data-btn-ghost
              onClick={() => statusMutation.mutate('in_progress')}>
              Resume
            </button>
          )}

          <RoleGate perm={PERMISSIONS.MAINTENANCE_ALL}>
            <div data-assign-row>
              <select value={assignId} onChange={(e) => setAssignId(e.target.value)} data-assign-select>
                <option value="">Assign to…</option>
                {mxStaff.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.firstName} {s.lastName} ({s.role.replace(/_/g, ' ')})
                  </option>
                ))}
              </select>
              <button type="button" data-btn-ghost
                disabled={!assignId || assignMutation.isPending}
                onClick={() => { if (assignId) assignMutation.mutate(assignId); }}>
                Assign
              </button>
            </div>

            {!closing ? (
              <button type="button" data-btn-primary onClick={() => setClosing(true)}>
                Close work order
              </button>
            ) : (
              <div data-note-compose>
                <textarea
                  value={resolution}
                  onChange={(e) => setResolution(e.target.value)}
                  placeholder="What was done to resolve this? (optional)"
                  rows={2}
                  data-note-input
                />
                <div data-action-cluster>
                  <button type="button" data-btn-ghost data-btn-sm
                    onClick={() => { setClosing(false); setResolution(''); }}>
                    Cancel
                  </button>
                  <button type="button" data-btn-primary data-btn-sm
                    disabled={closeMutation.isPending}
                    onClick={() => closeMutation.mutate()}>
                    {closeMutation.isPending ? 'Closing…' : 'Confirm close'}
                  </button>
                </div>
              </div>
            )}
          </RoleGate>
        </div>
      )}
    </div>
  );
}
