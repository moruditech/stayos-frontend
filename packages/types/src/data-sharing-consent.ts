export interface DataSharingConsent {
  _id: string;
  customerId: string;
  tenantId: string;
  consentedAt: string;
  consentType: string;
  // No deletedAt. This is not an omission — do not add one client-side to
  // make an erasure UI's logic simpler. The model has no erasure marker on
  // the backend; requestErasure() never touches this collection and it is
  // included in DSAR exports unconditionally (Document 07 §4/§5).
  createdAt: string;
}
