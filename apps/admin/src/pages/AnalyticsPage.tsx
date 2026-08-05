import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@stayos/api-client';
import { PageHeader, StatCard, Panel, LoadingBlock, EmptyBlock, HorizontalBarChart, Icons } from '@stayos/ui';
import { platformKeys } from '../lib/query-keys';
import { formatNumber, formatZAR, titleCase } from '../lib/format';

export default function AnalyticsPage(): React.ReactElement {
  const { data, isLoading } = useQuery({ queryKey: platformKeys.analytics(), queryFn: api.platform.getAnalytics });

  if (isLoading) {
    return (
      <div>
        <PageHeader title="Analytics" subtitle="Platform-wide composition and trends." />
        <LoadingBlock rows={6} />
      </div>
    );
  }

  const tenantsByType = data?.tenantsByType ?? [];
  const revenueByGateway = data?.revenueByGateway ?? [];
  const totalTenants = tenantsByType.reduce((sum, t) => sum + t.count, 0);
  const totalGatewayRevenue = revenueByGateway.reduce((sum, g) => sum + g.total, 0);

  return (
    <div>
      <PageHeader title="Analytics" subtitle="Platform-wide composition and trends." />

      <div data-stat-grid>
        <StatCard icon={Icons.Building2} tone="green" label="Total Tenants" value={formatNumber(totalTenants)} sublabel="Across all types" />
        <StatCard icon={Icons.Sparkles} tone="amber" label="New Tenants" value={formatNumber(data?.newTenantsLast30Days ?? 0)} sublabel="Last 30 days" />
        <StatCard icon={Icons.Banknote} tone="teal" label="Lifetime Revenue" value={formatZAR(totalGatewayRevenue)} sublabel="All gateways" />
      </div>

      <div data-grid-2col>
        <Panel title="Tenants by type">
          {tenantsByType.length === 0 ? (
            <EmptyBlock icon={Icons.Building2} title="No tenant data yet" />
          ) : (
            <HorizontalBarChart data={tenantsByType.map((t) => ({ label: titleCase(t._id), value: t.count }))} />
          )}
        </Panel>
        <Panel title="Revenue by payment gateway" description="Lifetime">
          {revenueByGateway.length === 0 ? (
            <EmptyBlock icon={Icons.Banknote} title="No payment data yet" />
          ) : (
            <HorizontalBarChart
              data={revenueByGateway.map((g) => ({ label: titleCase(g._id), value: g.total }))}
              formatValue={(v) => formatZAR(v)}
            />
          )}
        </Panel>
      </div>
    </div>
  );
}
