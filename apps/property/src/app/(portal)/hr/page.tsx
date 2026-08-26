'use client';

import Link from 'next/link';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@stayos/api-client';
import { SkeletonLoader, EmptyState } from '@stayos/ui';
import { staffKeys } from '@/lib/query-keys';

export default function HrHubPage(): React.ReactElement {
  const { data: staff, isLoading } = useQuery({
    queryKey: staffKeys.list(),
    queryFn: () => api.staff.list(),
    staleTime: 120_000,
  });

  return (
    <div data-page="hr">
      <div data-page-header>
        <h1>HR</h1>
        <p data-page-subtitle>Staff HR profiles, documents and disciplinary records</p>
      </div>

      {isLoading ? <SkeletonLoader rows={4} /> : !staff?.length ? (
        <EmptyState
          title="No staff"
          description="Add staff members to manage their HR records."
          action={<Link href="/settings/staff" data-btn-primary>Manage staff accounts</Link>}
        />
      ) : (
        <div data-hr-staff-list>
          {staff.map((s) => (
            <a key={s._id} href={`/hr/profiles/${s._id}`} data-hr-staff-row>
              <div data-staff-avatar>{s.firstName.charAt(0)}{s.lastName.charAt(0)}</div>
              <div data-staff-info>
                <span data-staff-name>{s.firstName} {s.lastName}</span>
                <span data-staff-role>{s.role.replace(/_/g, ' ')}</span>
              </div>
              <span data-staff-status data-status={s.status}>{s.status}</span>
              <span data-row-arrow aria-hidden="true">›</span>
            </a>
          ))}
        </div>
      )}

      <div data-hr-links>
        <h2>HR tools</h2>
        <Link href="/roster" data-settings-nav-item>
          <span>Roster &amp; Time Clock</span><span data-arrow>›</span>
        </Link>
        <Link href="/hr/timesheets" data-settings-nav-item>
          <span>Timesheets &amp; payroll export</span><span data-arrow>›</span>
        </Link>
      </div>
    </div>
  );
}
