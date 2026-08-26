'use client';

import React from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { api } from '@stayos/api-client';
import { SkeletonLoader, StatusBadge } from '@stayos/ui';
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

  if (isLoading) return <SkeletonLoader rows={6} />;

  const d = dashboard;
  // Occupancy isn't returned by the backend — derived here from the two
  // counts it does return (checked-in bookings ≈ occupied rooms). Remove
  // this once tenants.service.js#getDashboard returns a real occupancyRate.
  const occupancyRate =
    d && d.totalRooms > 0 ? Math.round((d.currentGuests / d.totalRooms) * 100) : null;

  const metrics = [
    { label: 'Occupancy', value: occupancyRate != null ? `${occupancyRate}%` : '—' },
    { label: 'Arrivals today', value: d?.arrivalsToday ?? '—' },
    { label: 'Departures today', value: d?.departuresToday ?? '—' },
    { label: 'In house', value: d?.currentGuests ?? '—' },
    // Not available yet — backend has no room-rate revenue rollup.
    { label: 'Room revenue', value: '—' },
    { label: 'RevPAR', value: '—' },
  ];

  return (
    <div data-page="dashboard">
      <div data-page-header>
        <h1>Dashboard</h1>
        <Link href="/rooms/calendar" data-btn-ghost>View calendar</Link>
      </div>

      {/* Key metrics */}
      <div data-metric-row>
        {metrics.map((m) => (
          <div key={m.label} data-metric-card>
            <span data-metric-label>{m.label}</span>
            <span data-metric-value>{String(m.value)}</span>
          </div>
        ))}
      </div>

      <div data-dashboard-grid>
        {/* Today's arrivals */}
        <section data-dashboard-section>
          <div data-section-header>
            <h2>Arrivals today</h2>
            <Link href="/bookings?checkIn=today" data-link-action>View all</Link>
          </div>
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
                  <Link href={`/bookings/${booking._id}`} data-btn-ghost data-btn-sm>View</Link>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Room status snapshot */}
        <section data-dashboard-section>
          <div data-section-header>
            <h2>Room status</h2>
            <Link href="/rooms" data-link-action>Status board</Link>
          </div>
          {!statusBoard?.length ? (
            <p data-empty-note>No rooms configured.</p>
          ) : (
            <div data-room-status-list>
              {(statusBoard ?? []).slice(0, 8).map((room) => (
                <div key={room._id} data-room-status-row>
                  <span data-room-number>{room.roomNumber}</span>
                  <span data-room-type>{room.type}</span>
                  <StatusBadge status={room.status} />
                  <StatusBadge status={room.housekeepingStatus} />
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
