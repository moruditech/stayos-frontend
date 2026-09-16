'use client';

import React from 'react';
import './dashboard.css';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@stayos/api-client';
import {
  Panel,
  Icons,
  DonutChart,
  RoleGate,
  LoadingBlock,
  useSocketEvent,
} from '@stayos/ui';
import { PERMISSIONS, SOCKET_EVENTS } from '@stayos/constants';
import { useSession, hasAnyPermission } from '@stayos/auth';
import {
  bookingKeys,
  roomKeys,
  housekeepingKeys,
  maintenanceKeys,
  reportKeys,
} from '@/lib/query-keys';
import { formatZAR, formatNumber } from '@/lib/format';
import Link from 'next/link';

// ── Helpers ────────────────────────────────────────────────────────────────
function localDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatDashboardDate(d: Date): string {
  return d.toLocaleDateString('en-ZA', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  });
}

function formatActivityTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-ZA', {
    hour: '2-digit', minute: '2-digit', hour12: false,
  });
}

function useDateRanges() {
  return React.useMemo(() => {
    const now = new Date();
    const todayIso = localDateStr(now);
    const sevenDaysLater = new Date(now);
    sevenDaysLater.setDate(now.getDate() + 7);
    const sevenDaysIso = localDateStr(sevenDaysLater);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    return { now, todayIso, sevenDaysIso, monthStart, monthEnd };
  }, []);
}

function useHasPerm(perm?: string | string[] | undefined): boolean {
  const session = useSession();
  if (!session) return false;
  if (!perm) return true;
  return hasAnyPermission(session.permissions, Array.isArray(perm) ? perm : [perm]);
}

function bucketRoomStatus(grouped: Record<string, unknown[]> | undefined) {
  const count = (key: string) => grouped?.[key]?.length ?? 0;
  return {
    occupied:      count('occupied'),
    vacantClean:   count('available'),
    vacantDirty:   count('dirty') + count('cleaning') + count('inspection'),
    outOfOrder:    count('out_of_order') + count('maintenance'),
  };
}

interface HkTaskLike {
  status: string;
  roomId: { roomNumber: string } | string;
  completedAt?: string | undefined;
  updatedAt: string;
}

function bucketHousekeeping(tasks: HkTaskLike[] | undefined) {
  const list = tasks ?? [];
  return {
    pending:            list.filter((t) => t.status === 'pending' || t.status === 'assigned').length,
    inProgress:         list.filter((t) => t.status === 'in_progress' || t.status === 're_clean').length,
    readyForInspection: list.filter((t) => t.status === 'completed').length,
    completed:          list.filter((t) => t.status === 'inspected').length,
  };
}

// ── Sub-components ─────────────────────────────────────────────────────────
function ViewAllLink({ href, label = 'View all' }: { href: string; label?: string | undefined }) {
  return (
    <Link href={href} data-view-all-link>
      {label} <Icons.ArrowRight size={14} />
    </Link>
  );
}

function SectionRow({ icon, iconBg, iconColor, title, subtitle, value, href }: {
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  title: string;
  subtitle: string;
  value: string | number;
  href: string;
}) {
  return (
    <Link href={href} data-section-row>
      <div data-section-row-icon style={{ background: iconBg, color: iconColor }}>
        {icon}
      </div>
      <div data-section-row-body>
        <div data-section-row-title>{title}</div>
        <div data-section-row-subtitle>{subtitle}</div>
      </div>
      <div data-section-row-end>
        <span data-section-row-count>{value}</span>
        <Icons.ChevronRight size={16} />
      </div>
    </Link>
  );
}

