'use client';

/**
 * Student Housing overview — landing page for the Student Housing nav
 * group, gated the same way reports/students/page.tsx already is
 * (PROPERTY_ALL + PLAN_FEATURES.UNIVERSITY_MODULE — see that file's own
 * comment for why PROPERTY_ALL specifically). Surfaces what actually needs
 * attention: applications awaiting review, active leases, recent
 * announcements.
 *
 * Leases, Allocations, Announcements (composing), and Student Billing all
 * have complete APIs already (see universityApi in @stayos/api-client) but
 * no dedicated staff management page yet — this reads them read-only for
 * the summary lists below. Applications is the one module with a real
 * management page so far (./applications).
 */

import React from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { api } from '@stayos/api-client';
import { RoleGate, PlanGate, SkeletonLoader, EmptyState, StatusBadge, StatCard, Icons } from '@stayos/ui';
import { PERMISSIONS, PLAN_FEATURES } from '@stayos/constants';
import { universityKeys } from '@/lib/query-keys';

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' });
}

function StudentHousingOverviewInner(): React.ReactElement {
  // Two lightweight, limit:1 calls purely to read meta.total — the list
  // endpoint only takes one status value at a time, so "awaiting review"
  // (submitted + under_review) needs two counts summed client-side.
  const { data: submitted } = useQuery({
    queryKey: universityKeys.applications({ status: 'submitted', limit: 1 }),
    queryFn: () => api.university.listApplications({ status: 'submitted', limit: 1 }),
  });
  const { data: underReview } = useQuery({
    queryKey: universityKeys.applications({ status: 'under_review', limit: 1 }),
    queryFn: () => api.university.listApplications({ status: 'under_review', limit: 1 }),
  });
  const { data: recentApplications, isLoading: applicationsLoading } = useQuery({
    queryKey: universityKeys.applications({ limit: 5 }),
    queryFn: () => api.university.listApplications({ limit: 5 }),
  });
  const { data: activeLeases, isLoading: leasesLoading } = useQuery({
    queryKey: universityKeys.leases({ status: 'active', limit: 5 }),
    queryFn: () => api.university.listLeases({ status: 'active', limit: 5 }),
  });
  const { data: announcements, isLoading: announcementsLoading } = useQuery({
    queryKey: universityKeys.announcements({ limit: 5 }),
    queryFn: () => api.university.listAnnouncements({ limit: 5 }),
  });

  const needsReview = (submitted?.meta.total ?? 0) + (underReview?.meta.total ?? 0);

  return (
    <div data-page="student-housing">
      <div data-page-header>
        <div>
          <h1>Student Housing</h1>
          <p data-page-subtitle>Applications, leases, and announcements</p>
        </div>
      </div>

      <div data-stat-grid>
        <StatCard icon={Icons.FileText} label="Applications awaiting review" value={needsReview} />
        <StatCard icon={Icons.KeyRound} label="Active leases" value={activeLeases?.meta.total ?? 0} />
      </div>

      <section data-report-section>
        <div data-section-header>
          <h2>Recent applications</h2>
          <Link href="/student-housing/applications" data-btn-ghost data-btn-sm>View all</Link>
        </div>
        {applicationsLoading ? (
          <SkeletonLoader rows={3} />
        ) : !recentApplications?.data.length ? (
          <EmptyState title="No applications yet" description="Applications will appear here once students start applying." />
        ) : (
          <table data-table>
            <thead>
              <tr><th>Applicant</th><th>Institution</th><th>Funding</th><th>Status</th><th>Submitted</th></tr>
            </thead>
            <tbody>
              {recentApplications.data.map((a) => (
                <tr key={a._id}>
                  <td><Link href={`/student-housing/applications/${a._id}`}>{a.applicantFirstName} {a.applicantLastName}</Link></td>
                  <td>{a.institutionName}</td>
                  <td>{a.fundingType.replace(/_/g, ' ')}</td>
                  <td><StatusBadge status={a.status} /></td>
                  <td>{a.submittedAt ? fmtDate(a.submittedAt) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section data-report-section>
        <h2>Active leases</h2>
        {leasesLoading ? (
          <SkeletonLoader rows={3} />
        ) : !activeLeases?.data.length ? (
          <EmptyState title="No active leases" description="Signed, active leases will appear here." />
        ) : (
          <table data-table>
            <thead>
              <tr><th>Student</th><th>Room</th><th>Ends</th></tr>
            </thead>
            <tbody>
              {activeLeases.data.map((l) => (
                <tr key={l._id}>
                  <td>{l.customerId ? `${l.customerId.firstName} ${l.customerId.lastName}` : '—'}</td>
                  <td>{l.roomId?.roomNumber ?? '—'}</td>
                  <td>{fmtDate(l.endDate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section data-report-section>
        <h2>Recent announcements</h2>
        {announcementsLoading ? (
          <SkeletonLoader rows={2} />
        ) : !announcements?.data.length ? (
          <EmptyState title="No announcements" description="Published announcements will appear here." />
        ) : (
          <table data-table>
            <thead>
              <tr><th>Title</th><th>Published</th></tr>
            </thead>
            <tbody>
              {announcements.data.map((ann) => (
                <tr key={ann._id}>
                  <td>{ann.title}</td>
                  <td>{ann.publishedAt ? fmtDate(ann.publishedAt) : 'Draft'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}

export default function StudentHousingOverviewPage(): React.ReactElement {
  return (
    <RoleGate
      perm={PERMISSIONS.PROPERTY_ALL}
      fallback={<EmptyState title="Not available" description="You don't have permission to view this page." />}
    >
      <PlanGate feature={PLAN_FEATURES.UNIVERSITY_MODULE}>
        <StudentHousingOverviewInner />
      </PlanGate>
    </RoleGate>
  );
}
