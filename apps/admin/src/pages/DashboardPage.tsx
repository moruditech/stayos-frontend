import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '@stayos/api-client';
import { useSession } from '@stayos/auth';
import { PERMISSIONS } from '@stayos/constants';
import {
  PageHeader,
  StatCard,
  Panel,
  LinkArrow,
  LoadingBlock,
  EmptyBlock,
  AreaLineChart,
  DonutChart,
  Icons,
} from '@stayos/ui';
import { formatZAR, formatNumber, timeAgo, formatDate, titleCase } from '../lib/format';

const TIER_COLORS: Record<string, string> = {
  enterprise: '#123C2E',
  pbsa_enterprise: '#123C2E',
  agency_pro: '#123C2E',
  pro: '#1D7449',
  pbsa_pro: '#1D7449',
  growth: '#9C6B14',
  pbsa_growth: '#9C6B14',
  agency_base: '#9C6B14',
  starter: '#29579C',
  pbsa_starter: '#29579C',
  addon: '#6A4CBF',
};

function startOfMonthISO(): string {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString();
}

export default function DashboardPage(): React.ReactElement {
  const session = useSession();
  const navigate = useNavigate();

  const dashboard = useQuery({ queryKey: ['platform', 'dashboard'], queryFn: api.platform.getDashboard });
  const agencies = useQuery({ queryKey: ['platform', 'agencies', 'count'], queryFn: () => api.platform.listAgencies({ limit: 1 }) });
  const revenue = useQuery({
    queryKey: ['platform', 'revenue', 'mtd'],
    queryFn: () => api.platform.getRevenue({ from: startOfMonthISO(), to: new Date().toISOString(), groupBy: 'day' }),
  });
  const subscriptions = useQuery({
    queryKey: ['platform', 'subscriptions', 'sample'],
    queryFn: () => api.platform.listSubscriptions({ limit: 100, status: 'active' }),
  });
  const vettingPending = useQuery({ queryKey: ['vetting', 'pending', 'dashboard'], queryFn: () => api.vetting.getPending({ limit: 100 }) });
  const recentApplications = useQuery({ queryKey: ['vetting', 'recent'], queryFn: () => api.vetting.listAll({ limit: 5 }) });

  const canSeeFinance = !!(session?.permissions.includes(PERMISSIONS.PLATFORM_FINANCE_READ) || session?.permissions.includes(PERMISSIONS.WILDCARD));
  const canSeeTickets = !!(session?.permissions.includes(PERMISSIONS.TICKET_MANAGE) || session?.permissions.includes(PERMISSIONS.WILDCARD));

  const openTickets = useQuery({
    queryKey: ['support', 'open-count'],
    queryFn: async () => {
      const [open, inProgress, pendingUser] = await Promise.all([
        api.support.listAll({ status: 'open', limit: 1 }),
        api.support.listAll({ status: 'in_progress', limit: 1 }),
        api.support.listAll({ status: 'pending_user', limit: 1 }),
      ]);
      return open.meta.total + inProgress.meta.total + pendingUser.meta.total;
    },
    enabled: canSeeTickets,
  });
  const recentTickets = useQuery({
    queryKey: ['support', 'recent-open'],
    queryFn: () => api.support.listAll({ status: 'open', limit: 4 }),
    enabled: canSeeTickets,
  });

  if (dashboard.isLoading) {
    return (
      <div>
        <PageHeader title="Good morning" />
        <LoadingBlock rows={6} />
      </div>
    );
  }

  const d = dashboard.data;
  const revenueThisMonth = (revenue.data ?? []).reduce((sum, p) => sum + p.total, 0);
  const revenueSeries = (revenue.data ?? []).map((p) => ({
    label: `${p._id.day ?? ''}/${p._id.month}`,
    value: p.total,
  }));

  const tierBreakdown = (subscriptions.data?.data ?? []).reduce<Record<string, number>>((acc, s) => {
    const tier = s.planId?.tier ?? 'unknown';
    acc[tier] = (acc[tier] ?? 0) + 1;
    return acc;
  }, {});
  const donutData = Object.entries(tierBreakdown)
    .sort((a, b) => b[1] - a[1])
    .map(([tier, count]) => ({ label: titleCase(tier), value: count, color: TIER_COLORS[tier] ?? '#948C7C' }));
  const sampledSubs = subscriptions.data?.data.length ?? 0;
  const totalActiveSubs = subscriptions.data?.meta.total ?? 0;

  // Vetting queue buckets — derived client-side from the pending set, since
  // there's no dedicated backend aggregation for exactly these four buckets.
  const pendingItems = vettingPending.data?.data ?? [];
  const pendingReview = pendingItems.filter((a) => a.status === 'documents_submitted' || a.status === 'under_review').length;
  const flagged = pendingItems.filter((a) => a.flaggedForManualReview).length;
  const docsRequested = pendingItems.filter((a) => {
    if (a.status !== 'documents_requested') return false;
    const allSubmitted = a.documentsRequired.every((doc) => !doc.required || doc.submitted);
    return !allSubmitted;
  }).length;
  const awaitingResubmissionReview = pendingItems.filter((a) => {
    if (a.status !== 'documents_requested') return false;
    const allSubmitted = a.documentsRequired.every((doc) => !doc.required || doc.submitted);
    return allSubmitted;
  }).length;

  return (
    <div>
      <PageHeader title="Good morning" subtitle="Here's what's happening on StayOS today." />

      <div data-stat-grid>
        <StatCard
          icon={Icons.Building2}
          tone="green"
          label="Total Tenants"
          value={formatNumber(d?.activeTenants ?? 0)}
          sublabel="Active"
          footer={<LinkArrow onClick={() => navigate('/tenants')}>View tenants</LinkArrow>}
        />
        <StatCard
          icon={Icons.Agency}
          tone="amber"
          label="Total Agencies"
          value={formatNumber(agencies.data?.meta.total ?? 0)}
          footer={<LinkArrow onClick={() => navigate('/agencies')}>View agencies</LinkArrow>}
        />
        <StatCard
          icon={Icons.CreditCard}
          tone="purple"
          label="Active Subscriptions"
          value={formatNumber(d?.activeSubscriptions ?? 0)}
          footer={canSeeFinance ? <LinkArrow onClick={() => navigate('/subscriptions')}>View subscriptions</LinkArrow> : undefined}
        />
        <StatCard
          icon={Icons.TrendingUp}
          tone="teal"
          label="Revenue This Month"
          value={formatZAR(revenueThisMonth)}
          sublabel={`${formatZAR(d?.todayRevenue ?? 0)} today`}
          footer={canSeeFinance ? <LinkArrow onClick={() => navigate('/revenue')}>View revenue</LinkArrow> : undefined}
        />
        <StatCard
          icon={Icons.LifeBuoy}
          tone="rose"
          label="Open Support Tickets"
          value={canSeeTickets ? formatNumber(openTickets.data ?? 0) : '—'}
          footer={canSeeTickets ? <LinkArrow onClick={() => navigate('/support/tickets')}>View tickets</LinkArrow> : undefined}
        />
      </div>

      {canSeeFinance ? (
        <div data-grid-2-1>
          <Panel title="Revenue this month" description={formatZAR(revenueThisMonth)}>
            {revenueSeries.length > 1 ? (
              <AreaLineChart data={revenueSeries} formatValue={(v) => formatZAR(v)} />
            ) : (
              <EmptyBlock icon={Icons.TrendingUp} title="Not enough data yet for a trend" />
            )}
          </Panel>

          <Panel title="Active subscriptions by plan">
            {donutData.length === 0 ? (
              <EmptyBlock icon={Icons.CreditCard} title="No active subscriptions" />
            ) : (
              <>
                <DonutChart data={donutData} centerLabel="Active" centerValue={formatNumber(totalActiveSubs)} />
                {totalActiveSubs > sampledSubs ? (
                  <p style={{ fontSize: 11.5, color: 'var(--color-text-muted)', marginTop: 'var(--space-3)' }}>
                    Breakdown based on the most recent {sampledSubs} of {totalActiveSubs} active subscriptions.
                  </p>
                ) : null}
              </>
            )}
          </Panel>
        </div>
      ) : null}

      <div data-grid-2-1>
        <Panel title="Vetting queue" headerActions={<LinkArrow onClick={() => navigate('/vetting')}>View all</LinkArrow>}>
          <div data-insight-list>
            <div data-insight-row>
              <div data-insight-icon><Icons.Clock size={15} /></div>
              <span data-insight-label>Pending review</span>
              <span data-insight-value>{pendingReview}</span>
            </div>
            <div data-insight-row>
              <div data-insight-icon><Icons.FileText size={15} /></div>
              <span data-insight-label>Documents requested</span>
              <span data-insight-value>{docsRequested}</span>
            </div>
            <div data-insight-row>
              <div data-insight-icon><Icons.FileCheck2 size={15} /></div>
              <span data-insight-label>Awaiting resubmission review</span>
              <span data-insight-value>{awaitingResubmissionReview}</span>
            </div>
            <div data-insight-row>
              <div data-insight-icon><Icons.Flag size={15} /></div>
              <span data-insight-label>Flagged</span>
              <span data-insight-value>{flagged}</span>
            </div>
          </div>
        </Panel>

        <Panel title="Recent applications" headerActions={<LinkArrow onClick={() => navigate('/vetting/applications')}>View all</LinkArrow>}>
          {(recentApplications.data?.data ?? []).length === 0 ? (
            <EmptyBlock icon={Icons.ClipboardList} title="No applications yet" />
          ) : (
            <div data-data-table>
              <table>
                <thead><tr><th>Applicant</th><th>Type</th><th>Submitted</th><th>Status</th></tr></thead>
                <tbody>
                  {(recentApplications.data?.data ?? []).map((a) => (
                    <tr key={a._id} data-clickable onClick={() => navigate(`/vetting/applications/${a._id}`)}>
                      <td>
                        <div data-cell-entity-name>{a.applicantType === 'agency' ? a.businessName || a.applicantName : a.propertyName || a.applicantName}</div>
                        <div data-cell-entity-sub>{a.propertyCity ?? a.applicantName}</div>
                      </td>
                      <td><span data-status-badge data-status={a.applicantType === 'agency' ? 'agency' : 'property'}>{a.applicantType === 'agency' ? 'Agency' : 'Property'}</span></td>
                      <td>{formatDate(a.submittedAt ?? a.createdAt)}</td>
                      <td><span data-status-badge data-status={a.status}>{a.status.replace(/_/g, ' ')}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </div>

      {canSeeTickets ? (
        <Panel title="Open support tickets" headerActions={<LinkArrow onClick={() => navigate('/support/tickets')}>View all</LinkArrow>}>
          {(recentTickets.data?.data ?? []).length === 0 ? (
            <EmptyBlock icon={Icons.LifeBuoy} title="No open tickets — nice work" />
          ) : (
            <div>
              {(recentTickets.data?.data ?? []).map((t) => (
                <div key={String(t['_id'])} data-alert-row style={{ cursor: 'pointer' }} onClick={() => navigate(`/support/tickets/${t['_id']}`)}>
                  <div data-alert-icon data-tone={t['priority'] === 'urgent' || t['priority'] === 'high' ? 'danger' : 'warning'}>
                    <Icons.MessageSquare size={15} />
                  </div>
                  <div data-alert-body>
                    <div data-alert-title>{String(t['subject'])}</div>
                    <div data-alert-meta>{String(t['ticketNumber'] ?? '')} · {String(t['category'] ?? '')}</div>
                  </div>
                  <span data-status-badge data-status={String(t['priority'])}>{String(t['priority'])}</span>
                  <span style={{ fontSize: 11.5, color: 'var(--color-text-muted)', marginLeft: 'var(--space-3)' }}>
                    {timeAgo(String(t['createdAt'] ?? ''))}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Panel>
      ) : null}

      <div data-quick-actions>
        <a href="#" data-quick-action onClick={(e) => { e.preventDefault(); navigate('/vetting'); }}>
          <div data-quick-action-icon><Icons.ClipboardList size={18} /></div>
          <div><div data-quick-action-title>Review vetting queue</div><div data-quick-action-desc>Approve or follow up on applications</div></div>
          <Icons.ArrowRight data-quick-action-arrow />
        </a>
        <a href="#" data-quick-action onClick={(e) => { e.preventDefault(); navigate('/users/new'); }}>
          <div data-quick-action-icon><Icons.UserCog size={18} /></div>
          <div><div data-quick-action-title>Add platform user</div><div data-quick-action-desc>Create a new staff account</div></div>
          <Icons.ArrowRight data-quick-action-arrow />
        </a>
        <a href="#" data-quick-action onClick={(e) => { e.preventDefault(); navigate('/coupons/new'); }}>
          <div data-quick-action-icon><Icons.Gift size={18} /></div>
          <div><div data-quick-action-title>Create coupon</div><div data-quick-action-desc>Add a platform discount code</div></div>
          <Icons.ArrowRight data-quick-action-arrow />
        </a>
        <a href="#" data-quick-action onClick={(e) => { e.preventDefault(); navigate('/plans'); }}>
          <div data-quick-action-icon><Icons.Tag size={18} /></div>
          <div><div data-quick-action-title>Manage plans</div><div data-quick-action-desc>Edit pricing and plan features</div></div>
          <Icons.ArrowRight data-quick-action-arrow />
        </a>
        <a href="#" data-quick-action onClick={(e) => { e.preventDefault(); navigate('/audit-logs'); }}>
          <div data-quick-action-icon><Icons.ScrollText size={18} /></div>
          <div><div data-quick-action-title>View audit logs</div><div data-quick-action-desc>Review system activity</div></div>
          <Icons.ArrowRight data-quick-action-arrow />
        </a>
      </div>
    </div>
  );
}
