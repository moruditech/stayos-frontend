'use client';

import React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '@stayos/api-client';
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

// ── Date helpers ───────────────────────────────────────────────────────────
function localDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatDashboardDate(d: Date): string {
  return d.toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

function formatActivityTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit', hour12: false });
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
    occupied: count('occupied'),
    vacantClean: count('available'),
    vacantDirty: count('dirty') + count('cleaning') + count('inspection'),
    outOfOrder: count('out_of_order') + count('maintenance'),
    blocked: count('blocked'),
  };
}

interface HkTaskLike {
  status: string;
  type: string;
  roomId: { roomNumber: string } | string;
  completedAt?: string | undefined;
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

// ── Small reusable components ──────────────────────────────────────────────
function ViewAllLink({ href, label = 'View all' }: { href: string; label?: string | undefined }) {
  return (
    <Link href={href} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, color: 'var(--color-text-secondary)', textDecoration: 'none', fontWeight: 500 }}>
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
    <Link href={href} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 0', borderBottom: '1px solid var(--color-border)', textDecoration: 'none', color: 'inherit' }}>
      <div style={{ width: 40, height: 40, borderRadius: '50%', background: iconBg, color: iconColor, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)' }}>{title}</div>
        <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 1 }}>{subtitle}</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-text)', fontVariantNumeric: 'tabular-nums' }}>{value}</span>
        <Icons.ChevronRight size={16} style={{ color: 'var(--color-text-muted)' }} />
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
    <Link href={href} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 0', borderBottom: '1px solid var(--color-border)', textDecoration: 'none', color: 'inherit' }}>
      <div style={{ width: 36, height: 36, borderRadius: '50%', background: iconBg, color: iconColor, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {icon}
      </div>
      <span style={{ flex: 1, fontSize: 14, fontWeight: 500, color: 'var(--color-text)' }}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 18, fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: 'var(--color-text)' }}>{value}</span>
        <Icons.ChevronRight size={16} style={{ color: 'var(--color-text-muted)' }} />
      </div>
    </Link>
  );
}

