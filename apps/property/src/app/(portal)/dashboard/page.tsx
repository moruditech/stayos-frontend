'use client';

import React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '@stayos/api-client';
import {
  PageHeader,
  StatCard,
  Panel,
  StatusBadge,
  Icons,
  ActivityFeed,
  AlertList,
  DonutChart,
  AreaLineChart,
  RoleGate,
  LoadingBlock,
  useSocketEvent,
  type ActivityEntry,
  type AlertEntry,
} from '@stayos/ui';
import { PERMISSIONS, SOCKET_EVENTS } from '@stayos/constants';
import { useSession, hasAnyPermission } from '@stayos/auth';
import {
  bookingKeys,
  roomKeys,
  housekeepingKeys,
  maintenanceKeys,
  reportKeys,
  chatKeys,
  procurementKeys,
} from '@/lib/query-keys';
import { formatZAR, formatNumber, formatTime, timeAgo } from '@/lib/format';
import { LinkArrowTo, QuickActionsBarLinks, type QuickActionLinkItem } from './_components/nav-links';

// ── Date helpers ───────────────────────────────────────────────────────────
// Local (not UTC) date parts — toISOString() would roll back to the previous
// day for the first two hours after midnight in SAST (UTC+2).
function localDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function useDateRanges() {
  return React.useMemo(() => {
    const now = new Date();
    const todayIso = localDateStr(now);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    return { now, todayIso, monthStart, monthEnd };
  }, []);
}

// ── Permission helper ───────────────────────────────────────────────────────
// Same session.permissions RoleGate reads — used to keep queries from firing
// (and failing with 403s) for panels the current user can never see.
function useHasPerm(perm?: string | string[]): boolean {
  const session = useSession();
  if (!session) return false;
  if (!perm) return true;
  return hasAnyPermission(session.permissions, Array.isArray(perm) ? perm : [perm]);
}

// ── Room status bucketing ───────────────────────────────────────────────────
// Room.model.js has 8 raw statuses; this dashboard shows the 5 buckets staff
// actually think in day-to-day. maintenance joins out_of_order (both mean
// "can't be sold right now due to a physical issue"); dirty/cleaning/
// inspection join into "Vacant (Dirty)" (not yet ready to sell).
function bucketRoomStatus(grouped: Record<string, unknown[]> | undefined) {
  const count = (key: string) => grouped?.[key]?.length ?? 0;
  return {
    occupied: count('occupied'),
    vacantClean: count('available'),
    vacantDirty: count('dirty') + count('cleaning') + count('inspection'),
    outOfOrder: count('out_of_order') + count('maintenance'),
    blocked: count('blocked'),
  };
}

// ── Housekeeping task bucketing ─────────────────────────────────────────────
// HousekeepingTask.model.js's real statuses are pending/assigned/in_progress/
// completed/inspected/re_clean — 'completed' means the cleaner is done and
// it's awaiting supervisor sign-off ("Ready for Inspection" here); 'inspected'
// is the fully-closed-out state ("Completed" here).
interface HkTaskLike {
  status: string;
  type: string;
  roomId: { roomNumber: string } | string;
  completedAt?: string;
  updatedAt: string;
}
function bucketHousekeeping(tasks: HkTaskLike[] | undefined) {
  const list = tasks ?? [];
  return {
    pending: list.filter((t) => t.status === 'pending' || t.status === 'assigned').length,
    inProgress: list.filter((t) => t.status === 'in_progress' || t.status === 're_clean').length,
    readyForInspection: list.filter((t) => t.status === 'completed').length,
    completed: list.filter((t) => t.status === 'inspected').length,
  };
}

const PRIORITY_RANK: Record<string, number> = { critical: 0, high: 1, normal: 2, low: 3 };
const PRIORITY_TONE: Record<string, AlertEntry['tone']> = {
  critical: 'danger',
  high: 'danger',
  normal: 'warning',
  low: 'info',
};

