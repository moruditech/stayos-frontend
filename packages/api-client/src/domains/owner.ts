import { client } from '../client';
import type { Tenant } from '@stayos/types';

export interface OwnerEnterPropertyResponse {
  accessToken: string;
  refreshToken: string;
  property: { _id: string; name: string; status: string };
  role: 'property_owner';
  accessMode: 'operational' | 'read_only';
  activeMandateId: string | null;
}

export interface OwnerMandate {
  _id: string;
  propertyId: string;
  agencyId: { _id: string; name: string; slug: string };
  mandateStatus: string;
  terminationDate: string | null;
  createdAt: string;
}

export interface OwnerMandateAcceptResponse {
  message: string; // 'Mandate activated' | 'Mandate accepted — awaiting agency signature'
}

export interface OwnerRegisterInput {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone?: string;
  companyName?: string;
  vatNumber?: string;
}

export const ownerApi = {
  // POST /owner/register
  register: (input: OwnerRegisterInput) =>
    client.post<{ message: string }>('/owner/register', input),

  // GET /owner/me
  getProfile: () => client.get<Record<string, unknown>>('/owner/me'),

  // PATCH /owner/me
  updateProfile: (input: Partial<OwnerRegisterInput>) =>
    client.patch<Record<string, unknown>>('/owner/me', input),

  // GET /owner/properties
  listProperties: () => client.get<Tenant[]>('/owner/properties'),

  // GET /owner/properties/:id
  getProperty: (id: string) => client.get<Tenant>(`/owner/properties/${id}`),

  // POST /owner/properties
  addProperty: (input: Record<string, unknown>) =>
    client.post<Tenant>('/owner/properties', input),

  // POST /owner/properties/:id/enter
  // Returns new tenant-scoped token pair — the frontend swaps activeToken,
  // retains ownerToken for the return trip. See useEnterProperty hook.
  enterProperty: (id: string) =>
    client.post<OwnerEnterPropertyResponse>(`/owner/properties/${id}/enter`),

  // GET /owner/mandates
  listMandates: () => client.get<OwnerMandate[]>('/owner/mandates'),

  // GET /owner/mandates/:id
  // NOTE: this endpoint does not exist yet on the backend (ticket filed).
  // Calling it will return 404 until the backend fix lands.
  getMandate: (id: string) => client.get<OwnerMandate>(`/owner/mandates/${id}`),

  // POST /owner/mandates — owner-initiated mandate request to an agency
  createMandate: (input: { propertyId: string; agencyId: string }) =>
    client.post<OwnerMandate>('/owner/mandates', input),

  // PATCH /owner/mandates/:id/accept
  acceptMandate: (id: string) =>
    client.patch<OwnerMandateAcceptResponse>(`/owner/mandates/${id}/accept`),

  // POST /owner/mandates/:id/terminate
  terminateMandate: (id: string, reason?: string) =>
    client.post<{ message: string }>(`/owner/mandates/${id}/terminate`, { reason }),
};
