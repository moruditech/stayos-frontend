import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '@stayos/api-client';
import { PageHeader, StatCard, Panel, LoadingBlock, EmptyBlock, Icons } from '@stayos/ui';
import { agencyKeys } from '../lib/query-keys';
import { formatZAR, formatNumber, formatPercent } from '../lib/format';
import { useEnterAgencyProperty } from '../hooks/useEnterAgencyProperty';

const TYPE_LABELS: Record<string, string> = {
  hotel: 'Hotels',
  guesthouse: 'Guesthouses',
  bed_and_breakfast: 'B&Bs',
  boutique_hotel: 'Boutique Hotels',
  student_housing: 'Student Housing',
  lodge: 'Lodges',
  villa: 'Villas',
  apartment: 'Apartments',
  rental: 'Rentals',
};

export default function PortfolioPage(): React.ReactElement {
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({ queryKey: agencyKeys.portfolio(), queryFn: api.agency.getPortfolio });
  const { enterProperty, loading: entering } = useEnterAgencyProperty();

  const [search, setSearch] = React.useState('');
  const [typeFilter, setTypeFilter] = React.useState('all');
  const [provinceFilter, setProvinceFilter] = React.useState('all');
  const [statusFilter, setStatusFilter] = React.useState('all');
  const [sortBy, setSortBy] = React.useState<'revenue' | 'name' | 'occupied'>('revenue');

  if (isLoading) {
    return (
      <div>
        <PageHeader title="Portfolio" subtitle="Manage all properties under your agency's mandate." />
        <LoadingBlock rows={6} />
      </div>
    );
  }

  const properties = data?.properties ?? [];
  const revenueMtd = properties.reduce((sum, p) => sum + (p.currentMonthFeeRecord?.grossRevenue ?? 0), 0);
  const feesMtd = properties.reduce((sum, p) => sum + (p.currentMonthFeeRecord?.managementFeeAmount ?? 0), 0);
  const roomsOccupied = properties.reduce((sum, p) => sum + (p.occupiedTonight ?? 0), 0);
  const avgFeeRate = revenueMtd > 0 ? (feesMtd / revenueMtd) * 100 : 0;

  const typeBreakdown = properties.reduce<Record<string, number>>((acc, p) => {
    const type = p.property?.type ?? 'unknown';
    acc[type] = (acc[type] ?? 0) + 1;
    return acc;
  }, {});

  let filtered = properties.filter((p) => {
    if (!p.property) return statusFilter === 'all';
    if (search && !p.property.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (typeFilter !== 'all' && p.property.type !== typeFilter) return false;
    if (provinceFilter !== 'all' && (p.property.address as { province?: string } | undefined)?.province !== provinceFilter) return false;
    if (statusFilter !== 'all' && p.mandateStatus !== statusFilter) return false;
    return true;
  });

  filtered = [...filtered].sort((a, b) => {
    if (sortBy === 'name') return (a.property?.name ?? '').localeCompare(b.property?.name ?? '');
    if (sortBy === 'occupied') return (b.occupiedTonight ?? 0) - (a.occupiedTonight ?? 0);
    return (b.currentMonthFeeRecord?.grossRevenue ?? 0) - (a.currentMonthFeeRecord?.grossRevenue ?? 0);
  });

  const provinces = Array.from(
    new Set(properties.map((p) => (p.property?.address as { province?: string } | undefined)?.province).filter(Boolean))
  ) as string[];

  return (
    <div>
      <PageHeader
        title="Portfolio"
        subtitle="Manage all properties under your agency's mandate."
        actions={
          <>
            <button data-btn-primary onClick={() => navigate('/properties/onboard')}>
              <Icons.Plus /> Onboard New Property
            </button>
            <button data-btn-secondary onClick={() => navigate('/mandates/new')}>
              <Icons.Download /> Request Mandate
            </button>
          </>
        }
      />

      <div data-stat-grid>
        <StatCard icon={Icons.Building2} tone="green" label="Total Properties" value={formatNumber(data?.summary.total ?? 0)} sublabel="Managed" />
        <StatCard icon={Icons.FileText} tone="amber" label="Active Mandates" value={formatNumber(data?.summary.active ?? 0)} sublabel="Live mandates" />
        <StatCard icon={Icons.Users} tone="purple" label="Rooms Occupied Tonight" value={formatNumber(roomsOccupied)} sublabel="Across portfolio" />
        <StatCard icon={Icons.TrendingUp} tone="teal" label="Portfolio Revenue (MTD)" value={formatZAR(revenueMtd)} sublabel="Gross revenue" />
        <StatCard icon={Icons.Receipt} tone="blue" label="Avg Fee Rate" value={formatPercent(avgFeeRate, 1)} sublabel="Blended, this month" />
      </div>

      <div data-grid-2-1>
        <div>
          <div data-filter-bar>
            <label data-filter-search>
              <Icons.Search />
              <input placeholder="Search properties..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </label>
            <label data-filter-select>
              <span>Property Type</span>
              <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
                <option value="all">All</option>
                {Object.entries(TYPE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </label>
            <label data-filter-select>
              <span>Province</span>
              <select value={provinceFilter} onChange={(e) => setProvinceFilter(e.target.value)}>
                <option value="all">All</option>
                {provinces.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </label>
            <label data-filter-select>
              <span>Status</span>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="all">All</option>
                <option value="active">Active</option>
                <option value="pending">Pending</option>
                <option value="termination_notice">Termination notice</option>
              </select>
            </label>
            <label data-filter-select>
              <span>Sort by</span>
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value as typeof sortBy)}>
                <option value="revenue">Total Revenue</option>
                <option value="occupied">Occupied tonight</option>
                <option value="name">Name</option>
              </select>
            </label>
          </div>

          <Panel title="Property portfolio">
            {filtered.length === 0 ? (
              <EmptyBlock icon={Icons.Building2} title="No properties match these filters" description="Try clearing a filter or search term." />
            ) : (
              <div data-data-table>
                <div data-data-table-scroll>
                  <table>
                    <thead>
                      <tr>
                        <th>Property</th>
                        <th>City</th>
                        <th>Contact</th>
                        <th>Occupied tonight</th>
                        <th>Revenue (MTD)</th>
                        <th>Mandate</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((p) => (
                        <tr key={p.mandateId}>
                          <td>
                            <div data-cell-entity>
                              <div data-cell-thumb style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Icons.Building2 size={17} style={{ color: 'var(--color-text-muted)' }} />
                              </div>
                              <div>
                                <div data-cell-entity-name>{p.property?.name ?? 'Pending claim'}</div>
                                <div data-cell-entity-sub>{TYPE_LABELS[p.property?.type ?? ''] ?? p.property?.type}</div>
                              </div>
                            </div>
                          </td>
                          <td>{(p.property?.address as { city?: string } | undefined)?.city ?? '—'}</td>
                          <td>{p.property?.contactEmail ?? '—'}</td>
                          <td data-tabular-nums>{p.occupiedTonight}</td>
                          <td data-tabular-nums>{formatZAR(p.currentMonthFeeRecord?.grossRevenue ?? 0)}</td>
                          <td>
                            <span data-status-badge data-status={p.mandateStatus}>{p.mandateStatus.replace('_', ' ')}</span>
                          </td>
                          <td>
                            <div data-cell-actions>
                              <button
                                data-btn-secondary
                                data-btn-sm
                                disabled={!p.property || entering}
                                onClick={() => p.property && enterProperty(p.property._id)}
                              >
                                Enter Property <Icons.ArrowRight />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </Panel>
        </div>

        <Panel title="Portfolio Insights">
          <div data-insight-list>
            {Object.entries(typeBreakdown).map(([type, count]) => (
              <div key={type} data-insight-row>
                <div data-insight-icon><Icons.Building size={15} /></div>
                <span data-insight-label>{TYPE_LABELS[type] ?? type}</span>
                <span data-insight-value>{count}</span>
              </div>
            ))}
            {Object.keys(typeBreakdown).length === 0 ? (
              <div data-empty-state><div data-empty-state-description>No properties yet</div></div>
            ) : null}
          </div>
        </Panel>
      </div>
    </div>
  );
}