export default function DashboardPage(): React.ReactElement {
  const queryClient = useQueryClient();
  const { todayIso, sevenDaysIso, monthStart, monthEnd, now } = useDateRanges();

  const canReadReports = useHasPerm(PERMISSIONS.REPORT_READ);
  const canReadRooms = useHasPerm(PERMISSIONS.ROOM_READ);
  const canReadBookings = useHasPerm(PERMISSIONS.BOOKING_READ);
  const canReadRevenue = useHasPerm(PERMISSIONS.REPORT_REVENUE_READ);
  const canReadHousekeeping = useHasPerm(PERMISSIONS.HOUSEKEEPING_TASK_READ);
  const canReadMaintenance = useHasPerm(PERMISSIONS.MAINTENANCE_TASK_READ);

  // Occupancy
  const { data: occupancy, isLoading: occupancyLoading } = useQuery({
    queryKey: reportKeys.occupancy({ scope: 'today' }),
    queryFn: () => api.reports.getOccupancy(),
    enabled: canReadReports,
    staleTime: 60_000,
  });

  // Room status board
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
  const occupancyPct = totalRooms > 0 ? ((roomBuckets.occupied / totalRooms) * 100).toFixed(2) : '0.00';

  // Arrivals
  const { data: arrivals, isLoading: arrivalsLoading } = useQuery({
    queryKey: bookingKeys.list({ type: 'arrivals-today' }),
    queryFn: () => api.bookings.list({ checkInFrom: todayIso, checkInTo: todayIso, limit: 50 } as Parameters<typeof api.bookings.list>[0]),
    enabled: canReadBookings,
    staleTime: 60_000,
  });

  // Departures
  const { data: departures, isLoading: departuresLoading } = useQuery({
    queryKey: bookingKeys.list({ type: 'departures-today' }),
    queryFn: () => api.bookings.list({ checkOutFrom: todayIso, checkOutTo: todayIso, limit: 50 } as Parameters<typeof api.bookings.list>[0]),
    enabled: canReadBookings,
    staleTime: 60_000,
  });

  // Upcoming 7 days
  const { data: upcoming7 } = useQuery({
    queryKey: bookingKeys.list({ type: 'upcoming-7' }),
    queryFn: () => api.bookings.list({ checkInFrom: todayIso, checkInTo: sevenDaysIso, limit: 200 } as Parameters<typeof api.bookings.list>[0]),
    enabled: canReadBookings,
    staleTime: 60_000,
  });

  // Revenue MTD
  const { data: revenueMTD, isLoading: revenueLoading } = useQuery({
    queryKey: reportKeys.revenue({ scope: 'mtd' }),
    queryFn: () => api.reports.getRevenue({ from: monthStart.toISOString(), to: monthEnd.toISOString(), groupBy: 'day' }),
    enabled: canReadRevenue,
    staleTime: 60_000,
  });
  const { data: revpar } = useQuery({
    queryKey: reportKeys.revpar({ scope: 'mtd' }),
    queryFn: () => api.reports.getRevPar({ from: monthStart.toISOString(), to: monthEnd.toISOString() }),
    enabled: canReadRevenue,
    staleTime: 60_000,
  });

  const totalRevenue = (revenueMTD?.total as number | undefined) ?? 0;
  const roomRevenue = (revenueMTD?.roomRevenue as number | undefined) ?? 0;
  const fbRevenue = (revenueMTD?.fbRevenue as number | undefined) ?? 0;
  const otherRevenue = totalRevenue - roomRevenue - fbRevenue;

  // Housekeeping
  const { data: hkTasks, isLoading: hkLoading } = useQuery({
    queryKey: housekeepingKeys.tasks({ date: todayIso }),
    queryFn: () => api.housekeeping.listTasks({ date: todayIso, limit: 200 } as unknown as Parameters<typeof api.housekeeping.listTasks>[0]) as unknown as Promise<HkTaskLike[]>,
    enabled: canReadHousekeeping,
    staleTime: 30_000,
  });
  const hkBuckets = bucketHousekeeping(hkTasks);

  // Maintenance
  const { data: workOrders, isLoading: woLoading } = useQuery({
    queryKey: maintenanceKeys.workOrders({ open: true }),
    queryFn: () => api.maintenance.listWorkOrders({ status: ['submitted', 'assigned', 'in_progress', 'on_hold'], limit: 50 }),
    enabled: canReadMaintenance,
    staleTime: 60_000,
  });
  const openWorkOrders = workOrders ?? [];

  // Recent activity
  interface ActivityItem { icon: React.ReactNode; iconBg: string; title: string; subtitle: string; time: string; sortMs: number; href: string; }
  const recentActivity: ActivityItem[] = React.useMemo(() => {
    const entries: ActivityItem[] = [];
    const today = 'Today';

    // Arrivals/bookings
    [...(arrivals ?? []), ...(departures ?? [])].forEach((b) => {
      const guest = `${b.customerId?.firstName ?? ''} ${b.customerId?.lastName ?? ''}`.trim();
      const guests = b.adults + (b.children ?? 0);
      entries.push({
        icon: <Icons.Calendar size={16} />, iconBg: 'var(--tone-green-bg)', iconColor: 'var(--tone-green-fg)',
        title: 'New booking received',
        subtitle: `${guest || 'Guest'} booked a room${guests > 0 ? ` · ${guests} guest${guests > 1 ? 's' : ''}` : ''}`,
        time: `${today}, ${formatActivityTime(b.createdAt)}`,
        sortMs: new Date(b.createdAt).getTime(),
        href: '/bookings',
      });
    });

    // Housekeeping
    (hkTasks ?? []).filter((t) => t.status === 'completed' || t.status === 'inspected').forEach((t) => {
      const room = typeof t.roomId === 'object' ? `Room ${t.roomId.roomNumber}` : 'Room';
      const when = t.completedAt ?? t.updatedAt;
      entries.push({
        icon: <Icons.Sparkles size={16} />, iconBg: 'var(--tone-blue-bg)', iconColor: 'var(--tone-blue-fg)',
        title: 'Room cleaned',
        subtitle: `${room} · Housekeeping`,
        time: `${today}, ${formatActivityTime(when)}`,
        sortMs: new Date(when).getTime(),
        href: '/housekeeping',
      });
    });

    // Maintenance
    openWorkOrders.slice(0, 3).forEach((w) => {
      const room = typeof w.roomId === 'object' && w.roomId ? ` · Room ${(w.roomId as { roomNumber: string }).roomNumber}` : '';
      entries.push({
        icon: <Icons.Wrench size={16} />, iconBg: 'var(--tone-amber-bg)', iconColor: 'var(--tone-amber-fg)',
        title: 'Maintenance request',
        subtitle: `${w.title}${room}`,
        time: `${today}, ${formatActivityTime(w.createdAt)}`,
        sortMs: new Date(w.createdAt).getTime(),
        href: '/maintenance/work-orders',
      });
    });

    return entries.sort((a, b) => b.sortMs - a.sortMs).slice(0, 6);
  }, [arrivals, departures, hkTasks, openWorkOrders]);

  const isInitialLoading = occupancyLoading && statusBoardLoading && arrivalsLoading && departuresLoading && revenueLoading;
  if (isInitialLoading) return <LoadingBlock rows={6} />;

  const donutData = [
    { label: 'Occupied', value: roomBuckets.occupied, color: 'var(--color-primary)' },
    { label: 'Vacant (Clean)', value: roomBuckets.vacantClean, color: 'var(--color-success)' },
    { label: 'Vacant (Dirty)', value: roomBuckets.vacantDirty, color: 'var(--color-warning)' },
    { label: 'Out of Order', value: roomBuckets.outOfOrder, color: 'var(--color-danger)' },
  ];
  const LEGEND_DOTS: Record<string, string> = {
    'Occupied': 'var(--color-primary)',
    'Vacant (Clean)': 'var(--color-success)',
    'Vacant (Dirty)': 'var(--color-warning)',
    'Out of Order': 'var(--color-danger)',
  };

  return (
    <div data-page="dashboard">

      {/* ── Page header ─────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 'var(--space-6)' }}>
        <div>
          <h1 style={{ fontSize: 32, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--color-text)', margin: 0, lineHeight: 1.15 }}>Home</h1>
          <p style={{ fontSize: 14, color: 'var(--color-text-muted)', marginTop: 4, marginBottom: 0 }}>{"Today's overview"}</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', background: 'var(--color-surface)', fontSize: 13, color: 'var(--color-text-secondary)', fontWeight: 500 }}>
          <Icons.Calendar size={14} />
          <span>{formatDashboardDate(now)}</span>
          <Icons.ChevronDown size={14} />
        </div>
      </div>

      {/* ── 4 stat cards ────────────────────────────────────────────────── */}
      <div data-stat-grid style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: 'var(--space-5)' }}>
        <RoleGate perm={PERMISSIONS.REPORT_READ}>
          <div data-stat-card>
            <div data-stat-icon data-tone="green" style={{ borderRadius: '50%' }}>
              <Icons.Percent size={18} />
            </div>
            <div data-stat-label>Occupancy</div>
            <div data-stat-value>{occupancy ? `${occupancy.occupancyRate}%` : `${occupancyPct}%`}</div>
            <div data-stat-sublabel>{roomBuckets.occupied} of {totalRooms} rooms</div>
          </div>
        </RoleGate>

        <RoleGate perm={PERMISSIONS.BOOKING_READ}>
          <div data-stat-card>
            <div data-stat-icon data-tone="blue" style={{ borderRadius: '50%' }}>
              <Icons.CalendarCheck2 size={18} />
            </div>
            <div data-stat-label>{"Today's Arrivals"}</div>
            <div data-stat-value>{arrivalsLoading ? '—' : formatNumber(arrivals?.length ?? 0)}</div>
            <div data-stat-sublabel>{arrivals?.length ?? 0} expected</div>
          </div>

          <div data-stat-card>
            <div data-stat-icon data-tone="amber" style={{ borderRadius: '50%' }}>
              <Icons.DoorClosed size={18} />
            </div>
            <div data-stat-label>{"Today's Departures"}</div>
            <div data-stat-value>{departuresLoading ? '—' : formatNumber(departures?.length ?? 0)}</div>
            <div data-stat-sublabel>{departures?.length ?? 0} expected</div>
          </div>
        </RoleGate>

        <RoleGate perm={PERMISSIONS.MAINTENANCE_TASK_READ}>
          <div data-stat-card>
            <div data-stat-icon data-tone="rose" style={{ borderRadius: '50%' }}>
              <Icons.Key size={18} />
            </div>
            <div data-stat-label>Active Orders</div>
            <div data-stat-value>{woLoading ? '—' : formatNumber(openWorkOrders.length)}</div>
            <div data-stat-sublabel>{openWorkOrders.filter(w => w.status === 'in_progress').length} in progress</div>
          </div>
        </RoleGate>
      </div>

      {/* ── Room status & occupancy (full width) ──────────────────────── */}
      <RoleGate perm={PERMISSIONS.ROOM_READ}>
        <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-card)', marginBottom: 'var(--space-5)', overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 0 }}>
            {/* Left — chart + legend */}
            <div style={{ padding: 'var(--space-5)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-5)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Icons.BedDouble size={20} style={{ color: 'var(--color-primary)' }} />
                  <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text)' }}>Room status &amp; occupancy</span>
                </div>
                <ViewAllLink href="/rooms" label="View all rooms" />
              </div>
              {statusBoardLoading ? <LoadingBlock rows={3} /> : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-8)' }}>
                  <div style={{ flexShrink: 0 }}>
                    <DonutChart
                      centerLabel={`${occupancyPct}%`}
                      centerValue="Occupied"
                      data={donutData}
                    />
                    <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--color-text-muted)', marginTop: 4 }}>{roomBuckets.occupied} of {totalRooms} rooms</div>
                  </div>
                  <div style={{ flex: 1 }}>
                    {donutData.map((item) => {
                      const pct = totalRooms > 0 ? ((item.value / totalRooms) * 100).toFixed(2) : '0.00';
                      return (
                        <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '1px solid var(--color-border)' }}>
                          <span style={{ width: 10, height: 10, borderRadius: '50%', background: LEGEND_DOTS[item.label] ?? 'var(--color-neutral)', flexShrink: 0, display: 'inline-block' }} />
                          <span style={{ flex: 1, fontSize: 13.5, color: 'var(--color-text)' }}>{item.label}</span>
                          <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--color-text)', fontVariantNumeric: 'tabular-nums', minWidth: 20, textAlign: 'right' }}>{item.value}</span>
                          <span style={{ fontSize: 13, color: 'var(--color-text-muted)', minWidth: 54, textAlign: 'right' }}>{pct}%</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Right — room image + all systems running */}
            <div style={{ width: 260, position: 'relative', flexShrink: 0 }}>
              <div style={{ width: '100%', height: '100%', minHeight: 280, background: 'linear-gradient(135deg, #d4c5a9 0%, #c4b090 50%, #b8a882 100%)', position: 'relative', overflow: 'hidden' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=520&q=80"
                  alt="Hotel room"
                  style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0 }}
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
                {/* All systems running badge */}
                <div style={{ position: 'absolute', bottom: 16, left: 12, right: 12, background: 'white', borderRadius: 'var(--radius-md)', padding: '10px 14px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--tone-green-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                    <Icons.CheckCircle2 size={16} style={{ color: 'var(--color-success)' }} />
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)' }}>All systems running</div>
                    <div style={{ fontSize: 11.5, color: 'var(--color-text-muted)', marginTop: 2 }}>Your hotel is operating normally.</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </RoleGate>

      {/* ── Row 2: Arrivals & departures | Housekeeping ─────────────────── */}
      <div data-dashboard-grid style={{ marginBottom: 'var(--space-5)', alignItems: 'start' }}>
        <RoleGate perm={PERMISSIONS.BOOKING_READ}>
          <Panel title="Arrivals &amp; departures" headerActions={<ViewAllLink href="/bookings" />}>
            {arrivalsLoading || departuresLoading ? <LoadingBlock rows={3} /> : (
              <div>
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
                <div style={{ borderBottom: 'none' }}>
                  <SectionRow
                    icon={<Icons.CalendarDays size={16} />}
                    iconBg="var(--tone-purple-bg)" iconColor="var(--tone-purple-fg)"
                    title="Upcoming bookings"
                    subtitle="Next 7 days"
                    value={upcoming7?.length ?? 0}
                    href="/bookings"
                  />
                </div>
              </div>
            )}
          </Panel>
        </RoleGate>

        <RoleGate perm={PERMISSIONS.HOUSEKEEPING_TASK_READ}>
          <Panel title="Housekeeping" headerActions={<ViewAllLink href="/housekeeping" />}>
            {hkLoading ? <LoadingBlock rows={4} /> : (
              <div>
                <HkRow icon={<Icons.Clock size={15} />} iconBg="var(--tone-amber-bg)" iconColor="var(--tone-amber-fg)" label="To do" value={hkBuckets.pending} href="/housekeeping?status=pending" />
                <HkRow icon={<Icons.RefreshCw size={15} />} iconBg="var(--tone-blue-bg)" iconColor="var(--tone-blue-fg)" label="In progress" value={hkBuckets.inProgress} href="/housekeeping?status=in_progress" />
                <HkRow icon={<Icons.Eye size={15} />} iconBg="var(--tone-green-bg)" iconColor="var(--tone-green-fg)" label="Ready for inspection" value={hkBuckets.readyForInspection} href="/housekeeping?status=completed" />
                <HkRow icon={<Icons.CheckCircle2 size={15} />} iconBg="#e6f4ea" iconColor="#2d7a3a" label="Completed" value={hkBuckets.completed} href="/housekeeping?status=inspected" />
              </div>
            )}
          </Panel>
        </RoleGate>
      </div>

      {/* ── Row 3: Revenue overview | Maintenance overview ───────────────── */}
      <div data-dashboard-grid style={{ marginBottom: 'var(--space-5)', alignItems: 'start' }}>
        <RoleGate perm={PERMISSIONS.REPORT_REVENUE_READ}>
          <Panel title="Revenue overview (MTD)" headerActions={<ViewAllLink href="/reports/revenue" label="View report" />}>
            {revenueLoading ? <LoadingBlock rows={3} /> : (
              <div>
                <div style={{ marginBottom: 'var(--space-4)' }}>
                  <div style={{ fontSize: 36, fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--color-text)', lineHeight: 1.1, fontVariantNumeric: 'tabular-nums' }}>{formatZAR(totalRevenue)}</div>
                  <div style={{ fontSize: 12.5, color: 'var(--color-text-muted)', marginTop: 4 }}>Total revenue</div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--space-3)', paddingTop: 'var(--space-4)', borderTop: '1px solid var(--color-border)' }}>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text)', fontVariantNumeric: 'tabular-nums' }}>{formatZAR(roomRevenue)}</div>
                    <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 3 }}>Room revenue</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text)', fontVariantNumeric: 'tabular-nums' }}>{formatZAR(fbRevenue)}</div>
                    <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 3 }}>F&amp;B revenue</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text)', fontVariantNumeric: 'tabular-nums' }}>{formatZAR(Math.max(0, otherRevenue))}</div>
                    <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 3 }}>Other revenue</div>
                  </div>
                </div>
              </div>
            )}
          </Panel>
        </RoleGate>

        <RoleGate perm={PERMISSIONS.MAINTENANCE_TASK_READ}>
          <Panel title="Maintenance overview" headerActions={<ViewAllLink href="/maintenance/work-orders" />}>
            {woLoading ? <LoadingBlock rows={3} /> : openWorkOrders.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 'var(--space-8) 0', gap: 'var(--space-3)' }}>
                <div style={{ width: 48, height: 48, borderRadius: '50%', border: '2px solid var(--color-success)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icons.Clock size={22} style={{ color: 'var(--color-success)' }} />
                </div>
                <p style={{ fontSize: 13.5, color: 'var(--color-text-muted)', margin: 0, textAlign: 'center' }}>No open maintenance requests</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                {openWorkOrders.slice(0, 4).map((w) => {
                  const room = typeof w.roomId === 'object' && w.roomId ? ` · Room ${(w.roomId as { roomNumber: string }).roomNumber}` : '';
                  return (
                    <Link key={w._id} href={`/maintenance/work-orders/${w._id}`} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '1px solid var(--color-border)', textDecoration: 'none' }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: w.priority === 'critical' || w.priority === 'high' ? 'var(--color-danger)' : 'var(--color-warning)', flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{w.title}{room}</div>
                        <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 1, textTransform: 'capitalize' }}>{w.status.replace(/_/g, ' ')}</div>
                      </div>
                      <Icons.ChevronRight size={14} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
                    </Link>
                  );
                })}
              </div>
            )}
          </Panel>
        </RoleGate>
      </div>

      {/* ── Recent activity (full width) ──────────────────────────────────── */}
      <Panel title="Recent activity" headerActions={<ViewAllLink href="/bookings" />}>
        {recentActivity.length === 0 ? (
          <p style={{ fontSize: 13.5, color: 'var(--color-text-muted)', padding: 'var(--space-4) 0', textAlign: 'center', margin: 0 }}>No recent activity to show.</p>
        ) : (
          <div>
            {recentActivity.map((item, i) => (
              <Link key={i} href={item.href} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 0', borderBottom: i < recentActivity.length - 1 ? '1px solid var(--color-border)' : 'none', textDecoration: 'none', color: 'inherit' }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: item.iconBg, color: item.iconColor, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {item.icon}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)' }}>{item.title}</div>
                  <div style={{ fontSize: 12.5, color: 'var(--color-text-muted)', marginTop: 2 }}>{item.subtitle}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                  <span style={{ fontSize: 12.5, color: 'var(--color-text-muted)' }}>{item.time}</span>
                  <Icons.ChevronRight size={15} style={{ color: 'var(--color-text-muted)' }} />
                </div>
              </Link>
            ))}
          </div>
        )}
      </Panel>

    </div>
  );
}
