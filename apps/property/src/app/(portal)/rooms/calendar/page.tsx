'use client';

import Link from 'next/link';

/**
 * Rooms calendar matrix — forward-looking booking grid.
 * TAD 11 §4: the calendar matrix is for forward-looking booking placement,
 * matching the design documentation's booking-grid specification.
 *
 * Backend: GET /rooms/calendar-matrix
 */

import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@stayos/api-client';
import { SkeletonLoader, useSocketEvent, Icons } from '@stayos/ui';
import { SOCKET_EVENTS } from '@stayos/constants';
import { roomKeys } from '@/lib/query-keys';

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function dayLabel(d: Date): { weekday: string; date: number; month: string } {
  return {
    weekday: d.toLocaleDateString('en-ZA', { weekday: 'short' }),
    date: d.getDate(),
    month: d.toLocaleDateString('en-ZA', { month: 'short' }),
  };
}

const VIEW_DAYS = 7;

export default function CalendarPage(): React.ReactElement {
  const queryClient = useQueryClient();
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });

  const dates = Array.from({ length: VIEW_DAYS }, (_, i) => addDays(startDate, i));
  const params = {
    from: isoDate(startDate),
    to: isoDate(addDays(startDate, VIEW_DAYS - 1)),
  };

  const { data: matrix, isLoading } = useQuery({
    queryKey: roomKeys.calendar(params),
    queryFn: () => api.rooms.getCalendarMatrix(params),
    staleTime: 30_000,
  });

  useSocketEvent(SOCKET_EVENTS.BOOKING_CREATED, () => {
    void queryClient.invalidateQueries({ queryKey: roomKeys.calendar(params) });
  });
  useSocketEvent(SOCKET_EVENTS.BOOKING_UPDATED, () => {
    void queryClient.invalidateQueries({ queryKey: roomKeys.calendar(params) });
  });

  const today = isoDate(new Date());

  // Status → colour token mapping matching the design spec
  const statusColor: Record<string, string> = {
    confirmed:    'var(--color-booking-confirmed)',
    checked_in:   'var(--color-booking-checked-in)',
    tentative:    'var(--color-booking-tentative)',
    blocked:      'var(--color-booking-blocked)',
    maintenance:  'var(--color-booking-maintenance)',
  };

  return (
    <div data-page="rooms-calendar">
      <div data-page-header>
        <div>
          <Link href="/rooms" data-breadcrumb><Icons.ChevronLeft data-breadcrumb-icon aria-hidden="true" /> Rooms</Link>
          <h1>Rooms &amp; Availability</h1>
          <p data-page-subtitle>Calendar view</p>
        </div>
        <div data-header-actions>
          <Link href="/rooms" data-btn-ghost>Status board</Link>
          <Link href="/bookings/new" data-btn-primary>+ New booking</Link>
        </div>
      </div>

      {/* Week navigator */}
      <div data-calendar-nav>
        <button
          type="button"
          data-btn-ghost
          onClick={() => setStartDate((d) => addDays(d, -7))}
          aria-label="Previous week"
        >
          ‹
        </button>
        <span data-calendar-range>
          {startDate.toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' })}
          {' – '}
          {addDays(startDate, VIEW_DAYS - 1).toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' })}
        </span>
        <button
          type="button"
          data-btn-ghost
          onClick={() => setStartDate(new Date())}
        >
          Today
        </button>
        <button
          type="button"
          data-btn-ghost
          onClick={() => setStartDate((d) => addDays(d, 7))}
          aria-label="Next week"
        >
          ›
        </button>
      </div>

      {isLoading ? (
        <SkeletonLoader rows={8} />
      ) : (
        <div data-calendar-matrix>
          <table data-calendar-table>
            <thead>
              <tr>
                <th data-calendar-room-col>Room</th>
                {dates.map((d) => {
                  const lbl = dayLabel(d);
                  const iso = isoDate(d);
                  return (
                    <th
                      key={iso}
                      data-calendar-day
                      data-today={iso === today || undefined}
                    >
                      <span data-day-weekday>{lbl.weekday}</span>
                      <span data-day-date>{lbl.date}</span>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {(matrix ?? []).map((row) => (
                <tr key={row.roomId} data-calendar-row>
                  <td data-calendar-room-label>
                    <span data-room-num>{row.roomNumber}</span>
                    <span data-room-type>{row.type}</span>
                  </td>
                  {dates.map((d) => {
                    const iso = isoDate(d);
                    const cell = row.dates[iso];
                    return (
                      <td
                        key={iso}
                        data-calendar-cell
                        data-today={iso === today || undefined}
                      >
                        {cell?.bookingId ? (
                          <Link href={`/bookings/${cell.bookingId}`}
                            data-booking-chip
                            style={{ backgroundColor: statusColor[cell.status] ?? statusColor['confirmed'] }}
                            title={cell.guestName}
                          >
                            <span data-booking-chip-guest>{cell.guestName}</span>
                          </Link>
                        ) : cell?.status === 'blocked' ? (
                          <div data-blocked-chip>Blocked</div>
                        ) : null}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>

          {/* Legend */}
          <div data-calendar-legend>
            {[
              { label: 'Confirmed', key: 'confirmed' },
              { label: 'Checked in', key: 'checked_in' },
              { label: 'Tentative', key: 'tentative' },
              { label: 'Blocked', key: 'blocked' },
              { label: 'Maintenance', key: 'maintenance' },
            ].map(({ label, key }) => (
              <span key={key} data-legend-item>
                <span
                  data-legend-dot
                  style={{ backgroundColor: statusColor[key] ?? '#ccc' }}
                />
                {label}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
