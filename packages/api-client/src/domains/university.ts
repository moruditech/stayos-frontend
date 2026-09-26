import { client } from '../client';

// Matches StudentApplication.model.js's real fields (the subset the staff
// review UI needs — the model also carries guardian/custom-answer/document
// fields not shown in the list or review view).
export type StudentApplicationStatus =
  | 'draft' | 'submitted' | 'under_review' | 'docs_requested'
  | 'approved' | 'waitlisted' | 'rejected' | 'withdrawn';

export interface StudentApplication {
  _id: string;
  tenantId: string;
  customerId: { _id: string; firstName: string; lastName: string; email: string } | null;
  academicYear: string;
  applicantFirstName: string;
  applicantLastName: string;
  applicantEmail: string;
  applicantPhone?: string;
  institutionName: string;
  studentNumber?: string;
  faculty?: string;
  course?: string;
  yearOfStudy?: number;
  fundingType: 'self_paying' | 'nsfas' | 'bursary' | 'partial';
  bursaryFunder?: string;
  nsfasReferenceNumber?: string;
  roomTypePreference: string[];
  specialNeeds?: string;
  dietaryRequirements?: string;
  submittedDocuments: { docLabel: string; docRequired: boolean; url?: string; uploadedAt?: string }[];
  status: StudentApplicationStatus;
  rejectionReason?: string;
  approvalNotes?: string;
  waitlistPosition?: number;
  submittedAt?: string;
  reviewedAt?: string;
  reviewedBy?: { _id: string; firstName: string; lastName: string } | null;
  createdAt: string;
}

// Matches Lease.model.js — minimal fields, just what the overview counts and
// a simple list need. Full lease lifecycle (create/sign/terminate/inspections)
// has no staff UI yet.
export interface Lease {
  _id: string;
  customerId: { _id: string; firstName: string; lastName: string } | null;
  roomId: { _id: string; roomNumber: string } | null;
  startDate: string;
  endDate: string;
  status: 'draft' | 'issued' | 'signed' | 'active' | 'early_terminated' | 'expired' | 'cancelled';
}

// Matches Announcement.model.js — read-only here; composing/editing
// announcements has no staff UI yet.
export interface Announcement {
  _id: string;
  title: string;
  body: string;
  type: 'general' | 'maintenance' | 'event' | 'emergency' | 'policy' | 'other';
  audience: 'all' | 'students' | 'guests' | 'staff';
  isPublished: boolean;
  publishedAt?: string;
  createdAt: string;
}

export interface UpdateApplicationStatusInput {
  status: StudentApplicationStatus;
  rejectionReason?: string;
  approvalNotes?: string;
  waitlistPosition?: number;
}

type QueryParams = Record<string, string | number | boolean | undefined>;

// Named studentHousingApi, not universityApi — that name is already taken by
// the customer-facing student API in domains/customer.ts (getForm,
// submitApplication, getInvoice, payInvoice, getLease, signLease). This one
// is the staff/property-portal side: application review, leases, allocations.
export const studentHousingApi = {
  // ── Applications ──────────────────────────────────────────────────────────
  listApplications: (params?: Record<string, unknown>) =>
    client.getPaginated<StudentApplication>('/university/applications', { params: params as QueryParams }),

  getApplication: (id: string) => client.get<StudentApplication>(`/university/applications/${id}`),

  updateApplicationStatus: (id: string, input: UpdateApplicationStatusInput) =>
    client.patch<StudentApplication>(`/university/applications/${id}/status`, input),

  requestApplicationDocs: (id: string, note: string) =>
    client.post<StudentApplication>(`/university/applications/${id}/docs-request`, { note }),

  // ── Leases (read-only for now — overview counts + a simple list) ───────────
  listLeases: (params?: Record<string, unknown>) =>
    client.getPaginated<Lease>('/university/leases', { params: params as QueryParams }),

  // ── Announcements (read-only for now) ──────────────────────────────────────
  listAnnouncements: (params?: Record<string, unknown>) =>
    client.getPaginated<Announcement>('/university/announcements', { params: params as QueryParams }),
};
