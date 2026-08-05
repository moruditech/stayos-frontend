// Vetting queue domain types — Platform Admin Portal (Document 14 §6).
// Verified against models/OnboardingApplication.model.js and
// modules/onboarding/onboarding.service.js.

export type OnboardingApplicantType = 'property_owner' | 'agency' | 'multi_property_owner';

export type OnboardingApplicationStatus =
  | 'started'
  | 'documents_submitted'
  | 'under_review'
  | 'documents_requested'
  | 'approved'
  | 'rejected'
  | 'withdrawn';

export interface OnboardingRequiredDocument {
  docType: string;
  label: string;
  required: boolean;
  submitted: boolean;
  submittedAt?: string;
  vettingDocumentId?: string;
}

export interface OnboardingApplication {
  _id: string;
  applicantType: OnboardingApplicantType;
  status: OnboardingApplicationStatus;
  applicantEmail: string;
  applicantName: string;
  applicantPhone?: string;
  propertyName?: string;
  propertyType?: 'guesthouse' | 'hotel' | 'rental' | 'student_housing';
  propertyAddress?: string;
  propertyCity?: string;
  propertyProvince?: string;
  businessName?: string;
  registrationNumber?: string;
  documentsRequired: OnboardingRequiredDocument[];
  submittedAt?: string;
  reviewStartedAt?: string;
  reviewedAt?: string;
  reviewedBy?: { _id: string; firstName: string; lastName: string } | string;
  approvalNotes?: string;
  rejectionReason?: string;
  resubmissionNotes?: string;
  resubmissionCount: number;
  tenantId?: string;
  agencyId?: string;
  flaggedForManualReview: boolean;
  flagReason?: string;
  createdAt: string;
  updatedAt: string;
}

// GET /onboarding/:id/documents — VettingDocument records
export interface VettingDocument {
  _id: string;
  applicationId: string;
  docType: string;
  fileName: string;
  fileUrl: string;
  uploadedAt: string;
  reviewStatus: 'pending' | 'approved' | 'rejected';
  reviewNote?: string;
  reviewedBy?: string;
  reviewedAt?: string;
}
