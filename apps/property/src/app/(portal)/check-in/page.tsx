'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@stayos/api-client';
import type { ApiError } from '@stayos/api-client';
import type { PopulatedBooking } from '@stayos/types';
import { SkeletonLoader, StatusBadge, Modal, RoleGate, Icons, useToast, EmptyBlock } from '@stayos/ui';
import { PERMISSIONS } from '@stayos/constants';
import { bookingKeys, guestRegisterKeys } from '@/lib/query-keys';
import { GuestRegisterCaptureForm } from '@/components/GuestRegisterCaptureForm';

function guestName(booking: PopulatedBooking): string {
  const name = `${booking.customerId?.firstName ?? ''} ${booking.customerId?.lastName ?? ''}`.trim();
  return name || 'Guest';
}

function guestCount(booking: PopulatedBooking): string {
  const adults = booking.adults ?? 0;
  const children = booking.children ?? 0;
  if (!adults && !children) return '—';
  const parts = [];
  if (adults) parts.push(`${adults} adult${adults === 1 ? '' : 's'}`);
  if (children) parts.push(`${children} child${children === 1 ? '' : 'ren'}`);
  return parts.join(', ');
}

/**
 * One arrival row. A separate component (rather than inlined in the .map())
 * because each row needs its own "has a register entry already?" query —
 * arrivals() returns plain bookings with no register join, and there's no
 * bulk-lookup endpoint on the backend for this, so each row checks for
 * itself. At the scale of a single day's arrivals this is cheap and simple
 * rather than adding a new bulk endpoint for it.
 */
function ArrivalRow({
  booking,
  onCaptureRegister,
}: {
  booking: PopulatedBooking;
  onCaptureRegister: (bookingId: string) => void;
}): React.ReactElement {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: registerEntry, isLoading: isLoadingRegister } = useQuery({
    queryKey: guestRegisterKeys.byBooking(booking._id),
    queryFn: () => api.guestregister.getByBooking(booking._id),
  });

  const checkInMutation = useMutation({
    mutationFn: () => api.bookings.checkIn(booking._id),
    onSuccess: () => {
      // .all rather than just .arrivals(): the dashboard's arrival count and
      // the bookings list both show this booking's status too.
      void queryClient.invalidateQueries({ queryKey: bookingKeys.all });
      toast(`${guestName(booking)} checked in.`, 'success');
    },
    onError: (err: ApiError) => {
      if (err.code === 'GUEST_REGISTER_REQUIRED') {
        onCaptureRegister(booking._id);
      } else {
        toast(err.message ?? 'Failed to check in.', 'error');
      }
    },
  });

  const hasRegisterEntry = Boolean(registerEntry);

  return (
    <tr data-row>
      <td>
        <div data-cell-entity-name>{guestName(booking)}</div>
        <div data-cell-entity-sub>{booking.confirmationNumber ?? booking._id.slice(-8).toUpperCase()}</div>
      </td>
      <td>{booking.roomId?.roomNumber ?? '—'}</td>
      <td>{guestCount(booking)}</td>
      <td>
        {isLoadingRegister ? (
          <SkeletonLoader rows={1} />
        ) : (
          <StatusBadge status={hasRegisterEntry ? 'verified' : 'pending_vetting'} />
        )}
      </td>
      <td data-row-actions>
        <Link href={`/bookings/${booking._id}`} data-btn-ghost data-btn-sm>
          View
        </Link>
        <RoleGate perm={[PERMISSIONS.CHECKIN_PROCESS, PERMISSIONS.CHECKIN_ALL]}>
          {hasRegisterEntry ? (
            <button
              type="button"
              data-btn-primary
              data-btn-sm
              onClick={() => checkInMutation.mutate()}
              disabled={checkInMutation.isPending}
            >
              {checkInMutation.isPending ? 'Checking in…' : 'Check in'}
            </button>
          ) : (
            <button
              type="button"
              data-btn-primary
              data-btn-sm
              disabled={isLoadingRegister}
              onClick={() => onCaptureRegister(booking._id)}
            >
              Capture register
            </button>
          )}
        </RoleGate>
      </td>
    </tr>
  );
}

export default function CheckInPage(): React.ReactElement {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [registerModalBookingId, setRegisterModalBookingId] = useState<string | null>(null);

  const { data: arrivals, isLoading } = useQuery({
    queryKey: bookingKeys.arrivals(),
    queryFn: () => api.bookings.arrivals(),
  });

  const filtered = useMemo(() => {
    if (!arrivals) return [];
    const q = search.trim().toLowerCase();
    if (!q) return arrivals;
    return arrivals.filter((b) =>
      guestName(b).toLowerCase().includes(q) ||
      (b.confirmationNumber ?? '').toLowerCase().includes(q) ||
      (b.roomId?.roomNumber ?? '').toLowerCase().includes(q)
    );
  }, [arrivals, search]);

  const selectedGuestName = arrivals?.find((b) => b._id === registerModalBookingId);

  return (
    <div data-page="check-in">
      <div data-page-header>
        <h1>Check-in</h1>
        <p data-page-subtitle>Today&apos;s arrivals</p>
      </div>

      {!isLoading && arrivals && arrivals.length > 0 && (
        <div data-filter-bar>
          <div data-filter-search>
            <Icons.Search aria-hidden="true" />
            <input
              type="search"
              placeholder="Search guest, room or confirmation number"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      )}

      {isLoading ? (
        <SkeletonLoader rows={5} />
      ) : !arrivals || arrivals.length === 0 ? (
        <EmptyBlock
          icon={Icons.KeyRound}
          title="No arrivals today"
          description="Confirmed bookings checking in today will show up here."
        />
      ) : filtered.length === 0 ? (
        <EmptyBlock icon={Icons.KeyRound} title="No matches" description="Try a different search." />
      ) : (
        <div data-table-wrap>
          <table data-table>
            <thead>
              <tr>
                <th>Guest</th>
                <th>Room</th>
                <th>Guests</th>
                <th>Register</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {filtered.map((booking) => (
                <ArrivalRow
                  key={booking._id}
                  booking={booking}
                  onCaptureRegister={setRegisterModalBookingId}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={Boolean(registerModalBookingId)}
        onClose={() => setRegisterModalBookingId(null)}
        title="Capture guest register"
      >
        {registerModalBookingId && (
          <GuestRegisterCaptureForm
            bookingId={registerModalBookingId}
            defaultFullName={selectedGuestName ? guestName(selectedGuestName) : undefined}
            onCaptured={() => {
              const bookingId = registerModalBookingId;
              setRegisterModalBookingId(null);
              void queryClient.invalidateQueries({ queryKey: guestRegisterKeys.byBooking(bookingId) });
            }}
          />
        )}
      </Modal>
    </div>
  );
}
