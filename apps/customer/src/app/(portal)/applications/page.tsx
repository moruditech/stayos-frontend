'use client';
import Link from 'next/link';
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSession } from '@stayos/auth';
import { api } from '@stayos/api-client';
import { SkeletonLoader, EmptyState, Icons, type LucideIcon } from '@stayos/ui';
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
      <div data-card-padded style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-5)', background: 'var(--color-primary-tint)', borderColor: 'transparent' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
          <span style={{ width: '44px', height: '44px', borderRadius: 'var(--radius-pill)', background: 'var(--color-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-primary)', flexShrink: 0 }} aria-hidden="true">
            <Icons.FileCheck2 size={22} />
          </span>
          <div>
            <strong style={{ fontSize: '13px', color: 'var(--color-primary)' }}>Everything in one place</strong>
            <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
              View the status of all your applications and complete any pending requirements.
            </p>
          </div>
        </div>
        <Link href="/accommodation" data-btn-secondary style={{ whiteSpace: 'nowrap', flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          New application <Icons.Plus size={16} />
        </Link>
      </div>

      {isLoading ? <SkeletonLoader rows={4} /> : filtered.length === 0 ? (
        <EmptyState title="No applications" description="Start by browsing accommodation and applying."
          action={<Link href="/accommodation" data-btn-primary>Browse accommodation</Link>} />
      ) : (
        <>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-4)' }}>
            <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
              Applications ({filtered.length})
            </span>
            <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)', display: 'inline-flex', alignItems: 'center', gap: 'var(--space-1)' }}>
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
        <Link href="/support" data-btn-secondary style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          Contact support <Icons.ArrowRight size={16} />
        </Link>
      </div>
    </div>
  );
}

const STATUS_COLORS: Record<string, string> = {
  under_review: 'warning', submitted: 'pending', approved: 'confirmed',
  rejected: 'cancelled', declined: 'cancelled', in_progress: 'upcoming', withdrawn: 'cancelled',
};

const TYPE_ICON_MAP: Record<string, LucideIcon> = {
  student:    Icons.GraduationCap,
  long_term:  Icons.Building2,
  other:      Icons.Home,
};

const TYPE_LABEL_MAP: Record<string, string> = {
  student:    'Student Housing',
  long_term:  'Long Term Accommodation',
  other:      'Application',
};

function ApplicationCard({ application: app }: { application: Record<string, unknown> }): React.ReactElement {
  const status = (app['status'] as string) ?? 'submitted';
  const appliedDate = new Date(app['createdAt'] as string).toLocaleDateString('en-ZA', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
  const academicYear = app['academicYear'] as string | undefined;
  const moveInDate = app['moveInDate'] as string | undefined;
  const checkInDate = app['checkInDate'] as string | undefined;
  const category = (app['category'] as string) ?? 'other';
  const TypeIcon = TYPE_ICON_MAP[category] ?? Icons.Home;

  return (
    <Link href={`/applications/${app['_id'] as string}`} data-application-card style={{ textDecoration: 'none', color: 'inherit' }}>
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
          <Icons.ChevronRight size={16} style={{ color: 'var(--color-text-muted)' }} />
        </div>
        <div data-application-card-type>
          <TypeIcon size={14} aria-hidden="true" />
          {TYPE_LABEL_MAP[category] ?? (app['type'] as string)?.replace(/_/g, ' ') ?? 'Application'}
        </div>
        <div data-application-card-meta><Icons.Calendar size={14} aria-hidden="true" /> Applied on {appliedDate}</div>
        {academicYear && (
          <div data-application-card-meta><Icons.User size={14} aria-hidden="true" /> Academic Year: {academicYear}</div>
        )}
        {moveInDate && (
          <div data-application-card-meta><Icons.User size={14} aria-hidden="true" /> Move-in: {new Date(moveInDate).toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
        )}
        {checkInDate && (
          <div data-application-card-meta><Icons.User size={14} aria-hidden="true" /> Check-in: {new Date(checkInDate).toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
        )}
        <div data-application-card-footer>
          <div data-application-card-id>Application ID: {(app['applicationId'] as string) ?? '—'}</div>
          <div data-application-card-footer-right>
            <span data-status-badge data-status={STATUS_COLORS[status] ?? 'pending'} style={{ marginBottom: 'var(--space-2)' }}>
              {status.replace(/_/g, ' ')}
            </span>
            <button type="button" data-btn-secondary style={{ padding: 'var(--space-2) var(--space-4)', fontSize: '12px' }}>
              View details
            </button>
          </div>
        </div>
      </div>
    </Link>
  );
}
