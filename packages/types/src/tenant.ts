// Full Tenant shape, superset of what session.ts#PropertySessionBootstrap
// exposes via GET /properties/me — used for the tenant list/detail views
// in the Owner and Platform Admin portals.

export interface Tenant {
  _id: string;
  name: string;
  slug: string;
  // NOT typed against a fixed union deliberately — the backend's Mongoose
  // model enum (4 values: guesthouse/hotel/rental/student_housing) and
  // its own Zod request-validation schema (8 values, different set,
  // owner.validation.js#addPropertySchema) disagree with each other.
  // Submitting several of the 8 Zod-allowed values passes validation and
  // then fails at the Mongoose save step. This is a backend bug (ticket
  // filed per the implementation plan), not a frontend decision — do not
  // narrow this to a union until the backend settles on one enum and
  // TENANT_TYPE is added to @stayos/constants.
  type: string;
  status: string;
  propertyOwnerId: string;
  activeMandateId: string | null;
  ownerReadOnlyAccess: boolean; // see AccessMode note in constants/access.ts — not currently consulted by enterProperty server-side
  planId: {
    _id: string;
    name: string;
    tier: string;
    monthlyPrice: number;
    features: string[];
  };
  agencyId: {
    _id: string;
    name: string;
    slug: string;
  } | null;
  createdAt: string;
  updatedAt: string;
}
