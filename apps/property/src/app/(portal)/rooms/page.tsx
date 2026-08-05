'use client';

/**
 * Rooms & Availability — status board view.
 * The calendar matrix view lives at /rooms/calendar (separate page).
 * TAD 11 §4: status-board and calendar are the two primary operational views.
 */

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@stayos/api-client';
import type { ApiError } from '@stayos/api-client';
import {
  SkeletonLoader,
  EmptyState,
  StatusBadge,
  useToast,
  RoleGate,
  Modal,
  useSocketEvent,
} from '@stayos/ui';
import { PERMISSIONS, SOCKET_EVENTS } from '@stayos/constants';
import { roomKeys } from '@/lib/query-keys';

export default function RoomsPage(): React.ReactElement {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [statusModalRoomId, setStatusModalRoomId] = useState<string | null>(null);
  const [newStatus, setNewStatus] = useState('');

  const { data: statusBoard, isLoading } = useQuery({
    queryKey: roomKeys.statusBoard(),
    queryFn: () => api.rooms.getStatusBoard(),
    staleTime: 30_000,
  });

  // Real-time room status updates
  useSocketEvent('room:status:updated', () => {
    void queryClient.invalidateQueries({ queryKey: roomKeys.statusBoard() });
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.rooms.updateStatus(id, status),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: roomKeys.statusBoard() });
      setStatusModalRoomId(null);
      toast('Room status updated.', 'success');
    },
    onError: (err: ApiError) => toast(err.message ?? 'Failed.', 'error'),
  });

  if (isLoading) return <SkeletonLoader rows={6} />;

  const rooms = statusBoard ?? [];

  return (
    <div data-page="rooms">
      <div data-page-header>
        <div>
          <h1>Rooms &amp; Availability</h1>
          <p data-page-subtitle>Live status board</p>
        </div>
        <div data-header-actions>
          <a href="/rooms/calendar" data-btn-ghost>Calendar view</a>
          <RoleGate perm={PERMISSIONS.ROOM_MANAGE}>
            <a href="/rooms/new" data-btn-primary>+ Add room</a>
          </RoleGate>
        </div>
      </div>

      {/* Quick counts */}
      <div data-room-summary-bar>
        {(['occupied', 'available', 'dirty', 'out_of_order', 'blocked'] as const).map((s) => {
          const count = rooms.filter(
            (r) => r.status === s || r.housekeepingStatus === s
          ).length;
          return (
            <div key={s} data-summary-chip data-room-status={s}>
              <span data-summary-count>{count}</span>
              <span data-summary-label>{s.replace(/_/g, ' ')}</span>
            </div>
          );
        })}
      </div>

      {!rooms.length ? (
        <EmptyState
          title="No rooms yet"
          description="Add your first room to get started."
          action={
            <RoleGate perm={PERMISSIONS.ROOM_MANAGE}>
              <a href="/rooms/new" data-btn-primary>Add room</a>
            </RoleGate>
          }
        />
      ) : (
        <div data-room-status-board>
          <table data-table>
            <thead>
              <tr>
                <th>Room</th>
                <th>Type</th>
                <th>Floor</th>
                <th>Status</th>
                <th>Housekeeping</th>
                <th>Current guest</th>
                <th>Check-out</th>
                <th>Rate</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rooms.map((room) => (
                <tr key={room._id} data-room-row>
                  <td data-room-number-cell>
                    <a href={`/rooms/${room._id}`} data-table-link>
                      {room.roomNumber}
                    </a>
                  </td>
                  <td>{room.type}</td>
                  <td>{String((room as Record<string,unknown>)['floor'] ?? '—')}</td>
                  <td><StatusBadge status={room.status} /></td>
                  <td><StatusBadge status={room.housekeepingStatus} /></td>
                  <td>
                    {room.currentGuest
                      ? room.currentGuest.name
                      : <span data-empty-cell>—</span>}
                  </td>
                  <td>
                    {room.checkOut
                      ? new Date(room.checkOut).toLocaleDateString('en-ZA')
                      : <span data-empty-cell>—</span>}
                  </td>
                  <td>
                    {new Intl.NumberFormat('en-ZA', {
                      style: 'currency', currency: 'ZAR', maximumFractionDigits: 0,
                    }).format(room.ratePerNight)}
                  </td>
                  <td>
                    <RoleGate perm={PERMISSIONS.ROOM_STATUS_WRITE}>
                      <button
                        type="button"
                        data-btn-ghost data-btn-sm
                        onClick={() => {
                          setStatusModalRoomId(room._id);
                          setNewStatus(room.status);
                        }}
                      >
                        Update status
                      </button>
                    </RoleGate>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Status update modal */}
      <Modal
        open={!!statusModalRoomId}
        onClose={() => setStatusModalRoomId(null)}
        title="Update room status"
      >
        <div data-modal-form>
          <div data-form-group>
            <label htmlFor="newStatus">New status</label>
            <select
              id="newStatus"
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value)}
            >
              <option value="available">Available</option>
              <option value="occupied">Occupied</option>
              <option value="dirty">Dirty</option>
              <option value="out_of_order">Out of order</option>
              <option value="blocked">Blocked</option>
            </select>
          </div>
          <div data-modal-actions>
            <button
              type="button"
              data-btn-ghost
              onClick={() => setStatusModalRoomId(null)}
            >
              Cancel
            </button>
            <button
              type="button"
              data-btn-primary
              disabled={updateStatusMutation.isPending}
              onClick={() => {
                if (statusModalRoomId) {
                  updateStatusMutation.mutate({ id: statusModalRoomId, status: newStatus });
                }
              }}
            >
              {updateStatusMutation.isPending ? 'Updating…' : 'Update'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
