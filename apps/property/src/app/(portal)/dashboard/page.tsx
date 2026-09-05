'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@stayos/api-client';
import { SkeletonLoader, StatusBadge, Icons, PageHeader, StatCard, Panel, LinkArrow, useSocketEvent } from '@stayos/ui';
import { SOCKET_EVENTS } from '@stayos/constants';
import { dashboardKeys, bookingKeys, roomKeys } from '@/lib/query-keys';

// tenants.service.js#getDashboard only ever returns these four counts —
// occupancy%, room revenue and RevPAR are not computed server-side yet.
interface DashboardSummary {
  arrivalsToday: number;
  departuresToday: number;
  currentGuests: number;
  totalRooms: number;
}

export default function DashboardPage(): React.ReactElement {
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: dashboard, isLoading } = useQuery({
    queryKey: dashboardKeys.summary(),
    queryFn: () => api.tenants.getDashboard() as unknown as Promise<DashboardSummary>,
    staleTime: 60_000,
  });

  const { data: arrivals } = useQuery({
    queryKey: bookingKeys.list({ type: 'arrivals' }),
    queryFn: () => api.bookings.list({ checkInFrom: new Date().toISOString().slice(0, 10) } as Parameters<typeof api.bookings.list>[0]),
    staleTime: 60_000,
  });

  const { data: statusBoard } = useQuery({
    queryKey: roomKeys.statusBoard(),
    queryFn: () => api.rooms.getStatusBoard(),
    staleTime: 30_000,
  });

  // Same fix as rooms/page.tsx — see SOCKET_EVENTS.ROOM_STATUS_CHANGED's
  // comment for why this couldn't just be 'room:status:updated'.
  useSocketEvent(SOCKET_EVENTS.ROOM_STATUS_CHANGED, () => {
    void queryClient.invalidateQueries({ queryKey: roomKeys.statusBoard() });
  });

  if (isLoading) return <SkeletonLoader rows={6} />;

  const d = dashboard;
  // Occupancy isn't returned by the backend — derived here from the two
  // counts it does return (checked-in bookings ≈ occupied rooms). Remove
  // this once tenants.service.js#getDashboard returns a real occupancyRate.
  const occupancyRate =
    d && d.totalRooms > 0 ? Math.round((d.currentGuests / d.totalRooms) * 100) : null;

  return (
    <div data-page="dashboard">
      <PageHeader
        title="Dashboard"
        actions={
          <button type="button" data-btn-ghost onClick={() => router.push('/rooms/calendar')}>
            View calendar
          </button>
        }
      />

      {/* Key metrics */}
      <div data-stat-grid>
        <StatCard
          icon={Icons.Percent}
          tone="green"
          label="Occupancy"
          value={occupancyRate != null ? `${occupancyRate}%` : '—'}
        />
        <StatCard
          icon={Icons.CalendarCheck2}
          tone="blue"
          label="Arrivals today"
          value={d?.arrivalsToday ?? '—'}
        />
        <StatCard
          icon={Icons.DoorClosed}
          tone="amber"
          label="Departures today"
          value={d?.departuresToday ?? '—'}
        />
        <StatCard
          icon={Icons.Bed}
          tone="purple"
          label="In house"
          value={d?.currentGuests ?? '—'}
        />
        {/* Not available yet — backend has no room-rate revenue rollup. */}
        <StatCard icon={Icons.Banknote} tone="teal" label="Room revenue" value="—" />
        <StatCard icon={Icons.TrendingUp} tone="rose" label="RevPAR" value="—" />
      </div>

      <div data-dashboard-grid>
        {/* Today's arrivals */}
        <Panel
          title="Arrivals today"
          headerActions={<LinkArrow onClick={() => router.push('/bookings?checkIn=today')}>View all</LinkArrow>}
        >
          {!arrivals?.length ? (
            <p data-empty-note>No arrivals today.</p>
          ) : (
            <div data-arrival-list>
              {(arrivals ?? []).slice(0, 6).map((booking) => (
                <div key={booking._id} data-arrival-row>
                  <div data-arrival-guest>
                    <span data-guest-name>
                      {`${booking.customerId?.firstName ?? ''} ${booking.customerId?.lastName ?? ''}`.trim() || '—'}
                    </span>
                    <span data-guest-room>Room {booking.roomId?.roomNumber ?? '—'}</span>
                  </div>
                  <StatusBadge status={booking.status} />
                  <button type="button" data-btn-ghost data-btn-sm onClick={() => router.push(`/bookings/${booking._id}`)}>
                    View
                  </button>
                </div>
              ))}
            </div>
          )}
        </Panel>

        {/* Room status snapshot */}
        <Panel
          title="Room status"
          headerActions={<LinkArrow onClick={() => router.push('/rooms')}>Status board</LinkArrow>}
        >
          {/* getStatusBoard returns { rooms, grouped } — statusBoard itself
              has no .length, so this used to always take the empty-state
              branch below regardless of how many rooms actually existed. */}
          {!statusBoard?.rooms.length ? (
            <p data-empty-note>No rooms configured.</p>
          ) : (
            <div data-room-status-list>
              {statusBoard.rooms.slice(0, 8).map((room) => (
                <div key={room._id} data-room-status-row>
                  <span data-room-number>{room.roomNumber}</span>
                  <span data-room-type>{room.type}</span>
                  <StatusBadge status={room.status} />
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}
