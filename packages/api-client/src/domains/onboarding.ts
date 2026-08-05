import { client } from '../client';
import type { OnboardingApplication, VettingDocument } from '@stayos/types';

// The `/onboarding` module also carries the applicant-facing start/upload/
// submit routes (Document 09 §2, consumed by the Public Portal's signup
// flow) — those are out of Phase 5's scope. This file is only the
// platform-admin review side: everything gated behind `onboarding:read` /
// `vetting:manage` in Document 14 §6.
export const vettingApi = {
  // GET /onboarding/pending — vetting:manage. Returns applications in
  // documents_submitted | under_review | documents_requested (unresolved) —
  // this is the working queue, not every application ever submitted.
  getPending: (params?: { page?: number | undefined; limit?: number | undefined }) =>
    client.getPaginated<OnboardingApplication>('/onboarding/pending', { params }),

  // GET /onboarding — onboarding:read. Every application regardless of
  // status — used for the "All Applications" list and the dashboard's
  // "recent applications" widget.
  listAll: (params?: {
    page?: number | undefined;
    limit?: number | undefined;
    status?: string | undefined;
    applicantType?: string | undefined;
    search?: string | undefined;
  }) => client.getPaginated<OnboardingApplication>('/onboarding', { params }),

  // GET /onboarding/:id/admin — onboarding:read. The staff-facing detail
  // view (distinct from GET /onboarding/:id, which is the applicant's own).
  getAdminDetail: (id: string) => client.get<OnboardingApplication>(`/onboarding/${id}/admin`),

  // GET /onboarding/:id/documents — onboarding:read.
  getDocuments: (id: string) => client.get<VettingDocument[]>(`/onboarding/${id}/documents`),

  // PATCH /onboarding/:id/documents/:docId/review — vetting:manage.
  reviewDocument: (id: string, docId: string, status: 'approved' | 'rejected', note?: string) =>
    client.patch<VettingDocument>(`/onboarding/${id}/documents/${docId}/review`, {
      status,
      note,
    }),

  // POST /onboarding/:id/start-review — vetting:manage.
  startReview: (id: string) => client.post<OnboardingApplication>(`/onboarding/${id}/start-review`),

  // POST /onboarding/:id/approve — vetting:manage. This is the single point
  // where a Tenant or AgencyTenant record is actually created (Document 14 §6).
  approve: (id: string, notes?: string) =>
    client.post<OnboardingApplication>(`/onboarding/${id}/approve`, { notes }),

  // POST /onboarding/:id/reject — vetting:manage.
  reject: (id: string, reason: string) =>
    client.post<OnboardingApplication>(`/onboarding/${id}/reject`, { reason }),

  // POST /onboarding/:id/request-docs — vetting:manage.
  requestDocs: (id: string, notes: string, docTypes?: string[]) =>
    client.post<OnboardingApplication>(`/onboarding/${id}/request-docs`, { notes, docTypes }),

  // POST /onboarding/:id/flag — vetting:manage.
  flag: (id: string, reason: string) =>
    client.post<OnboardingApplication>(`/onboarding/${id}/flag`, { reason }),

  // POST /onboarding/:id/unflag — vetting:manage.
  unflag: (id: string) => client.post<OnboardingApplication>(`/onboarding/${id}/unflag`),
};
