'use client';

/**
 * Student Housing → Applications. Review queue for StudentApplication docs —
 * approve, reject, waitlist, or request more documents from here or from
 * the detail page (./[id]).
 *
 * Gated the same way the overview page and reports/students/page.tsx are:
 * PERMISSIONS.PROPERTY_ALL + PLAN_FEATURES.UNIVERSITY_MODULE, matching the
 * staffChain on the backend's applications.routes.js exactly.
 */

import React, { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { api } from '@stayos/api-client';
import type { StudentApplicationStatus } from '@stayos/api-client';
import { RoleGate, PlanGate, SkeletonLoader, EmptyState, StatusBadge, Pagination, Icons } from '@stayos/ui';
import { PERMISSIONS, PLAN_FEATURES } from '@stayos/constants';
import { universityKeys } from '@/lib/query-keys';

const STATUS_OPTIONS: { value: StudentApplicationStatus | ''; label: string }[] = [
  { value: '',              label: 'All statuses' },
  { value: 'submitted',     label: 'Submitted' },
  { value: 'under_review',  label: 'Under review' },
  { value: 'docs_requested',label: 'Docs requested' },
  { value: 'approved',      label: 'Approved' },
  { value: 'waitlisted',    label: 'Waitlisted' },
  { value: 'rejected',      label: 'Rejected' },
  { value: 'withdrawn',     label: 'Withdrawn' },
];

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' });
}

function ApplicationsListInner(): React.ReactElement {
  const [status, setStatus] = useState<StudentApplicationStatus | ''>('');
  const [page, setPage] = useState(1);

  const params = { page, limit: 20, ...(status ? { status } : {}) };
  const { data, isLoading } = useQuery({
    queryKey: universityKeys.applications(params),
    queryFn: () => api.university.listApplications(params),
  });

  return (
    <div data-page="student-housing-applications">
      <div data-page-header>
        <div>
          <Link href="/student-housing" data-breadcrumb><Icons.ChevronLeft data-breadcrumb-icon aria-hidden="true" /> Student Housing</Link>
          <h1>Applications</h1>
        </div>
      </div>

      <div data-filter-bar>
        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value as StudentApplicationStatus | ''); setPage(1); }}
          data-filter-input
          aria-label="Filter by status"
        >
          {STATUS_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
        </select>
      </div>

      {isLoading ? (
        <SkeletonLoader rows={8} />
      ) : !data?.data.length ? (
        <EmptyState title="No applications" description="No applications match this filter." />
      ) : (
        <>
          <table data-table>
            <thead>
              <tr>
                <th>Applicant</th><th>Institution</th><th>Course</th>
                <th>Funding</th><th>Status</th><th>Submitted</th>
              </tr>
            </thead>
            <tbody>
              {data.data.map((a) => (
                <tr key={a._id}>
                  <td><Link href={`/student-housing/applications/${a._id}`}>{a.applicantFirstName} {a.applicantLastName}</Link></td>
                  <td>{a.institutionName}</td>
                  <td>{a.course ?? '—'}{a.yearOfStudy ? ` (Yr ${a.yearOfStudy})` : ''}</td>
                  <td>{a.fundingType.replace(/_/g, ' ')}</td>
                  <td><StatusBadge status={a.status} /></td>
                  <td>{a.submittedAt ? fmtDate(a.submittedAt) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination meta={data.meta} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}

export default function ApplicationsListPage(): React.ReactElement {
  return (
    <RoleGate
      perm={PERMISSIONS.PROPERTY_ALL}
      fallback={<EmptyState title="Not available" description="You don't have permission to view this page." />}
    >
      <PlanGate feature={PLAN_FEATURES.UNIVERSITY_MODULE}>
        <ApplicationsListInner />
      </PlanGate>
    </RoleGate>
  );
}
