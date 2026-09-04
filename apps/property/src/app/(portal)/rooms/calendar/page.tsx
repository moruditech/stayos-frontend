'use client';

import Link from 'next/link';

/**
 * Rooms calendar matrix — forward-looking booking grid.
 * TAD 11 §4: the calendar matrix is for forward-looking booking placement,
 * matching the design documentation's booking-grid specification.
 *
 * Backend: GET /rooms/calendar-matrix returns a flat { rooms, bookings,
 * blocks } for the requested range — NOT a pre-built per-room-per-date
 * matrix (see rooms.service.js#getCalendarMatrix). Cells here are derived
 * client-side from each booking's checkIn/checkOut and each block's
 * from/to against the currently visible week.
 */

import React, { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@stayos/api-client';
import type { CalendarBooking, CalendarBlock, CalendarRoom } from '@stayos/api-client';
import { SkeletonLoader, useSocketEvent, Icons } from '@stayos/ui';
import { SOCKET_EVENTS } from '@stayos/constants';
import { roomKeys } from '@/lib/query-keys';

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

// Local calendar-day string (YYYY-MM-DD) — deliberately NOT
// toISOString().slice(0, 10), which converts to UTC first and silently
// shifts every date back a day for any positive-UTC-offset timezone
// (e.g. SAST/UTC+2, this app's evident home market). A property's "day"
// is its own local day, not a UTC slice of one.
function isoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function dayLabel(d: Date): { weekday: string; date: number } {
  return {
    weekday: d.toLocaleDateString('en-ZA', { weekday: 'short' }),
    date: d.getDate(),
  };
}

const VIEW_DAYS = 7;

// Room.model.js's type enum, reordered smallest-to-largest rather than
// alphabetical (which would put "apartment" before "single") — and given
// human-readable group labels for the calendar's section headers.
const TYPE_ORDER = ['single', 'double', 'twin', 'triple', 'suite', 'studio', 'apartment', 'dormitory'] as const;
const TYPE_LABELS: Record<string, string> = {
  single: 'Single rooms',
  double: 'Double rooms',
  twin: 'Twin rooms',
  triple: 'Triple rooms',
  suite: 'Suites',
  studio: 'Studios',
  apartment: 'Apartments',
  dormitory: 'Dormitories',
};

type Cell =
  | { kind: 'booking'; booking: CalendarBooking }
  | { kind: 'blocked'; block: CalendarBlock; isMaintenance: boolean };

function statusOf(booking: CalendarBooking): 'confirmed' | 'checked_in' | 'tentative' {
  if (booking.status === 'checked_in') return 'checked_in';
  if (booking.isTentative) return 'tentative';
  return 'confirmed';
}

export default function CalendarPage(): React.ReactElement {
  const queryClient = useQueryClient();
  const [startDate, setStartDate] = useState(() => startOfDay(new Date()));
  const [roomType, setRoomType] = useState('');

  const dates = useMemo(
    () => Array.from({ length: VIEW_DAYS }, (_, i) => addDays(startDate, i)),
    [startDate]
  );

  const params = useMemo(
    () => ({
      startDate: isoDate(startDate),
      // Exclusive upper bound, one day past the last visible night — matches
      // the backend's `checkIn < end` / `checkOut > start` overlap query
      // (availabilityMatrix.service.js#computeAvailabilityMatrix).
      endDate: isoDate(addDays(startDate, VIEW_DAYS)),
      ...(roomType ? { roomType } : {}),
    }),
    [startDate, roomType]
  );

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

  // Flat bookings/blocks -> per-room, per-visible-day lookup.
  const cellsByRoom = useMemo(() => {
    const map = new Map<string, Map<string, Cell>>();
    if (!matrix) return map;

    const visibleIsoSet = new Set(dates.map(isoDate));
    const roomStatusById = new Map(matrix.rooms.map((r) => [String(r._id), r.status]));
    for (const room of matrix.rooms) map.set(String(room._id), new Map());

    for (const booking of matrix.bookings) {
      const roomMap = map.get(String(booking.roomId));
      if (!roomMap) continue;
      let cursor = startOfDay(new Date(booking.checkIn));
      const end = startOfDay(new Date(booking.checkOut));
      while (cursor < end) {
        const iso = isoDate(cursor);
        if (visibleIsoSet.has(iso)) roomMap.set(iso, { kind: 'booking', booking });
        cursor = addDays(cursor, 1);
      }
    }

    // Blocks fill in around bookings, never over them — a currently-active
    // booking takes display priority over a stale/overlapping block entry.
    for (const block of matrix.blocks) {
      const roomMap = map.get(String(block.roomId));
      if (!roomMap) continue;
      const isMaintenance = roomStatusById.get(String(block.roomId)) === 'maintenance';
      let cursor = startOfDay(new Date(block.from));
      const end = startOfDay(new Date(block.to));
      while (cursor < end) {
        const iso = isoDate(cursor);
        if (visibleIsoSet.has(iso) && !roomMap.has(iso)) {
          roomMap.set(iso, { kind: 'blocked', block, isMaintenance });
        }
        cursor = addDays(cursor, 1);
      }
    }

    return map;
  }, [matrix, dates]);

  // Group rooms by type (section headers), each group sorted by room number.
  const groupedRooms = useMemo(() => {
    if (!matrix) return [];
    const groups = new Map<string, CalendarRoom[]>();
    for (const room of matrix.rooms) {
      if (!groups.has(room.type)) groups.set(room.type, []);
      groups.get(room.type)!.push(room);
    }
    for (const rooms of groups.values()) {
      rooms.sort((a, b) => a.roomNumber.localeCompare(b.roomNumber, undefined, { numeric: true }));
    }
    const knownFirst = [...TYPE_ORDER, ...Array.from(groups.keys()).filter((t) => !(TYPE_ORDER as readonly string[]).includes(t))];
    return knownFirst
      .filter((type) => groups.has(type))
      .map((type) => ({ type, rooms: groups.get(type)! }));
  }, [matrix]);

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
        <button type="button" data-btn-ghost onClick={() => setStartDate((d) => addDays(d, -7))} aria-label="Previous week">
          <Icons.ChevronLeft aria-hidden="true" />
        </button>
        <span data-calendar-range>
          {startDate.toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' })}
          {' – '}
          {addDays(startDate, VIEW_DAYS - 1).toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' })}
        </span>
        <button type="button" data-btn-ghost onClick={() => setStartDate(startOfDay(new Date()))}>
          Today
        </button>
        <button type="button" data-btn-ghost onClick={() => setStartDate((d) => addDays(d, 7))} aria-label="Next week">
          <Icons.ChevronRight aria-hidden="true" />
        </button>
      </div>

      {/* Room type is the one filter the backend actually supports for this
          endpoint (calendarMatrixQuerySchema) — no Rate Plan/Source/Status
          filters here since there's nothing real on the server to back them. */}
      <div data-filter-bar>
        <div data-filter-select>
          <span>Room type</span>
          <select value={roomType} onChange={(e) => setRoomType(e.target.value)}>
            <option value="">All room types</option>
            {TYPE_ORDER.map((t) => (
              <option key={t} value={t}>{TYPE_LABELS[t]}</option>
            ))}
          </select>
        </div>
      </div>

      {isLoading ? (
        <SkeletonLoader rows={8} />
      ) : !matrix || groupedRooms.length === 0 ? (
        <p data-empty-note>No rooms match this filter.</p>
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
                    <th key={iso} data-calendar-day data-today={iso === today || undefined}>
                      <span data-day-weekday>{lbl.weekday}</span>
                      <span data-day-date>{lbl.date}</span>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {groupedRooms.map(({ type, rooms }) => (
                <React.Fragment key={type}>
                  <tr data-calendar-type-header>
                    <td colSpan={1 + VIEW_DAYS}>{TYPE_LABELS[type] ?? type}</td>
                  </tr>
                  {rooms.map((room) => {
                    const roomCells = cellsByRoom.get(String(room._id));
                    return (
                      <tr key={room._id} data-calendar-row>
                        <td data-calendar-room-label>
                          <span data-room-num>{room.roomNumber}</span>
                          {room.name && <span data-room-type>{room.name}</span>}
                        </td>
                        {dates.map((d) => {
                          const iso = isoDate(d);
                          const cell = roomCells?.get(iso);
                          return (
                            <td key={iso} data-calendar-cell data-today={iso === today || undefined}>
                              {cell?.kind === 'booking' ? (
                                <Link
                                  href={`/bookings/${cell.booking._id}`}
                                  data-booking-chip
                                  data-status={statusOf(cell.booking)}
                                  data-conflict={cell.booking.hasConflict || undefined}
                                  title={`${cell.booking.guestName ?? 'Guest'} — ${cell.booking.confirmationNumber}`}
                                >
                                  {cell.booking.isExternal && (
                                    <Icons.RefreshCcw data-booking-chip-icon aria-hidden="true" />
                                  )}
                                  <span data-booking-chip-guest>
                                    {cell.booking.guestName ?? cell.booking.confirmationNumber}
                                  </span>
                                </Link>
                              ) : cell?.kind === 'blocked' ? (
                                <div
                                  data-blocked-chip
                                  data-reason={cell.isMaintenance ? 'maintenance' : undefined}
                                  title={cell.block.reason}
                                >
                                  {cell.isMaintenance ? 'Maintenance' : 'Blocked'}
                                </div>
                              ) : null}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </React.Fragment>
              ))}
            </tbody>
          </table>

          {/* Legend */}
          <div data-calendar-legend>
            <span data-legend-item><span data-legend-dot data-status="confirmed" />Confirmed</span>
            <span data-legend-item><span data-legend-dot data-status="checked_in" />Checked in</span>
            <span data-legend-item><span data-legend-dot data-status="tentative" />Tentative</span>
            <span data-legend-item><span data-legend-dot data-pattern="striped" />Blocked</span>
            <span data-legend-item><span data-legend-dot data-pattern="striped" data-tone="warning" />Maintenance</span>
          </div>
        </div>
      )}
    </div>
  );
}
