'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { api } from '@stayos/api-client';
import type { ApiError } from '@stayos/api-client';
import {
  SkeletonLoader, StatusBadge, ReadOnlyField, RoleGate, useToast, ConfirmDialog,
} from '@stayos/ui';
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
  const [confirmClose, setConfirmClose] = useState(false);

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
    mutationFn: (status: string) => api.maintenance.updateStatus(id, status),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: maintenanceKeys.workOrder(id) });
      void queryClient.invalidateQueries({ queryKey: maintenanceKeys.workOrders({}) });
      toast('Status updated.', 'success');
    },
    onError: (err: ApiError) => toast(err.message ?? 'Failed.', 'error'),
  });

  const assignMutation = useMutation({
    mutationFn: (assignedTo: string) => api.maintenance.assignWorkOrder(id, assignedTo),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: maintenanceKeys.workOrder(id) });
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
    mutationFn: () => api.maintenance.closeWorkOrder(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: maintenanceKeys.workOrder(id) });
      void queryClient.invalidateQueries({ queryKey: maintenanceKeys.workOrders({}) });
      setConfirmClose(false);
      toast('Work order closed.', 'success');
    },
    onError: (err: ApiError) => { setConfirmClose(false); toast(err.message ?? 'Failed.', 'error'); },
  });

  if (isLoading) return <SkeletonLoader rows={5} />;
  if (!wo) return <p>Work order not found.</p>;

  const assigneeName = wo.assignedTo && typeof wo.assignedTo === 'object'
    ? `${wo.assignedTo.firstName} ${wo.assignedTo.lastName}`
    : '—';
  const roomLabel = wo.roomId && typeof wo.roomId === 'object'
    ? `Room ${wo.roomId.roomNumber}`
    : wo.location ?? '—';
  const isOpen = !['closed', 'cancelled'].includes(wo.status);

  return (
    <div data-page="wo-detail">
      <div data-page-header>
        <div>
          <a href="/maintenance/work-orders" data-breadcrumb>← Work orders</a>
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
            <ReadOnlyField label="Location" value={roomLabel} />
            <ReadOnlyField label="Assigned to" value={assigneeName} />
            {wo.dueDate && (
              <ReadOnlyField label="Due" value={new Date(wo.dueDate).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })} />
            )}
            {wo.closedAt && (
              <ReadOnlyField label="Closed" value={new Date(wo.closedAt).toLocaleDateString('en-ZA')} />
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
                    {new Date(note.createdAt).toLocaleString('en-ZA', { dateStyle: 'short', timeStyle: 'short' })}
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
          {wo.status === 'open' && (
            <button type="button" data-btn-ghost
              onClick={() => statusMutation.mutate('in_progress')}>
              Start work
            </button>
          )}
          {wo.status === 'in_progress' && (
            <button type="button" data-btn-ghost
              onClick={() => statusMutation.mutate('on_hold')}>
              Put on hold
            </button>
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

            <button type="button" data-btn-primary
              onClick={() => setConfirmClose(true)}>
              Close work order
            </button>
          </RoleGate>
        </div>
      )}

      <ConfirmDialog
        open={confirmClose}
        title="Close this work order?"
        message="Closing marks the issue as resolved. This action cannot be undone."
        confirmLabel="Close work order"
        cancelLabel="Cancel"
        onConfirm={() => closeMutation.mutate()}
        onCancel={() => setConfirmClose(false)}
      />
    </div>
  );
}
