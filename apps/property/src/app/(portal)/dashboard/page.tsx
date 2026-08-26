'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@stayos/api-client';
import { SkeletonLoader, StatusBadge } from '@stayos/ui';
import { dashboardKeys, bookingKeys, roomKeys } from '@/lib/query-keys';

function formatCurrency(n: number): string {
  return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR', maximumFractionDigits: 0 }).format(n);
}

export default function DashboardPage(): React.ReactElement {
  const { data: dashboard, isLoading } = useQuery({
    queryKey: dashboardKeys.summary(),
    queryFn: () => api.tenants.getDashboard(),
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

  const d = dashboard as unknown as Record<string, unknown> ?? {};
  const metrics = [
    { label: 'Occupancy', value: d['occupancyRate'] != null ? `${Math.round(Number(d['occupancyRate']))}%` : '—' },
    { label: 'Arrivals today', value: d['arrivalsToday'] ?? '—' },
    { label: 'Departures today', value: d['departuresToday'] ?? '—' },
    { label: 'In house', value: d['inHouseGuests'] ?? '—' },
    { label: 'Room revenue', value: d['roomRevenueToday'] != null ? formatCurrency(Number(d['roomRevenueToday'])) : '—' },
    { label: 'RevPAR', value: d['revpar'] != null ? formatCurrency(Number(d['revpar'])) : '—' },
  ];

  return (
    <div data-page="dashboard">
      <div data-page-header>
        <h1>Dashboard</h1>
        <a href="/rooms/calendar" data-btn-ghost>View calendar</a>
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
            <a href="/bookings?checkIn=today" data-link-action>View all</a>
          </div>
          {!arrivals?.length ? (
            <p data-empty-note>No arrivals today.</p>
          ) : (
            <div data-arrival-list>
              {(arrivals ?? []).slice(0, 6).map((booking) => (
                <div key={booking._id} data-arrival-row>
                  <div data-arrival-guest>
                    <span data-guest-name>{String((booking as unknown as Record<string,unknown>)['guestName'] ?? booking.guestId)}</span>
                    <span data-guest-room>Room {String((booking as unknown as Record<string,unknown>)['roomNumber'] ?? '—')}</span>
                  </div>
                  <StatusBadge status={booking.status} />
                  <a href={`/bookings/${booking._id}`} data-btn-ghost data-btn-sm>View</a>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Room status snapshot */}
        <section data-dashboard-section>
          <div data-section-header>
            <h2>Room status</h2>
            <a href="/rooms" data-link-action>Status board</a>
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