function HkRow({ icon, iconBg, iconColor, label, value, href }: {
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  label: string;
  value: number;
  href: string;
}) {
  return (
    <Link href={href} data-section-row>
      <div data-section-row-icon style={{ background: iconBg, color: iconColor }}>
        {icon}
      </div>
      <div data-section-row-body>
        <div data-section-row-title>{label}</div>
      </div>
      <div data-section-row-end>
        <span data-section-row-count>{value}</span>
        <Icons.ChevronRight size={16} />
      </div>
    </Link>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────
export default function DashboardPage(): React.ReactElement {
  const queryClient = useQueryClient();
  const { todayIso, sevenDaysIso, monthStart, monthEnd, now } = useDateRanges();

  const canReadReports      = useHasPerm(PERMISSIONS.REPORT_READ);
  const canReadRooms        = useHasPerm(PERMISSIONS.ROOM_READ);
  const canReadBookings     = useHasPerm(PERMISSIONS.BOOKING_READ);
  const canReadRevenue      = useHasPerm(PERMISSIONS.REPORT_REVENUE_READ);
  const canReadHousekeeping = useHasPerm(PERMISSIONS.HOUSEKEEPING_TASK_READ);
  const canReadMaintenance  = useHasPerm(PERMISSIONS.MAINTENANCE_TASK_READ);

  // Occupancy
  const { data: occupancy, isLoading: occupancyLoading } = useQuery({
    queryKey: reportKeys.occupancy({ scope: 'today' }),
    queryFn:  () => api.reports.getOccupancy(),
    enabled:  canReadReports,
    staleTime: 60_000,
  });

  // Room status board
  const { data: statusBoard, isLoading: statusBoardLoading } = useQuery({
    queryKey: roomKeys.statusBoard(),
    queryFn:  () => api.rooms.getStatusBoard(),
    enabled:  canReadRooms,
    staleTime: 30_000,
  });
  useSocketEvent(SOCKET_EVENTS.ROOM_STATUS_CHANGED, () => {
    void queryClient.invalidateQueries({ queryKey: roomKeys.statusBoard() });
  });
  const roomBuckets  = bucketRoomStatus(statusBoard?.grouped as Record<string, unknown[]> | undefined);
  const totalRooms   = statusBoard?.rooms?.length ?? 0;
  const occupancyPct = totalRooms > 0
    ? ((roomBuckets.occupied / totalRooms) * 100).toFixed(2)
    : '0.00';

  // Bookings
  const { data: arrivals, isLoading: arrivalsLoading } = useQuery({
    queryKey: bookingKeys.list({ type: 'arrivals-today' }),
    queryFn:  () => api.bookings.list({ checkInFrom: todayIso, checkInTo: todayIso, limit: 50 } as Parameters<typeof api.bookings.list>[0]),
    enabled:  canReadBookings,
    staleTime: 60_000,
  });
  const { data: departures, isLoading: departuresLoading } = useQuery({
    queryKey: bookingKeys.list({ type: 'departures-today' }),
    queryFn:  () => api.bookings.list({ checkOutFrom: todayIso, checkOutTo: todayIso, limit: 50 } as Parameters<typeof api.bookings.list>[0]),
    enabled:  canReadBookings,
    staleTime: 60_000,
  });
  const { data: upcoming7 } = useQuery({
    queryKey: bookingKeys.list({ type: 'upcoming-7' }),
    queryFn:  () => api.bookings.list({ checkInFrom: todayIso, checkInTo: sevenDaysIso, limit: 200 } as Parameters<typeof api.bookings.list>[0]),
    enabled:  canReadBookings,
    staleTime: 60_000,
  });

  // Revenue MTD
  const { data: revenueMTD, isLoading: revenueLoading } = useQuery({
    queryKey: reportKeys.revenue({ scope: 'mtd' }),
    queryFn:  () => api.reports.getRevenue({ from: monthStart.toISOString(), to: monthEnd.toISOString(), groupBy: 'day' }),
    enabled:  canReadRevenue,
    staleTime: 60_000,
  });
  const { data: _revpar } = useQuery({
    queryKey: reportKeys.revpar({ scope: 'mtd' }),
    queryFn:  () => api.reports.getRevPar({ from: monthStart.toISOString(), to: monthEnd.toISOString() }),
    enabled:  canReadRevenue,
    staleTime: 60_000,
  });

  const totalRevenue = (revenueMTD?.total as number | undefined) ?? 0;
  const roomRevenue  = (revenueMTD?.roomRevenue as number | undefined) ?? 0;
  const fbRevenue    = (revenueMTD?.fbRevenue as number | undefined) ?? 0;
  const otherRevenue = Math.max(0, totalRevenue - roomRevenue - fbRevenue);

  // Housekeeping
  const { data: hkTasks, isLoading: hkLoading } = useQuery({
    queryKey: housekeepingKeys.tasks({ date: todayIso }),
    queryFn:  () => api.housekeeping.listTasks({ date: todayIso, limit: 200 } as unknown as Parameters<typeof api.housekeeping.listTasks>[0]) as unknown as Promise<HkTaskLike[]>,
    enabled:  canReadHousekeeping,
    staleTime: 30_000,
  });
  const hkBuckets = bucketHousekeeping(hkTasks);

  // Maintenance
  const { data: workOrders, isLoading: woLoading } = useQuery({
    queryKey: maintenanceKeys.workOrders({ open: true }),
    queryFn:  () => api.maintenance.listWorkOrders({ status: ['submitted', 'assigned', 'in_progress', 'on_hold'], limit: 50 }),
    enabled:  canReadMaintenance,
    staleTime: 60_000,
  });
  const openWorkOrders = workOrders ?? [];

  // Recent activity
  interface ActivityItem {
    icon: React.ReactNode;
    iconBg: string;
    iconColor: string;
    title: string;
    subtitle: string;
    time: string;
    sortMs: number;
    href: string;
  }
  const recentActivity: ActivityItem[] = React.useMemo(() => {
    const entries: ActivityItem[] = [];

    // Bookings
    [...(arrivals ?? []), ...(departures ?? [])].forEach((b) => {
      const guest  = `${b.customerId?.firstName ?? ''} ${b.customerId?.lastName ?? ''}`.trim();
      const guests = b.adults + (b.children ?? 0);
      entries.push({
        icon: <Icons.Calendar size={16} />,
        iconBg: 'var(--tone-green-bg)', iconColor: 'var(--tone-green-fg)',
        title: 'New booking received',
        subtitle: `${guest || 'Guest'} booked a room${guests > 0 ? ` · ${guests} guest${guests > 1 ? 's' : ''}` : ''}`,
        time: `Today, ${formatActivityTime(b.createdAt)}`,
        sortMs: new Date(b.createdAt).getTime(),
        href: '/bookings',
      });
    });

    // Housekeeping completions
    (hkTasks ?? []).filter((t) => t.status === 'completed' || t.status === 'inspected').forEach((t) => {
      const room = typeof t.roomId === 'object' ? `Room ${t.roomId.roomNumber}` : 'Room';
      const when = t.completedAt ?? t.updatedAt;
      entries.push({
        icon: <Icons.Sparkles size={16} />,
        iconBg: 'var(--tone-blue-bg)', iconColor: 'var(--tone-blue-fg)',
        title: 'Room cleaned',
        subtitle: `${room} · Housekeeping`,
        time: `Today, ${formatActivityTime(when)}`,
        sortMs: new Date(when).getTime(),
        href: '/housekeeping',
      });
    });

    // Maintenance
    openWorkOrders.slice(0, 3).forEach((w) => {
      const room = typeof w.roomId === 'object' && w.roomId
        ? ` · Room ${(w.roomId as { roomNumber: string }).roomNumber}`
        : '';
      entries.push({
        icon: <Icons.Wrench size={16} />,
        iconBg: 'var(--tone-amber-bg)', iconColor: 'var(--tone-amber-fg)',
        title: 'Maintenance request',
        subtitle: `${w.title}${room}`,
        time: `Today, ${formatActivityTime(w.createdAt)}`,
        sortMs: new Date(w.createdAt).getTime(),
        href: '/maintenance/work-orders',
      });
    });

    return entries.sort((a, b) => b.sortMs - a.sortMs).slice(0, 6);
  }, [arrivals, departures, hkTasks, openWorkOrders]);

  const donutData = [
    { label: 'Occupied',        value: roomBuckets.occupied,    color: 'var(--color-primary)' },
    { label: 'Vacant (Clean)',  value: roomBuckets.vacantClean, color: 'var(--color-success)' },
    { label: 'Vacant (Dirty)',  value: roomBuckets.vacantDirty, color: 'var(--color-warning)' },
    { label: 'Out of Order',    value: roomBuckets.outOfOrder,  color: 'var(--color-danger)'  },
  ];

  const isInitialLoading =
    occupancyLoading && statusBoardLoading && arrivalsLoading &&
    departuresLoading && revenueLoading;
  if (isInitialLoading) return <LoadingBlock rows={6} />;

  return (
    <div data-page="dashboard">

      {/* ── Page header ─────────────────────────────────────────────────── */}
      <div data-dash-header>
        <div>
          <h1>Home</h1>
          <p data-dash-header-subtitle>{"Today's overview"}</p>
        </div>
        <div data-dash-date-pill>
          <Icons.Calendar size={14} />
          <span>{formatDashboardDate(now)}</span>
          <Icons.ChevronDown size={14} />
        </div>
      </div>

      {/* ── 4 stat cards ────────────────────────────────────────────────── */}
      <div data-stat-grid>
        <RoleGate perm={PERMISSIONS.REPORT_READ}>
          <div data-stat-card>
            <div data-stat-icon data-tone="green"><Icons.Percent size={18} /></div>
            <div data-stat-label>Occupancy</div>
            <div data-stat-value>
              {occupancy ? `${occupancy.occupancyRate}%` : `${occupancyPct}%`}
            </div>
            <div data-stat-sublabel>{roomBuckets.occupied} of {totalRooms} rooms</div>
          </div>
        </RoleGate>

        <RoleGate perm={PERMISSIONS.BOOKING_READ}>
          <div data-stat-card>
            <div data-stat-icon data-tone="blue"><Icons.CalendarCheck2 size={18} /></div>
            <div data-stat-label>{"Today's Arrivals"}</div>
            <div data-stat-value>{arrivalsLoading ? '—' : formatNumber(arrivals?.length ?? 0)}</div>
            <div data-stat-sublabel>{arrivals?.length ?? 0} expected</div>
          </div>

          <div data-stat-card>
            <div data-stat-icon data-tone="amber"><Icons.DoorClosed size={18} /></div>
            <div data-stat-label>{"Today's Departures"}</div>
            <div data-stat-value>{departuresLoading ? '—' : formatNumber(departures?.length ?? 0)}</div>
            <div data-stat-sublabel>{departures?.length ?? 0} expected</div>
          </div>
        </RoleGate>

        <RoleGate perm={PERMISSIONS.MAINTENANCE_TASK_READ}>
          <div data-stat-card>
            <div data-stat-icon data-tone="rose"><Icons.Key size={18} /></div>
            <div data-stat-label>Active Orders</div>
            <div data-stat-value>{woLoading ? '—' : formatNumber(openWorkOrders.length)}</div>
            <div data-stat-sublabel>
              {openWorkOrders.filter((w) => w.status === 'in_progress').length} in progress
            </div>
          </div>
        </RoleGate>
      </div>

      {/* ── Room status & occupancy ──────────────────────────────────────── */}
      <RoleGate perm={PERMISSIONS.ROOM_READ}>
        <div data-room-overview-card>
          <div data-room-overview-left>
            <div data-room-overview-title>
              <h3><Icons.BedDouble size={20} /> Room status &amp; occupancy</h3>
              <ViewAllLink href="/rooms" label="View all rooms" />
            </div>
            {statusBoardLoading ? <LoadingBlock rows={3} /> : (
              <div data-room-overview-body>
                <div data-room-donut-wrap>
                  <DonutChart
                    centerLabel={`${occupancyPct}%`}
                    centerValue="Occupied"
                    data={donutData}
                  />
                  <p data-room-donut-sublabel>{roomBuckets.occupied} of {totalRooms} rooms</p>
                </div>
                <div data-room-legend>
                  {donutData.map((item) => {
                    const pct = totalRooms > 0
                      ? ((item.value / totalRooms) * 100).toFixed(2)
                      : '0.00';
                    return (
                      <div key={item.label} data-room-legend-row>
                        <span data-room-legend-dot style={{ background: item.color }} />
                        <span data-room-legend-label>{item.label}</span>
                        <span data-room-legend-count>{item.value}</span>
                        <span data-room-legend-pct>{pct}%</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div data-room-overview-image>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=520&q=80"
              alt="Hotel room"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
            <div data-room-systems-badge>
              <div data-room-systems-badge-icon>
                <Icons.CheckCircle2 size={16} />
              </div>
              <div data-room-systems-badge-text>
                <h4>All systems running</h4>
                <p>Your hotel is operating normally.</p>
              </div>
            </div>
          </div>
        </div>
      </RoleGate>

      {/* ── Arrivals & departures | Housekeeping ────────────────────────── */}
      <div data-dashboard-grid>
        <RoleGate perm={PERMISSIONS.BOOKING_READ}>
          <Panel title="Arrivals &amp; departures" headerActions={<ViewAllLink href="/bookings" />}>
            {arrivalsLoading || departuresLoading ? <LoadingBlock rows={3} /> : (
              <>
                <SectionRow
                  icon={<Icons.CalendarCheck2 size={16} />}
                  iconBg="var(--tone-green-bg)" iconColor="var(--tone-green-fg)"
                  title="Arrivals (today)"
                  subtitle={arrivals?.length ? `${arrivals.length} arrival${arrivals.length > 1 ? 's' : ''} today` : 'No arrivals scheduled'}
                  value={arrivals?.length ?? 0}
                  href="/bookings?checkIn=today"
                />
                <SectionRow
                  icon={<Icons.DoorClosed size={16} />}
                  iconBg="var(--tone-blue-bg)" iconColor="var(--tone-blue-fg)"
                  title="Departures (today)"
                  subtitle={departures?.length ? `${departures.length} departure${departures.length > 1 ? 's' : ''} today` : 'No departures scheduled'}
                  value={departures?.length ?? 0}
                  href="/bookings?checkOut=today"
                />
                <SectionRow
                  icon={<Icons.CalendarDays size={16} />}
                  iconBg="var(--tone-purple-bg)" iconColor="var(--tone-purple-fg)"
                  title="Upcoming bookings"
                  subtitle="Next 7 days"
                  value={upcoming7?.length ?? 0}
                  href="/bookings"
                />
              </>
            )}
          </Panel>
        </RoleGate>

        <RoleGate perm={PERMISSIONS.HOUSEKEEPING_TASK_READ}>
          <Panel title="Housekeeping" headerActions={<ViewAllLink href="/housekeeping" />}>
            {hkLoading ? <LoadingBlock rows={4} /> : (
              <>
                <HkRow icon={<Icons.Clock size={15} />}        iconBg="var(--tone-amber-bg)" iconColor="var(--tone-amber-fg)" label="To do"                value={hkBuckets.pending}            href="/housekeeping?status=pending"    />
                <HkRow icon={<Icons.RefreshCw size={15} />}    iconBg="var(--tone-blue-bg)"  iconColor="var(--tone-blue-fg)"  label="In progress"           value={hkBuckets.inProgress}         href="/housekeeping?status=in_progress" />
                <HkRow icon={<Icons.Eye size={15} />}          iconBg="var(--tone-green-bg)" iconColor="var(--tone-green-fg)" label="Ready for inspection"  value={hkBuckets.readyForInspection} href="/housekeeping?status=completed"   />
                <HkRow icon={<Icons.CheckCircle2 size={15} />} iconBg="var(--tone-teal-bg)"  iconColor="var(--tone-teal-fg)"  label="Completed"             value={hkBuckets.completed}          href="/housekeeping?status=inspected"   />
              </>
            )}
          </Panel>
        </RoleGate>
      </div>

      {/* ── Revenue overview | Maintenance overview ──────────────────────── */}
      <div data-dashboard-grid>
        <RoleGate perm={PERMISSIONS.REPORT_REVENUE_READ}>
          <Panel title="Revenue overview (MTD)" headerActions={<ViewAllLink href="/reports/revenue" label="View report" />}>
            {revenueLoading ? <LoadingBlock rows={3} /> : (
              <>
                <div data-revenue-total>
                  <div data-revenue-total-amount>{formatZAR(totalRevenue)}</div>
                  <div data-revenue-total-label>Total revenue</div>
                </div>
                <div data-revenue-breakdown>
                  <div>
                    <div data-revenue-breakdown-amount>{formatZAR(roomRevenue)}</div>
                    <div data-revenue-breakdown-label>Room revenue</div>
                  </div>
                  <div>
                    <div data-revenue-breakdown-amount>{formatZAR(fbRevenue)}</div>
                    <div data-revenue-breakdown-label>F&amp;B revenue</div>
                  </div>
                  <div>
                    <div data-revenue-breakdown-amount>{formatZAR(otherRevenue)}</div>
                    <div data-revenue-breakdown-label>Other revenue</div>
                  </div>
                </div>
              </>
            )}
          </Panel>
        </RoleGate>

        <RoleGate perm={PERMISSIONS.MAINTENANCE_TASK_READ}>
          <Panel title="Maintenance overview" headerActions={<ViewAllLink href="/maintenance/work-orders" />}>
            {woLoading ? <LoadingBlock rows={3} /> : openWorkOrders.length === 0 ? (
              <div data-maintenance-empty>
                <div data-maintenance-empty-icon>
                  <Icons.Clock size={22} />
                </div>
                <p data-maintenance-empty-text>No open maintenance requests</p>
              </div>
            ) : (
              <>
                {openWorkOrders.slice(0, 4).map((w) => {
                  const room = typeof w.roomId === 'object' && w.roomId
                    ? ` · Room ${(w.roomId as { roomNumber: string }).roomNumber}`
                    : '';
                  return (
                    <Link key={w._id} href={`/maintenance/work-orders/${w._id}`} data-wo-row>
                      <span data-wo-dot data-priority={w.priority} />
                      <div data-wo-body>
                        <div data-wo-title>{w.title}{room}</div>
                        <div data-wo-status>{w.status.replace(/_/g, ' ')}</div>
                      </div>
                      <Icons.ChevronRight size={14} />
                    </Link>
                  );
                })}
              </>
            )}
          </Panel>
        </RoleGate>
      </div>

      {/* ── Recent activity ──────────────────────────────────────────────── */}
      <Panel title="Recent activity" headerActions={<ViewAllLink href="/bookings" />}>
        {recentActivity.length === 0 ? (
          <p data-empty-state>No recent activity to show.</p>
        ) : (
          <>
            {recentActivity.map((item, i) => (
              <Link key={i} href={item.href} data-activity-row>
                <div data-activity-icon style={{ background: item.iconBg, color: item.iconColor }}>
                  {item.icon}
                </div>
                <div data-activity-body>
                  <div data-activity-title>{item.title}</div>
                  <div data-activity-subtitle>{item.subtitle}</div>
                </div>
                <div data-activity-meta>
                  <span data-activity-time>{item.time}</span>
                  <Icons.ChevronRight size={15} />
                </div>
              </Link>
            ))}
          </>
        )}
      </Panel>

    </div>
  );
}
