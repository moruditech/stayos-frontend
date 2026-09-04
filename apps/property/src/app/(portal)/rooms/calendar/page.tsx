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
 * from/to against the currently visible range.
 *
 * Every filter in the toolbar is backed by a real query param on that
 * endpoint (roomType, ratePlanId, source, status) — none are decorative.
 * The Rate Plan filter additionally only renders for roles that actually
 * hold rate:*, since GET /pricing/rate-plans requires it and most
 * front-desk roles (receptionist, front_desk_manager) don't — showing it
 * to everyone would mean a 403 on page load for most staff.
 */

import React, { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@stayos/api-client';
import type { CalendarBooking, CalendarBlock, CalendarRoom, CalendarMatrixParams } from '@stayos/api-client';
import { SkeletonLoader, useSocketEvent, Icons } from '@stayos/ui';
import { SOCKET_EVENTS } from '@stayos/constants';
import { PERMISSIONS } from '@stayos/constants';
import { useSession, hasPermission } from '@stayos/auth';
import { roomKeys, pricingKeys } from '@/lib/query-keys';

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

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
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

const WEEK_DAYS = 7;
type ViewMode = 'day' | 'week' | 'month';

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

// Matches BOOKING_SOURCE in the backend's constants.js exactly.
const SOURCE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'direct', label: 'Direct / In-person' },
  { value: 'walk_in', label: 'Walk-in' },
  { value: 'phone', label: 'Phone' },
  { value: 'agency', label: 'Agency' },
  { value: 'corporate', label: 'Corporate' },
  { value: 'ota_airbnb', label: 'Airbnb' },
  { value: 'ota_booking', label: 'Booking.com' },
  { value: 'ota_agoda', label: 'Agoda' },
  { value: 'ota_lekkeslaap', label: 'LekkeSlaap' },
  { value: 'ota_safarinow', label: 'SafariNow' },
  { value: 'ota_other', label: 'OTA (other)' },
];

const STATUS_OPTIONS: Array<{ value: NonNullable<CalendarMatrixParams['status']>; label: string }> = [
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'checked_in', label: 'Checked in' },
  { value: 'tentative', label: 'Tentative' },
  { value: 'blocked', label: 'Blocked' },
  { value: 'maintenance', label: 'Maintenance' },
];

type Cell =
  | { kind: 'booking'; booking: CalendarBooking }
  | { kind: 'blocked'; block: CalendarBlock; isMaintenance: boolean };

function chipStatusOf(booking: CalendarBooking): 'confirmed' | 'checked_in' | 'tentative' {
  if (booking.status === 'checked_in') return 'checked_in';
  if (booking.isTentative) return 'tentative';
  return 'confirmed';
}

