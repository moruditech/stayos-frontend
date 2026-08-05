import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '@stayos/api-client';
import { PageHeader, StatCard, Panel, LoadingBlock, EmptyBlock, HorizontalBarChart, LinkArrow, Icons } from '@stayos/ui';
import { agencyKeys } from '../lib/query-keys';
import { formatZAR, formatNumber, formatPercent } from '../lib/format';

export default function AnalyticsPage(): React.ReactElement {
  const location = useLocation();
  if (location.pathname === '/analytics/compare') return <CompareView />;
  return <AnalyticsOverview />;
}

function AnalyticsOverview(): React.ReactElement {
  const navigate = useNavigate();
  const analytics = useQuery({ queryKey: agencyKeys.analytics(), queryFn: () => api.agency.getAnalytics() });
  const portfolio = useQuery({ queryKey: agencyKeys.portfolio(), queryFn: api.agency.getPortfolio });

  if (analytics.isLoading || portfolio.isLoading) {
    return (
      <div>
        <PageHeader title="Analytics" subtitle="Insights across your managed properties and portfolio performance." />
        <LoadingBlock rows={6} />
      </div>
    );
  }

  const properties = portfolio.data?.properties ?? [];
  const revenueMtd = properties.reduce((sum, p) => sum + (p.currentMonthFeeRecord?.grossRevenue ?? 0), 0);
  const feesMtd = properties.reduce((sum, p) => sum + (p.currentMonthFeeRecord?.managementFeeAmount ?? 0), 0);

  const byType = properties.reduce<Record<string, number>>((acc, p) => {
    const t = p.property?.type ?? 'unknown';
    acc[t] = (acc[t] ?? 0) + 1;
    return acc;
  }, {});

  const revenueByProperty = [...properties]
    .filter((p) => p.property)
    .sort((a, b) => (b.currentMonthFeeRecord?.grossRevenue ?? 0) - (a.currentMonthFeeRecord?.grossRevenue ?? 0))
    .map((p) => ({ label: p.property!.name, value: p.currentMonthFeeRecord?.grossRevenue ?? 0 }));

  return (
    <div>
      <PageHeader
        title="Analytics"
        subtitle="Insights across your managed properties and portfolio performance."
        actions={
          <button data-btn-secondary onClick={() => navigate('/analytics/compare')}>
            <Icons.ArrowLeftRight /> Compare Properties
          </button>
        }
      />

      <div data-stat-grid>
        <StatCard icon={Icons.TrendingUp} tone="green" label="Total Revenue (MTD)" value={formatZAR(revenueMtd)} sublabel="Gross, across portfolio" />
        <StatCard icon={Icons.Receipt} tone="teal" label="Management Fees (MTD)" value={formatZAR(feesMtd)} sublabel="Your earnings" />
        <StatCard icon={Icons.ClipboardList} tone="amber" label="Active Bookings" value={formatNumber(analytics.data?.activeBookings ?? 0)} sublabel="Across managed properties" />
        <StatCard
          icon={Icons.Percent}
          tone="purple"
          label="Avg Fee Rate"
          value={formatPercent(revenueMtd > 0 ? (feesMtd / revenueMtd) * 100 : 0, 1)}
          sublabel="Blended, this month"
        />
      </div>

      <div data-grid-2-1>
        <Panel title="Revenue by property" description="This month, gross revenue">
          {revenueByProperty.length === 0 ? (
            <EmptyBlock icon={Icons.TrendingUp} title="No revenue recorded yet this month" />
          ) : (
            <HorizontalBarChart data={revenueByProperty} formatValue={(v) => formatZAR(v)} />
          )}
        </Panel>

        <Panel title="Portfolio mix">
          <div data-insight-list>
            {Object.entries(byType).map(([type, count]) => (
              <div key={type} data-insight-row>
                <div data-insight-icon><Icons.Building size={15} /></div>
                <span data-insight-label>{type.replace(/_/g, ' ')}</span>
                <span data-insight-value>{count}</span>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <Panel title="Property performance" headerActions={<LinkArrow onClick={() => navigate('/analytics/compare')}>Compare properties</LinkArrow>}>
        <div data-data-table>
          <div data-data-table-scroll>
            <table>
              <thead>
                <tr>
                  <th>Property</th>
                  <th>Revenue (MTD)</th>
                  <th>Fees (MTD)</th>
                  <th>Occupied tonight</th>
                  <th>Mandate</th>
                </tr>
              </thead>
              <tbody>
                {properties.filter((p) => p.property).map((p) => (
                  <tr key={p.mandateId}>
                    <td><div data-cell-entity-name>{p.property!.name}</div></td>
                    <td data-tabular-nums>{formatZAR(p.currentMonthFeeRecord?.grossRevenue ?? 0)}</td>
                    <td data-tabular-nums>{formatZAR(p.currentMonthFeeRecord?.managementFeeAmount ?? 0)}</td>
                    <td data-tabular-nums>{p.occupiedTonight}</td>
                    <td><span data-status-badge data-status={p.mandateStatus}>{p.mandateStatus.replace('_', ' ')}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Panel>
    </div>
  );
}

function CompareView(): React.ReactElement {
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({ queryKey: agencyKeys.compareAnalytics(), queryFn: api.agency.getCompareAnalytics });

  return (
    <div>
      <div data-breadcrumb>
        <a href="#" onClick={(e) => { e.preventDefault(); navigate('/analytics'); }}>Analytics</a>
        <Icons.ChevronRight /> <span>Compare</span>
      </div>
      <PageHeader title="Compare Properties" subtitle="Bookings and revenue side by side across your managed portfolio." />
      <Panel>
        {isLoading ? (
          <LoadingBlock />
        ) : !data || data.length === 0 ? (
          <EmptyBlock icon={Icons.ArrowLeftRight} title="Nothing to compare yet" />
        ) : (
          <div data-data-table>
            <div data-data-table-scroll>
              <table>
                <thead>
                  <tr><th>Property</th><th>Total Bookings</th><th>Total Revenue</th></tr>
                </thead>
                <tbody>
                  {[...data].sort((a, b) => b.totalRevenue - a.totalRevenue).map((row) => (
                    <tr key={row.tenantId}>
                      <td><div data-cell-entity-name>{row.tenantName}</div></td>
                      <td data-tabular-nums>{formatNumber(row.totalBookings)}</td>
                      <td data-tabular-nums>{formatZAR(row.totalRevenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Panel>
    </div>
  );
}
