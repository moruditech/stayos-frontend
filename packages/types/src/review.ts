// Review moderation types — Platform Admin Portal (Document 14 §8).
// Verified against models/Review.model.js status enum.

export type ReviewStatus = 'pending' | 'approved' | 'rejected' | 'flagged';

export interface ReviewForModeration {
  _id: string;
  tenantId: { _id: string; name: string } | string;
  bookingId?: string;
  customerId: { _id: string; firstName: string; lastName: string } | string;
  rating: number;
  title?: string;
  body: string;
  status: ReviewStatus;
  response?: string;
  respondedAt?: string;
  createdAt: string;
}
