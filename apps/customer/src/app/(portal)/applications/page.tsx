'use client';
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSession } from '@stayos/auth';
import { api } from '@stayos/api-client';
import { SkeletonLoader, EmptyState, Icons } from '@stayos/ui';
import { applicationKeys } from '@/lib/query-keys';

type Tab = 'all' | 'student' | 'long_term' | 'other';
const TABS = [
  { id: 'all' as Tab,       label: 'All',            icon: Icons.LayoutGrid },
  { id: 'student' as Tab,   label: 'Student Housing', icon: Icons.GraduationCap },
  { id: 'long_term' as Tab, label: 'Long Term',       icon: Icons.Building2 },
  { id: 'other' as Tab,     label: 'Other',           icon: Icons.Circle },
];

export default function ApplicationsPage(): React.ReactElement {
  const session = useSession();
  const [tab, setTab] = useState<Tab>('all');

  const { data: applications, isLoading } = useQuery({
    queryKey: applicationKeys.list(),
    queryFn:  () => api.customer.listApplications(),
    enabled:  !!session,
  });

  const all = (applications as Record<string, unknown>[] | undefined) ?? [];
  const filtered = tab === 'all' ? all : all.filter((a) => a['category'] === tab);

  return (
    <div data-page>
      <h1 data-page-title>My Applications</h1>
      <p data-page-subtitle>Track and manage all your applications</p>

      <div data-filter-tabs role="tablist">
        {TABS.map((t) => (
          <button key={t.id} type="button" role="tab" aria-selected={tab === t.id}
            data-filter-tab data-active={tab === t.id ? '' : undefined} onClick={() => setTab(t.id)}>
            <span aria-hidden="true"><t.icon size={16} /></span>{t.label}
          </button>
        ))}
      </div>

      {/* Callout */}
      <div data-card-padded style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-5)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
          <span style={{ color: 'var(--color-primary)' }} aria-hidden="true"><Icons.ClipboardList size={26} /></span>
          <div>
            <strong style={{ fontSize: 'var(--text-sm)' }}>Everything in one place</strong>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)' }}>
              View the status of all your applications and complete any pending requirements.
            </p>
          </div>
        </div>
        <a href="/accommodation" data-btn-secondary style={{ whiteSpace: 'nowrap', flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          New application <Icons.Plus size={16} />
        </a>
      </div>

      {isLoading ? <SkeletonLoader rows={4} /> : filtered.length === 0 ? (
        <EmptyState title="No applications" description="Start by browsing accommodation and applying."
          action={<a href="/accommodation" data-btn-primary>Browse accommodation</a>} />
      ) : (
        <>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-4)' }}>
            <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>
              Applications ({filtered.length})
            </span>
            <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', display: 'inline-flex', alignItems: 'center', gap: 'var(--space-1)' }}>
              Sort by: Newest <Icons.ChevronDown size={14} />
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            {filtered.map((app) => <ApplicationCard key={app['_id'] as string} application={app} />)}
          </div>
        </>
      )}

      <div data-support-callout style={{ marginTop: 'var(--space-6)' }}>
        <div data-support-callout-text>
          <span data-support-callout-icon aria-hidden="true"><Icons.Headphones size={20} /></span>
          <div>
            <strong>Need help with your application?</strong>
            <p>Our support team is here to help you with any questions.</p>
          </div>
        </div>
        <a href="/support" data-btn-secondary style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          Contact support <Icons.ArrowRight size={16} />
        </a>
      </div>
    </div>
  );
}

const STATUS_COLORS: Record<string, string> = {
  under_review: 'warning', submitted: 'pending', approved: 'confirmed',
  rejected: 'cancelled', declined: 'cancelled', in_progress: 'upcoming', withdrawn: 'cancelled',
};

function ApplicationCard({ application: app }: { application: Record<string, unknown> }): React.ReactElement {
  const status = (app['status'] as string) ?? 'submitted';
  const appliedDate = new Date(app['createdAt'] as string).toLocaleDateString('en-ZA', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
  const academicYear = app['academicYear'] as string | undefined;
  const moveInDate = app['moveInDate'] as string | undefined;

  return (
    <a href={`/applications/${app['_id'] as string}`} data-application-card style={{ textDecoration: 'none', color: 'inherit' }}>
      <div data-application-card-image>
        {/* Image path: /images/properties/[propertySlug]-thumb.jpg */}
        <img src={`/images/properties/${app['propertySlug'] as string}-thumb.jpg`} alt="" loading="lazy"
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
        <span data-app-status-badge>
          <span data-status-badge data-status={STATUS_COLORS[status] ?? 'pending'}>
            {status.replace(/_/g, ' ')}
          </span>
        </span>
      </div>
      <div data-application-card-body>
        <div data-application-card-name>
          {(app['propertyName'] as string) ?? 'Property'}
          <span style={{ color: 'var(--color-text-muted)' }}>›</span>
        </div>
        <div data-application-card-type>
          <span aria-hidden="true">🎓</span>
          {(app['type'] as string)?.replace(/_/g, ' ') ?? 'Application'}
        </div>
        <div data-application-card-meta>Applied on {appliedDate}</div>
        {academicYear && (
          <div data-application-card-meta>Academic Year: {academicYear}</div>
        )}
        {moveInDate && (
          <div data-application-card-meta>Move-in: {new Date(moveInDate).toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
        )}
        <div data-application-card-footer>
          <div data-application-card-id>Application ID: {(app['applicationId'] as string) ?? '—'}</div>
          <button type="button" data-btn-secondary style={{ padding: 'var(--space-2) var(--space-4)', fontSize: 'var(--text-xs)' }}>
            View details
          </button>
        </div>
      </div>
    </a>
  );
}
