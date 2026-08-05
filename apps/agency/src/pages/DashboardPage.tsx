import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '@stayos/api-client';
import type { AgencyMandate } from '@stayos/api-client';
import { useSession } from '@stayos/auth';
import {
  PageHeader,
  StatCard,
  Panel,
  LinkArrow,
  ActivityFeed,
  AlertList,
  RankList,
  QuickActionsBar,
  LoadingBlock,
  HorizontalBarChart,
  Icons,
  type ActivityEntry,
  type AlertEntry,
} from '@stayos/ui';
import { agencyKeys, agencyStaffKeys, mandateKeys, statementKeys } from '../lib/query-keys';
import { formatZAR, formatNumber, formatPercent, timeAgo, daysUntil, formatDate } from '../lib/format';

export default function DashboardPage(): React.ReactElement {
  const session = useSession();
  const navigate = useNavigate();

  const me = useQuery({
    queryKey: agencyStaffKeys.detail(session?.userId ?? ''),
    queryFn: () => api.agency.getStaff(session!.userId),
    enabled: !!session?.userId,
  });
  const portfolio = useQuery({ queryKey: agencyKeys.portfolio(), queryFn: api.agency.getPortfolio });
  const mandates = useQuery({ queryKey: mandateKeys.list(), queryFn: () => api.agency.listMandates() });
  const analytics = useQuery({ queryKey: agencyKeys.analytics(), queryFn: () => api.agency.getAnalytics() });
  const statements = useQuery({
    queryKey: statementKeys.list({ limit: 100 }),
    queryFn: () => api.agency.listStatements({ limit: 100 }),
  });
  const staffList = useQuery({
    queryKey: agencyStaffKeys.list({ limit: 5 }),
    queryFn: () => api.agency.listStaff({ limit: 5 }),
  });

  const loading = portfolio.isLoading || mandates.isLoading;

  if (loading) {
    return (
      <div>
        <PageHeader title="Home" />
        <LoadingBlock rows={6} />
      </div>
    );
  }

  const properties = portfolio.data?.properties ?? [];
  const mandateList: AgencyMandate[] = mandates.data ?? [];
  const currentYear = String(new Date().getFullYear());

  const revenueMtd = properties.reduce((sum, p) => sum + (p.currentMonthFeeRecord?.grossRevenue ?? 0), 0);
  const feesMtd = properties.reduce((sum, p) => sum + (p.currentMonthFeeRecord?.managementFeeAmount ?? 0), 0);
  const roomsOccupied = properties.reduce((sum, p) => sum + (p.occupiedTonight ?? 0), 0);
  const avgFeeRate = revenueMtd > 0 ? (feesMtd / revenueMtd) * 100 : 0;

  const ytdStatements = (statements.data?.data ?? []).filter((s) => s.period.startsWith(currentYear));
  const statementsYtd = ytdStatements.reduce((sum, s) => sum + s.managementFeeAmount, 0);

  const activeMandates = mandateList.filter((m) => m.mandateStatus === 'active').length;
  const pendingMandates = mandateList.filter((m) => m.mandateStatus === 'pending').length;
  const terminatedMandates = mandateList.filter((m) => m.mandateStatus === 'terminated').length;
  const expiringSoon = mandateList.filter((m) => {
    if (m.mandateStatus !== 'termination_notice' || !m.terminationDate) return false;
    const d = daysUntil(m.terminationDate);
    return d !== null && d >= 0 && d <= 30;
  });

  const topProperties = [...properties]
    .filter((p) => p.property)
    .sort((a, b) => (b.currentMonthFeeRecord?.grossRevenue ?? 0) - (a.currentMonthFeeRecord?.grossRevenue ?? 0))
    .slice(0, 3);
  const maxTopRevenue = Math.max(1, ...topProperties.map((p) => p.currentMonthFeeRecord?.grossRevenue ?? 0));

  // Alerts — every entry below is derived from a real record, not invented.
  const alerts: AlertEntry[] = [
    ...expiringSoon.map((m) => ({
      tone: 'danger' as const,
      icon: Icons.CalendarClock,
      title: 'Mandate expiring soon',
      meta: `${m.propertyId?.name ?? 'Property'} — ${formatDate(m.terminationDate)}`,
      action: (
        <button data-btn-secondary data-btn-sm onClick={() => navigate(`/mandates/${m._id}`)}>
          View
        </button>
      ),
    })),
    ...(statements.data?.data ?? [])
      .filter((s) => s.status === 'draft')
      .slice(0, 3)
      .map((s) => ({
        tone: 'warning' as const,
        icon: Icons.Clock,
        title: 'Statement awaiting finalisation',
        meta: `${typeof s.tenantId === 'object' ? s.tenantId.name : 'Property'} — ${s.period}`,
        action: (
          <button data-btn-secondary data-btn-sm onClick={() => navigate('/statements')}>
            View
          </button>
        ),
      })),
  ].slice(0, 4);

  // Recent activity — composed from real timestamped records across three
  // resources (no dedicated activity-log endpoint exists for this portal).
  const activity: ActivityEntry[] = [
    ...mandateList
      .filter((m) => m.createdAt)
      .map((m) => ({
        icon: Icons.FileText,
        title: `Mandate ${m.mandateStatus === 'active' ? 'accepted' : m.mandateStatus === 'pending' ? 'requested' : m.mandateStatus.replace(/_/g, ' ')}`,
        meta: m.propertyId?.name,
        time: m.createdAt,
      })),
    ...(staffList.data?.data ?? []).map((s) => ({
      icon: Icons.UserPlus,
      title: 'Staff member added',
      meta: `${s.firstName} ${s.lastName} — ${s.role.replace('agency_', '')}`,
      time: s.createdAt,
    })),
    ...ytdStatements
      .filter((s) => s.status === 'finalised' && s.finalisedAt)
      .map((s) => ({
        icon: Icons.Receipt,
        title: 'Statement finalised',
        meta: `${s.period} — ${typeof s.tenantId === 'object' ? s.tenantId.name : ''}`,
        time: s.finalisedAt as string,
      })),
  ]
    .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
    .slice(0, 4)
    .map((a) => ({ icon: a.icon, title: a.title, meta: a.meta, time: timeAgo(a.time) }));

  const revenueByProperty = properties
    .filter((p) => p.property && (p.currentMonthFeeRecord?.grossRevenue ?? 0) > 0)
    .sort((a, b) => (b.currentMonthFeeRecord?.grossRevenue ?? 0) - (a.currentMonthFeeRecord?.grossRevenue ?? 0))
    .slice(0, 5)
    .map((p) => ({ label: p.property!.name, value: p.currentMonthFeeRecord?.grossRevenue ?? 0 }));

  return (
    <div>
      <PageHeader
        title={me.data ? `Good morning, ${me.data.firstName}` : 'Good morning'}
        subtitle="Here's what's happening across your portfolio today."
      />

      <div data-stat-grid>
        <StatCard
          icon={Icons.Building2}
          tone="green"
          label="Total Properties"
          value={formatNumber(portfolio.data?.summary.total ?? 0)}
          sublabel="Managed"
          footer={<LinkArrow onClick={() => navigate('/portfolio')}>View portfolio</LinkArrow>}
        />
        <StatCard
          icon={Icons.FileText}
          tone="amber"
          label="Active Mandates"
          value={formatNumber(activeMandates)}
          sublabel={`${mandateList.length} total`}
          footer={<LinkArrow onClick={() => navigate('/mandates')}>View mandates</LinkArrow>}
        />
        <StatCard
          icon={Icons.Users}
          tone="purple"
          label="Rooms Occupied Tonight"
          value={formatNumber(roomsOccupied)}
          sublabel="Across portfolio"
        />
        <StatCard
          icon={Icons.TrendingUp}
          tone="teal"
          label="Revenue (MTD)"
          value={formatZAR(revenueMtd)}
          sublabel="Gross, across portfolio"
        />
        <StatCard
          icon={Icons.Receipt}
          tone="blue"
          label="Statements (YTD)"
          value={formatZAR(statementsYtd)}
          sublabel="Fees earned"
          footer={<LinkArrow onClick={() => navigate('/statements')}>View statements</LinkArrow>}
        />
      </div>

      <div data-grid-2-1>
        <Panel title="Portfolio overview" headerActions={<LinkArrow onClick={() => navigate('/portfolio')}>View all properties</LinkArrow>}>
          {properties.length === 0 ? (
            <div data-empty-state>
              <div data-empty-state-title>No properties yet</div>
              <div data-empty-state-description>Onboard a property or request a mandate to get started.</div>
            </div>
          ) : (
            <div data-data-table>
              <div data-data-table-scroll>
                <table>
                  <thead>
                    <tr>
                      <th>Property</th>
                      <th>Location</th>
                      <th>Occupied tonight</th>
                      <th>Fees (MTD)</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {properties.slice(0, 6).map((p) => (
                      <tr key={p.mandateId} data-clickable onClick={() => navigate('/portfolio')}>
                        <td>
                          <div data-cell-entity-name>{p.property?.name ?? 'Pending'}</div>
                          <div data-cell-entity-sub>{p.property?.type?.replace(/_/g, ' ')}</div>
                        </td>
                        <td>{(p.property?.address as { city?: string } | undefined)?.city ?? '—'}</td>
                        <td data-tabular-nums>{p.occupiedTonight}</td>
                        <td data-tabular-nums>{formatZAR(p.currentMonthFeeRecord?.managementFeeAmount ?? 0)}</td>
                        <td>
                          <span data-status-badge data-status={p.mandateStatus}>{p.mandateStatus.replace('_', ' ')}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </Panel>

        <Panel title="Mandates summary" headerActions={<LinkArrow onClick={() => navigate('/mandates')}>View all</LinkArrow>}>
          <div data-insight-list>
            <div data-insight-row>
              <div data-insight-icon><Icons.CheckCircle2 size={15} /></div>
              <span data-insight-label>Active</span>
              <span data-insight-value>{activeMandates}</span>
            </div>
            <div data-insight-row>
              <div data-insight-icon><Icons.Clock size={15} /></div>
              <span data-insight-label>Pending (awaiting response)</span>
              <span data-insight-value>{pendingMandates}</span>
            </div>
            <div data-insight-row>
              <div data-insight-icon><Icons.CalendarClock size={15} /></div>
              <span data-insight-label>Expiring soon (30 days)</span>
              <span data-insight-value>{expiringSoon.length}</span>
            </div>
            <div data-insight-row>
              <div data-insight-icon><Icons.FileX2 size={15} /></div>
              <span data-insight-label>Terminated</span>
              <span data-insight-value>{terminatedMandates}</span>
            </div>
          </div>
        </Panel>
      </div>

      <div data-grid-2-1>
        <Panel title="Performance overview" description="This month">
          <div data-kv-grid style={{ marginBottom: 'var(--space-5)' }}>
            <div data-readonly-field>
              <span data-readonly-label>Revenue</span>
              <span data-readonly-value data-tabular-nums>{formatZAR(revenueMtd)}</span>
            </div>
            <div data-readonly-field>
              <span data-readonly-label>Management fees</span>
              <span data-readonly-value data-tabular-nums>{formatZAR(feesMtd)}</span>
            </div>
            <div data-readonly-field>
              <span data-readonly-label>Active bookings</span>
              <span data-readonly-value data-tabular-nums>{formatNumber(analytics.data?.activeBookings ?? 0)}</span>
            </div>
            <div data-readonly-field>
              <span data-readonly-label>Avg fee rate</span>
              <span data-readonly-value data-tabular-nums>{formatPercent(avgFeeRate, 1)}</span>
            </div>
          </div>
          {revenueByProperty.length > 0 ? (
            <>
              <span data-eyebrow>Revenue by property, this month</span>
              <div style={{ marginTop: 'var(--space-3)' }}>
                <HorizontalBarChart data={revenueByProperty} formatValue={(v) => formatZAR(v)} />
              </div>
            </>
          ) : null}
          <div style={{ marginTop: 'var(--space-3)' }}>
            <LinkArrow onClick={() => navigate('/analytics')}>View full analytics</LinkArrow>
          </div>
        </Panel>

        <Panel title="Top performing properties" description="This month">
          <RankList
            items={topProperties.map((p) => ({
              title: p.property!.name,
              meta: (p.property?.address as { city?: string } | undefined)?.city,
              barPercent: ((p.currentMonthFeeRecord?.grossRevenue ?? 0) / maxTopRevenue) * 100,
              value: formatZAR(p.currentMonthFeeRecord?.grossRevenue ?? 0),
            }))}
          />
          <div style={{ marginTop: 'var(--space-3)' }}>
            <LinkArrow onClick={() => navigate('/analytics')}>View all performance</LinkArrow>
          </div>
        </Panel>
      </div>

      <div data-grid-2col>
        <Panel title="Upcoming alerts" headerActions={<LinkArrow onClick={() => navigate('/mandates')}>View all alerts</LinkArrow>}>
          <AlertList items={alerts} />
        </Panel>

        <Panel title="Recent activity" headerActions={<LinkArrow onClick={() => navigate('/mandates')}>View all</LinkArrow>}>
          <ActivityFeed items={activity} />
        </Panel>
      </div>

      <QuickActionsBar
        actions={[
          { icon: Icons.Building2, title: 'Onboard new property', description: 'Add a new property and invite owner', onClick: () => navigate('/properties/onboard') },
          { icon: Icons.FileText, title: 'Create mandate', description: 'Request management of a property', onClick: () => navigate('/mandates/new') },
          { icon: Icons.UserPlus, title: 'Add staff member', description: 'Invite a new team member', onClick: () => navigate('/staff?action=new') },
          { icon: Icons.BarChart3, title: 'Run portfolio report', description: 'Export performance summary', onClick: () => navigate('/analytics') },
        ]}
      />
    </div>
  );
}
