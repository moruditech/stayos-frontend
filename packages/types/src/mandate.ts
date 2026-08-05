// MandateStatus is defined inline here to avoid types importing from constants
// (TAD 00 §9.2: types → nothing internal). @stayos/constants re-exports it
// alongside MANDATE_STATUS for app code that needs the enum object.
export type MandateStatus = 'pending' | 'active' | 'termination_notice' | 'terminated';

// CORRECTED FIELD NAME: verified directly against PropertyMandate.model.js —
// the schema field is `mandateStatus`, not `status` (the model also has a
// compound index and a partial-unique index both keyed on `mandateStatus`).
// An earlier pass of this file used `status`, which would silently read as
// undefined everywhere a mandate's lifecycle state is displayed or branched
// on. agency.ts's AgencyMandate interface already had this right — this
// file was the one that drifted.
export interface PropertyMandate {
  _id: string;
  propertyId: string | { _id: string; name: string; slug: string; type?: string };
  agencyId: string;
  mandateStatus: MandateStatus;
  managementFeeType?: 'percentage' | 'fixed';
  managementFeeValue?: number;
  terminationNoticeDays?: number;
  terminationInitiatedBy: 'owner' | 'agency' | null;
  terminationDate: string | null; // server-computed — display only, never derive client-side
  startDate?: string;
  signedByOwnerAt?: string | null;
  signedByAgencyAt?: string | null;
  createdAt: string;
  updatedAt: string;
}
