export interface FolioLineItem {
  _id: string;
  description: string;
  amount: number;
  category: string;
  voidedAt: string | null;
}

export interface Folio {
  _id: string;
  bookingId: string;
  tenantId: string;
  lineItems: FolioLineItem[];
  balance: number;
  status: string;
  // See Booking.version in booking.ts — same caveat applies: not
  // enforced backend-side on the standard folio update paths today.
  version: number;
  createdAt: string;
  updatedAt: string;
}