export default function DashboardPage(): React.ReactElement {
  const queryClient = useQueryClient();
  const { todayIso, monthStart, monthEnd } = useDateRanges();

  // ── Occupancy — report:read ───────────────────────────────────────────────
  const canReadReports = useHasPerm(PERMISSIONS.REPORT_READ);
  const { data: occupancy, isLoading: occupancyLoading } = useQuery({
    queryKey: reportKeys.occupancy({ scope: 'today' }),
    queryFn: () => api.reports.getOccupancy(),
    enabled: canReadReports,
    staleTime: 60_000,
  });

  // ── Room status board — room:read ─────────────────────────────────────────
  const canReadRooms = useHasPerm(PERMISSIONS.ROOM_READ);
  const { data: statusBoard, isLoading: statusBoardLoading } = useQuery({
    queryKey: roomKeys.statusBoard(),
    queryFn: () => api.rooms.getStatusBoard(),
    enabled: canReadRooms,
    staleTime: 30_000,
  });
  useSocketEvent(SOCKET_EVENTS.ROOM_STATUS_CHANGED, () => {
    void queryClient.invalidateQueries({ queryKey: roomKeys.statusBoard() });
  });
  const roomBuckets = bucketRoomStatus(statusBoard?.grouped as Record<string, unknown[]> | undefined);
  const totalRooms = statusBoard?.rooms?.length ?? 0;

  // ── Arrivals / departures / upcoming bookings — booking:read ──────────────
  const canReadBookings = useHasPerm(PERMISSIONS.BOOKING_READ);
  const { data: arrivals, isLoading: arrivalsLoading } = useQuery({
    queryKey: bookingKeys.list({ type: 'arrivals-today' }),
    queryFn: () =>
      api.bookings.list({
        checkInFrom: todayIso,
        checkInTo: todayIso,
        limit: 50,
      } as Parameters<typeof api.bookings.list>[0]),
    enabled: canReadBookings,
    staleTime: 60_000,
  });
  const { data: departures, isLoading: departuresLoading } = useQuery({
    queryKey: bookingKeys.list({ type: 'departures-today' }),
    queryFn: () =>
      api.bookings.list({
        checkOutFrom: todayIso,
        checkOutTo: todayIso,
        limit: 50,
      } as Parameters<typeof api.bookings.list>[0]),
    enabled: canReadBookings,
    staleTime: 60_000,
  });
  const upcomingBookings = React.useMemo(
    () => [...(arrivals ?? [])].sort((a, b) => new Date(a.checkIn).getTime() - new Date(b.checkIn).getTime()),
    [arrivals]
  );

  // ── Revenue (MTD + today) — report:revenue:read ───────────────────────────
  const canReadRevenue = useHasPerm(PERMISSIONS.REPORT_REVENUE_READ);
  const { data: revenueMTD, isLoading: revenueLoading } = useQuery({
    queryKey: reportKeys.revenue({ scope: 'mtd' }),
    queryFn: () =>
      api.reports.getRevenue({ from: monthStart.toISOString(), to: monthEnd.toISOString(), groupBy: 'day' }),
    enabled: canReadRevenue,
    staleTime: 60_000,
  });
  const { data: revpar, isLoading: revparLoading } = useQuery({
    queryKey: reportKeys.revpar({ scope: 'mtd' }),
    queryFn: () => api.reports.getRevPar({ from: monthStart.toISOString(), to: monthEnd.toISOString() }),
    enabled: canReadRevenue,
    staleTime: 60_000,
  });

  const byPeriod =
    (revenueMTD?.byPeriod as { _id: { year: number; month: number; day: number }; total: number }[] | undefined) ?? [];
  const todayEntry = byPeriod.find(
    (p) => p._id.year === monthEnd.getFullYear() && p._id.month === monthEnd.getMonth() + 1 && p._id.day === monthEnd.getDate()
  );
  const todayRevenue = todayEntry?.total ?? 0;
  const revenueChartData = byPeriod.map((p) => ({ label: String(p._id.day), value: p.total }));

  // ── Housekeeping tasks (today) — housekeeping:task:read ───────────────────
  const canReadHousekeeping = useHasPerm(PERMISSIONS.HOUSEKEEPING_TASK_READ);
  const { data: hkTasks, isLoading: hkLoading } = useQuery({
    queryKey: housekeepingKeys.tasks({ date: todayIso }),
    queryFn: () =>
      api.housekeeping.listTasks({ date: todayIso, limit: 200 } as unknown as Parameters<
        typeof api.housekeeping.listTasks
      >[0]) as unknown as Promise<HkTaskLike[]>,
    enabled: canReadHousekeeping,
    staleTime: 30_000,
  });
  const hkBuckets = bucketHousekeeping(hkTasks);

  // ── Maintenance — maintenance:task:read ───────────────────────────────────
  const canReadMaintenance = useHasPerm(PERMISSIONS.MAINTENANCE_TASK_READ);
  const { data: workOrders, isLoading: woLoading } = useQuery({
    queryKey: maintenanceKeys.workOrders({ open: true }),
    queryFn: () =>
      api.maintenance.listWorkOrders({ status: ['submitted', 'assigned', 'in_progress', 'on_hold'], limit: 50 }),
    enabled: canReadMaintenance,
    staleTime: 60_000,
  });
  const openWorkOrders = React.useMemo(
    () =>
      [...(workOrders ?? [])].sort((a, b) => {
        const rank = (PRIORITY_RANK[a.priority] ?? 9) - (PRIORITY_RANK[b.priority] ?? 9);
        return rank !== 0 ? rank : new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }),
    [workOrders]
  );

  // ── Unread messages / shift handover — any authenticated staff ───────────
  const { data: channels } = useQuery({
    queryKey: chatKeys.channels(),
    queryFn: () => api.staffchat.getMyChannels(),
    staleTime: 30_000,
  });
  const unreadCount = (channels ?? []).reduce((sum, c) => sum + (c.unreadCount || 0), 0);

  // ── Low stock — procurement:manage ────────────────────────────────────────
  const canReadProcurement = useHasPerm(PERMISSIONS.PROCUREMENT_MANAGE);
  const { data: lowStock } = useQuery({
    queryKey: procurementKeys.stockItems(),
    queryFn: () => api.procurement.getLowStock(),
    enabled: canReadProcurement,
    staleTime: 60_000,
  });

  // ── Night audit (today) — report:finance:read ─────────────────────────────
  const canReadFinance = useHasPerm(PERMISSIONS.REPORT_FINANCE_READ);
  const { data: nightAudit } = useQuery({
    queryKey: reportKeys.nightAudit(todayIso),
    queryFn: async () => {
      try {
        return await api.reports.getNightAudit(todayIso);
      } catch (err) {
        if (err instanceof ApiError && err.status === 404) return null;
        throw err;
      }
    },
    enabled: canReadFinance,
    staleTime: 60_000,
  });

  // ── Recent activity — composed client-side from what's already fetched;
  // no dedicated activity-log endpoint exists for this portal (same approach
  // as apps/agency's DashboardPage).
  const recentActivity: ActivityEntry[] = React.useMemo(() => {
    const entries: (ActivityEntry & { sortTime: number })[] = [];

    (hkTasks ?? [])
      .filter((t) => t.status === 'completed' || t.status === 'inspected')
      .forEach((t) => {
        const roomLabel = typeof t.roomId === 'object' ? t.roomId?.roomNumber : undefined;
        const when = t.completedAt ?? t.updatedAt;
        entries.push({
          icon: Icons.Sparkles,
          title: `Room ${roomLabel ?? '—'} housekeeping ${t.status === 'inspected' ? 'inspected' : 'marked done'}`,
          meta: t.type.replace(/_/g, ' '),
          time: timeAgo(when),
          sortTime: new Date(when).getTime(),
        });
      });

    (workOrders ?? []).forEach((w) => {
      entries.push({
        icon: Icons.Wrench,
        title: w.title,
        meta: `Work order ${w.status.replace(/_/g, ' ')}`,
        time: timeAgo(w.updatedAt),
        sortTime: new Date(w.updatedAt).getTime(),
      });
    });

    [...(arrivals ?? []), ...(departures ?? [])].forEach((b) => {
      const guest = `${b.customerId?.firstName ?? ''} ${b.customerId?.lastName ?? ''}`.trim() || 'Guest';
      entries.push({
        icon: Icons.CalendarClock,
        title: `Booking — ${guest}`,
        meta: `Room ${b.roomId.roomNumber}`,
        time: timeAgo(b.createdAt),
        sortTime: new Date(b.createdAt).getTime(),
      });
    });

    return entries
      .sort((a, b) => b.sortTime - a.sortTime)
      .slice(0, 6)
      .map(({ sortTime, ...entry }) => entry);
  }, [hkTasks, workOrders, arrivals, departures]);

  // ── Bottom quick-actions bar — built per-permission so each tile only
  // appears (and only its query fires) for staff who can actually use it.
  const quickActions: QuickActionLinkItem[] = [
    {
      icon: Icons.ArrowLeftRight,
      title: 'Shift handover',
      description: 'Post or read your department handover note',
      href: '/chat',
    },
    {
      icon: Icons.MessageSquare,
      title: 'Unread messages',
      description: unreadCount > 0 ? `You have ${formatNumber(unreadCount)} unread messages` : 'No unread messages',
      href: '/chat',
    },
    ...(canReadProcurement
      ? [
          {
            icon: Icons.AlertTriangle,
            title: 'Low stock alert',
            description: `${formatNumber((lowStock ?? []).length)} items are running low`,
            href: '/procurement/stock-items',
          },
        ]
      : []),
    ...(canReadFinance
      ? [
          {
            icon: Icons.FileCheck2,
            title: 'Night audit',
            description: nightAudit ? 'Completed for today' : 'Not yet completed',
            href: '/accounting/night-audit',
          },
        ]
      : []),
  ];

  const isInitialLoading =
    occupancyLoading && statusBoardLoading && arrivalsLoading && departuresLoading && revenueLoading;
  if (isInitialLoading) return <LoadingBlock rows={6} />;

  return (
    <div data-page="dashboard">
      <PageHeader title="Home" subtitle="Today's overview" />

      {/* ── Key metrics ────────────────────────────────────────────────── */}
      <div data-stat-grid>
        <RoleGate perm={PERMISSIONS.REPORT_READ}>
          <StatCard
            icon={Icons.Percent}
            tone="green"
            label="Today's Occupancy"
            value={occupancy ? `${occupancy.occupancyRate}%` : '—'}
            sublabel={occupancy ? `${occupancy.bookedRoomNights} / ${occupancy.totalRoomNights} rooms` : undefined}
            footer={<LinkArrowTo href="/reports/occupancy">View report</LinkArrowTo>}
          />
        </RoleGate>
        <RoleGate perm={PERMISSIONS.BOOKING_READ}>
          <StatCard
            icon={Icons.CalendarCheck2}
            tone="blue"
            label="Today's Arrivals"
            value={arrivals ? formatNumber(arrivals.length) : '—'}
            sublabel="Expected arrivals"
            footer={<LinkArrowTo href="/bookings?checkIn=today">View arrivals</LinkArrowTo>}
          />
          <StatCard
            icon={Icons.DoorClosed}
            tone="amber"
            label="Today's Departures"
            value={departures ? formatNumber(departures.length) : '—'}
            sublabel="Expected departures"
            footer={<LinkArrowTo href="/bookings?checkOut=today">View departures</LinkArrowTo>}
          />
        </RoleGate>
        <RoleGate perm={PERMISSIONS.ROOM_READ}>
          <StatCard
            icon={Icons.Wrench}
            tone="rose"
            label="Out of Order"
            value={formatNumber(roomBuckets.outOfOrder)}
            sublabel="Rooms"
            footer={<LinkArrowTo href="/rooms">View rooms</LinkArrowTo>}
          />
        </RoleGate>
        <RoleGate perm={PERMISSIONS.REPORT_REVENUE_READ}>
          <StatCard
            icon={Icons.Banknote}
            tone="teal"
            label="Today's Revenue"
            value={revenueMTD ? formatZAR(todayRevenue) : '—'}
            sublabel="Total revenue"
            footer={<LinkArrowTo href="/reports/revenue">View report</LinkArrowTo>}
          />
          <StatCard
            icon={Icons.TrendingUp}
            tone="purple"
            label="RevPAR (MTD)"
            value={revpar ? formatZAR(revpar.revpar as number) : '—'}
            sublabel="Month to date"
            footer={<LinkArrowTo href="/reports/revenue">View report</LinkArrowTo>}
          />
        </RoleGate>
      </div>

      {/* ── Row 2: room status / upcoming bookings / housekeeping ────────── */}
      <div data-dashboard-grid-3>
        <RoleGate perm={PERMISSIONS.ROOM_READ}>
          <Panel title="Room status overview" headerActions={<LinkArrowTo href="/rooms">View room status board</LinkArrowTo>}>
            {statusBoardLoading ? (
              <LoadingBlock rows={3} />
            ) : (
              <DonutChart
                centerLabel="Total Rooms"
                centerValue={String(totalRooms)}
                data={[
                  { label: 'Occupied', value: roomBuckets.occupied, color: 'var(--color-primary)' },
                  { label: 'Vacant (Clean)', value: roomBuckets.vacantClean, color: 'var(--color-success)' },
                  { label: 'Vacant (Dirty)', value: roomBuckets.vacantDirty, color: 'var(--color-warning)' },
                  { label: 'Out of Order', value: roomBuckets.outOfOrder, color: 'var(--color-danger)' },
                  { label: 'Blocked', value: roomBuckets.blocked, color: 'var(--color-neutral)' },
                ]}
              />
            )}
          </Panel>
        </RoleGate>

        <RoleGate perm={PERMISSIONS.BOOKING_READ}>
          <Panel title="Upcoming bookings" headerActions={<LinkArrowTo href="/bookings">View all</LinkArrowTo>}>
            {!upcomingBookings.length ? (
              <p data-empty-note>No arrivals today.</p>
            ) : (
              <div data-arrival-list>
                {upcomingBookings.slice(0, 6).map((booking) => (
                  <div key={booking._id} data-arrival-row>
                    <div data-arrival-guest>
                      <span data-guest-name>
                        {`${booking.customerId?.firstName ?? ''} ${booking.customerId?.lastName ?? ''}`.trim() || '—'}
                      </span>
                      <span data-guest-room>
                        {booking.roomId.type} · Check-in{' '}
                        {formatTime(booking.checkIn)}
                      </span>
                    </div>
                    <StatusBadge status={booking.status} />
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </RoleGate>

        <RoleGate perm={PERMISSIONS.HOUSEKEEPING_TASK_READ}>
          <Panel title="Housekeeping tasks" headerActions={<LinkArrowTo href="/housekeeping">View all</LinkArrowTo>}>
            {hkLoading ? (
              <LoadingBlock rows={4} />
            ) : (
              <div data-insight-list>
                {[
                  { icon: Icons.Clock, label: 'Pending', value: hkBuckets.pending },
                  { icon: Icons.Sparkles, label: 'In Progress', value: hkBuckets.inProgress },
                  { icon: Icons.Eye, label: 'Ready for Inspection', value: hkBuckets.readyForInspection },
                  { icon: Icons.CheckCircle2, label: 'Completed', value: hkBuckets.completed },
                ].map((row) => (
                  <div key={row.label} data-insight-row>
                    <div data-insight-icon>
                      <row.icon size={15} />
                    </div>
                    <span data-insight-label>{row.label}</span>
                    <span data-insight-value data-tabular-nums>
                      {formatNumber(row.value)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </RoleGate>
      </div>

      {/* ── Row 3: revenue overview / maintenance / recent activity ──────── */}
      <div data-dashboard-grid-3>
        <RoleGate perm={PERMISSIONS.REPORT_REVENUE_READ}>
          <Panel title="Revenue overview (MTD)" headerActions={<LinkArrowTo href="/reports/revenue">View report</LinkArrowTo>}>
            {revenueLoading || revparLoading ? (
              <LoadingBlock rows={4} />
            ) : (
              <>
                <div data-insight-list>
                  <div data-insight-row>
                    <span data-insight-label>Revenue</span>
                    <span data-insight-value data-tabular-nums>
                      {formatZAR((revenueMTD?.total as number) ?? 0)}
                    </span>
                  </div>
                  <div data-insight-row>
                    <span data-insight-label>ADR</span>
                    <span data-insight-value data-tabular-nums>
                      {formatZAR((revpar?.adr as number) ?? 0)}
                    </span>
                  </div>
                  <div data-insight-row>
                    <span data-insight-label>RevPAR</span>
                    <span data-insight-value data-tabular-nums>
                      {formatZAR((revpar?.revpar as number) ?? 0)}
                    </span>
                  </div>
                </div>
                <AreaLineChart data={revenueChartData} formatValue={(v) => formatZAR(v)} />
              </>
            )}
          </Panel>
        </RoleGate>

        <RoleGate perm={PERMISSIONS.MAINTENANCE_TASK_READ}>
          <Panel title="Maintenance overview" headerActions={<LinkArrowTo href="/maintenance/work-orders">View all</LinkArrowTo>}>
            {woLoading ? (
              <LoadingBlock rows={3} />
            ) : (
              <AlertList
                emptyLabel="No open work orders"
                items={openWorkOrders.slice(0, 4).map(
                  (w): AlertEntry => ({
                    tone: PRIORITY_TONE[w.priority] ?? 'info',
                    icon: Icons.Wrench,
                    title: `${w.title}${typeof w.roomId === 'object' && w.roomId ? ` — Room ${w.roomId.roomNumber}` : ''}`,
                    meta: `Reported ${timeAgo(w.createdAt)} · ${w.priority[0].toUpperCase()}${w.priority.slice(1)} priority`,
                  })
                )}
              />
            )}
          </Panel>
        </RoleGate>

        <Panel title="Recent activity">
          <ActivityFeed items={recentActivity} />
        </Panel>
      </div>

      {/* ── Bottom quick actions ──────────────────────────────────────────── */}
      <QuickActionsBarLinks actions={quickActions} />
    </div>
  );
}
