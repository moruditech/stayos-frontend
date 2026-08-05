import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '@stayos/api-client';
import { PageHeader, StatCard, Panel, LoadingBlock, EmptyBlock, AreaLineChart, HorizontalBarChart, LinkArrow, Icons } from '@stayos/ui';
import { platformKeys } from '../lib/query-keys';
import { formatZAR, formatNumber, titleCase } from '../lib/format';

function rangeFor(preset: '7d' | '30d' | '90d' | 'ytd'): { from: string; to: string; groupBy: 'day' | 'month' } {
  const to = new Date();
  const from = new Date();
  if (preset === '7d') from.setDate(to.getDate() - 7);
  else if (preset === '30d') from.setDate(to.getDate() - 30);
  else if (preset === '90d') from.setDate(to.getDate() - 90);
  else from.setMonth(0, 1);
  return { from: from.toISOString(), to: to.toISOString(), groupBy: preset === 'ytd' ? 'month' : 'day' };
}

export default function RevenuePage(): React.ReactElement {
  const navigate = useNavigate();
  const [preset, setPreset] = React.useState<'7d' | '30d' | '90d' | 'ytd'>('30d');
  const range = rangeFor(preset);

  const { data, isLoading } = useQuery({
    queryKey: platformKeys.revenue(range),
    queryFn: () => api.platform.getRevenue(range),
  });

  const series = data ?? [];
  const total = series.reduce((sum, p) => sum + p.total, 0);
  const count = series.reduce((sum, p) => sum + p.count, 0);
  const avgPerPayment = count > 0 ? total / count : 0;

  const chartData = series.map((p) => ({
    label: range.groupBy === 'day' ? `${p._id.day}/${p._id.month}` : titleCase(new Date(2000, p._id.month - 1).toLocaleString('en', { month: 'short' })),
    value: p.total,
  }));

  const byGateway = series.reduce<Record<string, number>>((acc, p) => {
    for (const g of p.byGateway ?? []) {
      acc[g.gateway] = (acc[g.gateway] ?? 0) + g.amount;
    }
    return acc;
  }, {});

  return (
    <div>
      <PageHeader
        title="Revenue"
        subtitle="Payments processed across the platform."
        actions={
          <div data-segmented>
            {(['7d', '30d', '90d', 'ytd'] as const).map((p) => (
              <button key={p} data-segmented-option data-active={preset === p} onClick={() => setPreset(p)}>
                {p === 'ytd' ? 'Year to date' : `Last ${p.replace('d', ' days')}`}
              </button>
            ))}
          </div>
        }
      />

      {isLoading ? (
        <LoadingBlock rows={6} />
      ) : (
        <>
          <div data-stat-grid>
            <StatCard icon={Icons.TrendingUp} tone="green" label="Total Revenue" value={formatZAR(total)} sublabel="Selected range" />
            <StatCard icon={Icons.Receipt} tone="teal" label="Payments Processed" value={formatNumber(count)} />
            <StatCard icon={Icons.Banknote} tone="amber" label="Avg per Payment" value={formatZAR(avgPerPayment)} />
          </div>

          <div style={{ marginBottom: 'var(--space-4)' }}>
            <LinkArrow onClick={() => navigate('/subscriptions')}>View subscriptions</LinkArrow>
          </div>

          <div data-grid-2-1>
            <Panel title="Revenue trend">
              {chartData.length > 1 ? (
                <AreaLineChart data={chartData} formatValue={(v) => formatZAR(v)} />
              ) : (
                <EmptyBlock icon={Icons.TrendingUp} title="Not enough data yet for a trend" />
              )}
            </Panel>
            <Panel title="By payment gateway">
              {Object.keys(byGateway).length === 0 ? (
                <EmptyBlock icon={Icons.Banknote} title="No payments in this range" />
              ) : (
                <HorizontalBarChart
                  data={Object.entries(byGateway).map(([gateway, amount]) => ({ label: titleCase(gateway), value: amount }))}
                  formatValue={(v) => formatZAR(v)}
                />
              )}
            </Panel>
          </div>
        </>
      )}
    </div>
  );
}
