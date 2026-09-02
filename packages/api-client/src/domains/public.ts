import { client } from '../client';
import type { NewsletterSubscribeInput, ContactInput } from '@stayos/validators';

// Used by apps/public (the marketing site — stayos.co.za). Both endpoints
// return only { message } on success — the pop-up/success state on the
// frontend reads that message, never the HTTP status code (client.ts throws
// ApiError with .message set from the backend envelope on failure, so the
// same field works for both branches).
//
// The admin-facing methods below (templates/campaigns/subscribers) live in
// the same object as the public subscribe() call, matching the supportApi
// convention in ./customer.ts — one domain object spans both the public
// entry point and its platform-admin management, since they're the same
// feature end to end.
export const newsletterApi = {
  subscribe: (input: NewsletterSubscribeInput) =>
    client.post<{ message: string }>('/public/newsletter/subscribe', input),

  // ── Platform admin (newsletter:manage) ──────────────────────────────────
  listSubscribers: (params?: {
    page?: number | undefined;
    limit?: number | undefined;
    status?: 'subscribed' | 'unsubscribed' | undefined;
  }) => client.getPaginated<Record<string, unknown>>('/platform/newsletter/subscribers', { params }),

  getStats: () =>
    client.get<{ subscribed: number; unsubscribed: number; total: number }>('/platform/newsletter/stats'),

  revealSubscriberEmail: (id: string) =>
    client.post<{ email: string }>(`/platform/newsletter/subscribers/${id}/reveal`),

  listTemplates: (params?: { type?: string | undefined }) =>
    client.get<Record<string, unknown>[]>('/platform/newsletter/templates', { params }),
  getTemplate: (id: string) =>
    client.get<Record<string, unknown>>(`/platform/newsletter/templates/${id}`),
  createTemplate: (input: Record<string, unknown>) =>
    client.post<Record<string, unknown>>('/platform/newsletter/templates', input),
  updateTemplate: (id: string, input: Record<string, unknown>) =>
    client.patch<Record<string, unknown>>(`/platform/newsletter/templates/${id}`, input),
  archiveTemplate: (id: string) =>
    client.delete<{ message: string }>(`/platform/newsletter/templates/${id}`),

  listCampaigns: (params?: { page?: number | undefined; limit?: number | undefined }) =>
    client.getPaginated<Record<string, unknown>>('/platform/newsletter/campaigns', { params }),
  createCampaign: (input: Record<string, unknown>) =>
    client.post<Record<string, unknown>>('/platform/newsletter/campaigns', input),
  sendCampaign: (id: string) =>
    client.post<Record<string, unknown>>(`/platform/newsletter/campaigns/${id}/send`),
};

export const contactApi = {
  submit: (input: ContactInput) =>
    client.post<{ message: string }>('/public/contact', input),
};

// Platform admin mailbox — thread queue for /public/contact submissions.
// Same reasoning as supportApi: distinct from the public contactApi above,
// but part of the same feature.
export const mailboxApi = {
  listThreads: (params?: {
    page?: number | undefined;
    limit?: number | undefined;
    status?: string | undefined;
    assignedTo?: string | undefined;
  }) => client.getPaginated<Record<string, unknown>>('/platform/mailbox/threads', { params }),

  getThread: (id: string) =>
    client.get<Record<string, unknown>>(`/platform/mailbox/threads/${id}`),

  reply: (id: string, bodyHtml: string, bodyText?: string) =>
    client.post<Record<string, unknown>>(`/platform/mailbox/threads/${id}/reply`, { bodyHtml, bodyText }),

  addNote: (id: string, bodyHtml: string) =>
    client.post<Record<string, unknown>>(`/platform/mailbox/threads/${id}/notes`, { bodyHtml }),

  assign: (id: string, assigneeId: string) =>
    client.patch<Record<string, unknown>>(`/platform/mailbox/threads/${id}/assign`, { assigneeId }),

  updateStatus: (id: string, status: string) =>
    client.patch<Record<string, unknown>>(`/platform/mailbox/threads/${id}/status`, { status }),
};
