import { client } from '../client';
import type {
  GuestThreadDTO,
  GuestThreadMemberDTO,
  GuestThreadWrappedKeyDTO,
} from './customer';

// ── Guest messaging — property staff side ───────────────────────────────────
// Confirmed against src/modules/messaging/{routes,controller,service}.js.
// Same GuestThread the customer app's booking/application chat pages read
// and write — this is the staff-facing half of the same conversation.
// End-to-end encrypted for the in_app channel (see @stayos/crypto); a
// staff member's own identity key is managed by staffchatApi
// (PUT /staffchat/keys/me), not duplicated here — one identity per person,
// shared across staff chat and guest messaging alike.

export const messagingApi = {
  listThreads: (params?: { status?: 'open' | 'assigned' | 'resolved'; page?: number; limit?: number }) =>
    client.getPaginated<GuestThreadDTO>('/messaging/threads', {
      params: params as Record<string, string | number | boolean | undefined>,
    }),
  getThread: (threadId: string) =>
    client.get<GuestThreadDTO>(`/messaging/threads/${threadId}`),

  replyInApp: (threadId: string, input: { ciphertext: string; iv: string }) =>
    client.post<GuestThreadDTO>(`/messaging/threads/${threadId}/reply`, { channel: 'in_app', ...input }),
  replyWhatsapp: (threadId: string, body: string) =>
    client.post<GuestThreadDTO>(`/messaging/threads/${threadId}/reply`, { channel: 'whatsapp', body }),
  replySms: (threadId: string, body: string) =>
    client.post<GuestThreadDTO>(`/messaging/threads/${threadId}/reply`, { channel: 'sms', body }),

  assignThread: (threadId: string, staffId: string) =>
    client.patch<GuestThreadDTO>(`/messaging/threads/${threadId}/assign`, { staffId }),
  getAssignableStaff: () =>
    client.get<{ _id: string; firstName: string; lastName: string; role: string }[]>('/messaging/assignable-staff'),
  resolveThread: (threadId: string) =>
    client.patch<GuestThreadDTO>(`/messaging/threads/${threadId}/resolve`),
  markRead: (threadId: string) =>
    client.patch<GuestThreadDTO>(`/messaging/threads/${threadId}/read`),

  // ── End-to-end encryption — thread-specific operations ──────────────────────
  getThreadMembers: (threadId: string) =>
    client.get<{ members: GuestThreadMemberDTO[]; channelHasKey: boolean }>(`/messaging/threads/${threadId}/members`),
  getMyThreadKey: (threadId: string) =>
    client.get<GuestThreadWrappedKeyDTO | null>(`/messaging/threads/${threadId}/key`),
  publishThreadKeys: (threadId: string, wraps: GuestThreadWrappedKeyDTO[], bootstrap?: boolean) =>
    client.post<{ updated: number }>(`/messaging/threads/${threadId}/keys`, { wraps, bootstrap }),
  requestThreadKey: (threadId: string) =>
    client.post<{ requested: boolean }>(`/messaging/threads/${threadId}/key-requests`),
  getPendingKeyRequests: () =>
    client.get<{ threadId: string; requesterId: string; requesterModel: 'Customer' | 'PropertyStaff'; requesterPublicKey: JsonWebKey }[]>(
      '/messaging/key-requests/pending'
    ),
};
