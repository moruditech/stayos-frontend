'use client';

import Link from 'next/link';

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

  // Real-time room status updates. Was listening for 'room:status:updated'
  // (an unverified guess) while the backend actually emits
  // 'room:status_changed' — so a status change made in one tab/session
  // never live-updated any other open tab or session; it only showed up
  // after a manual refresh, since the direct invalidateQueries() call in
  // the mutation's own onSuccess below was masking this for the tab that
  // made the change.
  useSocketEvent(SOCKET_EVENTS.ROOM_STATUS_CHANGED, () => {
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

  // getStatusBoard returns { rooms, grouped } — not a bare array. Calling
  // .filter/.map directly on the whole response (as this used to) throws
  // "TypeError: statusBoard.filter is not a function", since a plain
  // object has no .filter — that's the "Application error: a client-side
  // exception" this page was producing.
  const rooms = statusBoard?.rooms ?? [];

  return (
    <div data-page="rooms">
      <div data-page-header>
        <div>
          <h1>Rooms &amp; Availability</h1>
          <p data-page-subtitle>Live status board</p>
        </div>
        <div data-header-actions>
          <Link href="/rooms/calendar" data-btn-ghost>Calendar view</Link>
          <RoleGate perm={PERMISSIONS.ROOM_MANAGE}>
            <Link href="/rooms/new" data-btn-primary>+ Add room</Link>
          </RoleGate>
        </div>
      </div>

      {/* Quick counts */}
      <div data-room-summary-bar>
        {(['occupied', 'available', 'dirty', 'out_of_order', 'blocked'] as const).map((s) => {
          const count = rooms.filter((r) => r.status === s).length;
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
              <Link href="/rooms/new" data-btn-primary>Add room</Link>
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
                    <Link href={`/rooms/${room._id}`} data-table-link>
                      {room.roomNumber}
                    </Link>
                  </td>
                  <td>{room.type}</td>
                  <td>{room.floor ?? '—'}</td>
                  <td><StatusBadge status={room.status} /></td>
                  <td>
                    {room.currentBooking?.customerId
                      ? `${room.currentBooking.customerId.firstName} ${room.currentBooking.customerId.lastName}`
                      : <span data-empty-cell>—</span>}
                  </td>
                  <td>
                    {room.currentBooking?.checkOut
                      ? new Date(room.currentBooking.checkOut).toLocaleDateString('en-ZA')
                      : <span data-empty-cell>—</span>}
                  </td>
                  <td>
                    {new Intl.NumberFormat('en-ZA', {
                      style: 'currency', currency: 'ZAR', maximumFractionDigits: 0,
                    }).format(room.baseRate)}
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