export default function CalendarPage(): React.ReactElement {
  const queryClient = useQueryClient();
  const session = useSession();
  const canViewRatePlans = !!session && hasPermission(session.permissions, PERMISSIONS.RATE_ALL);

  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [anchorDate, setAnchorDate] = useState(() => startOfDay(new Date()));
  const [roomType, setRoomType] = useState('');
  const [ratePlanId, setRatePlanId] = useState('');
  const [source, setSource] = useState('');
  const [status, setStatus] = useState<CalendarMatrixParams['status'] | ''>('');

  // Visible dates + the [start, endExclusive) window sent to the backend —
  // derived from viewMode + anchorDate, so switching modes naturally lands
  // on "the day/week/month containing whatever's currently in view" with
  // no extra bookkeeping.
  const { dates, rangeStart, rangeEndExclusive } = useMemo(() => {
    if (viewMode === 'day') {
      const d = startOfDay(anchorDate);
      return { dates: [d], rangeStart: d, rangeEndExclusive: addDays(d, 1) };
    }
    if (viewMode === 'month') {
      const first = startOfMonth(anchorDate);
      const firstOfNext = new Date(first.getFullYear(), first.getMonth() + 1, 1);
      const dayCount = Math.round((firstOfNext.getTime() - first.getTime()) / 86_400_000);
      return {
        dates: Array.from({ length: dayCount }, (_, i) => addDays(first, i)),
        rangeStart: first,
        rangeEndExclusive: firstOfNext,
      };
    }
    const start = startOfDay(anchorDate);
    return {
      dates: Array.from({ length: WEEK_DAYS }, (_, i) => addDays(start, i)),
      rangeStart: start,
      rangeEndExclusive: addDays(start, WEEK_DAYS),
    };
  }, [viewMode, anchorDate]);

  const params = useMemo<CalendarMatrixParams>(
    () => ({
      startDate: isoDate(rangeStart),
      endDate: isoDate(rangeEndExclusive),
      ...(roomType ? { roomType } : {}),
      ...(ratePlanId ? { ratePlanId } : {}),
      ...(source ? { source } : {}),
      ...(status ? { status } : {}),
    }),
    [rangeStart, rangeEndExclusive, roomType, ratePlanId, source, status]
  );

  const { data: matrix, isLoading } = useQuery({
    queryKey: roomKeys.calendar(params as unknown as Record<string, unknown>),
    queryFn: () => api.rooms.getCalendarMatrix(params),
    staleTime: 30_000,
  });

  // Only fetched for roles that actually hold rate:* — GET /pricing/rate-plans
  // requires it, and most front-desk roles don't have it, so fetching
  // unconditionally would 403 on every calendar page load for most staff.
  const { data: ratePlans } = useQuery({
    queryKey: pricingKeys.ratePlans(),
    queryFn: () => api.pricing.listRatePlans(),
    enabled: canViewRatePlans,
    staleTime: 120_000,
  });
  const activeRatePlans = useMemo(() => (ratePlans ?? []).filter((p) => p.isActive), [ratePlans]);

  useSocketEvent(SOCKET_EVENTS.BOOKING_CREATED, () => {
    void queryClient.invalidateQueries({ queryKey: roomKeys.calendar(params as unknown as Record<string, unknown>) });
  });
  useSocketEvent(SOCKET_EVENTS.BOOKING_UPDATED, () => {
    void queryClient.invalidateQueries({ queryKey: roomKeys.calendar(params as unknown as Record<string, unknown>) });
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

  function goPrev() {
    setAnchorDate((d) => {
      if (viewMode === 'day') return addDays(d, -1);
      if (viewMode === 'month') return new Date(d.getFullYear(), d.getMonth() - 1, 1);
      return addDays(d, -WEEK_DAYS);
    });
  }
  function goNext() {
    setAnchorDate((d) => {
      if (viewMode === 'day') return addDays(d, 1);
      if (viewMode === 'month') return new Date(d.getFullYear(), d.getMonth() + 1, 1);
      return addDays(d, WEEK_DAYS);
    });
  }

  function rangeLabel(): string {
    if (viewMode === 'day') {
      return anchorDate.toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' });
    }
    if (viewMode === 'month') {
      return anchorDate.toLocaleDateString('en-ZA', { month: 'long', year: 'numeric' });
    }
    const first = dates[0];
    const last = dates[dates.length - 1];
    if (!first || !last) return '';
    return `${first.toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' })} – ${last.toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' })}`;
  }

  const compact = viewMode === 'month';
  const activeFilterCount = [roomType, ratePlanId, source, status].filter(Boolean).length;

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

      {/* Navigator + view mode */}
      <div data-calendar-nav>
        <button type="button" data-btn-ghost onClick={goPrev} aria-label={`Previous ${viewMode}`}>
          <Icons.ChevronLeft aria-hidden="true" />
        </button>
        <span data-calendar-range>{rangeLabel()}</span>
        <button type="button" data-btn-ghost onClick={() => setAnchorDate(startOfDay(new Date()))}>
          Today
        </button>
        <button type="button" data-btn-ghost onClick={goNext} aria-label={`Next ${viewMode}`}>
          <Icons.ChevronRight aria-hidden="true" />
        </button>

        <div data-segmented role="tablist" aria-label="Calendar view">
          <button type="button" data-segmented-option data-active={viewMode === 'day' || undefined} onClick={() => setViewMode('day')}>Day</button>
          <button type="button" data-segmented-option data-active={viewMode === 'week' || undefined} onClick={() => setViewMode('week')}>Week</button>
          <button type="button" data-segmented-option data-active={viewMode === 'month' || undefined} onClick={() => setViewMode('month')}>Month</button>
        </div>
      </div>

      {/* Every control here is a real, working query param on
          GET /rooms/calendar-matrix — see calendarMatrixQuerySchema. */}
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

        {canViewRatePlans && (
          <div data-filter-select>
            <span>Rate plan</span>
            <select value={ratePlanId} onChange={(e) => setRatePlanId(e.target.value)}>
              <option value="">All rate plans</option>
              {activeRatePlans.map((plan) => (
                <option key={plan._id} value={plan._id}>{plan.name} ({plan.code})</option>
              ))}
            </select>
          </div>
        )}

        <div data-filter-select>
          <span>Source</span>
          <select value={source} onChange={(e) => setSource(e.target.value)}>
            <option value="">All sources</option>
            {SOURCE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        <div data-filter-select>
          <span>Status</span>
          <select value={status} onChange={(e) => setStatus(e.target.value as CalendarMatrixParams['status'] | '')}>
            <option value="">All statuses</option>
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        {activeFilterCount > 0 && (
          <button
            type="button"
            data-btn-ghost
            data-btn-sm
            onClick={() => { setRoomType(''); setRatePlanId(''); setSource(''); setStatus(''); }}
          >
            Clear filters ({activeFilterCount})
          </button>
        )}
      </div>

      {isLoading ? (
        <SkeletonLoader rows={8} />
      ) : !matrix || groupedRooms.length === 0 ? (
        <p data-empty-note>No rooms match this filter.</p>
      ) : (
        <div data-calendar-matrix>
          <table data-calendar-table data-density={compact ? 'compact' : undefined}>
            <thead>
              <tr>
                <th data-calendar-room-col>Room</th>
                {dates.map((d) => {
                  const lbl = dayLabel(d);
                  const iso = isoDate(d);
                  return (
                    <th key={iso} data-calendar-day data-today={iso === today || undefined}>
                      {!compact && <span data-day-weekday>{lbl.weekday}</span>}
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
                    <td colSpan={1 + dates.length}>{TYPE_LABELS[type] ?? type}</td>
                  </tr>
                  {rooms.map((room) => {
                    const roomCells = cellsByRoom.get(String(room._id));
                    return (
                      <tr key={room._id} data-calendar-row>
                        <td data-calendar-room-label>
                          <span data-room-num>{room.roomNumber}</span>
                          {!compact && room.name && <span data-room-type>{room.name}</span>}
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
                                  data-status={chipStatusOf(cell.booking)}
                                  data-conflict={cell.booking.hasConflict || undefined}
                                  title={`${cell.booking.guestName ?? 'Guest'} — ${cell.booking.confirmationNumber}`}
                                >
                                  {!compact && cell.booking.isExternal && (
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
