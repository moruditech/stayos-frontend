import { client } from '../client';

// Field names throughout this file match the backend Zod schemas in
// src/modules/accounting/accounting.validation.js exactly — see the
// procurement/expenses fixes elsewhere in this codebase for what happens
// when frontend and backend field names drift apart (every write silently
// fails validation).

function qs(params: Record<string, string | number | undefined>): string {
  const entries = Object.entries(params).filter(([, v]) => v !== undefined && v !== '');
  if (!entries.length) return '';
  return '?' + entries.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`).join('&');
}

// ── Chart of accounts ───────────────────────────────────────────────────────

export interface LedgerAccount {
  _id: string;
  code: string;
  name: string;
  type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
  normalBalance: 'debit' | 'credit';
  isActive: boolean;
  isSystem: boolean;
}

// ── Journal entries ──────────────────────────────────────────────────────────

export interface JournalLineInput {
  accountId: string;
  debit?: number | undefined;
  credit?: number | undefined;
  description?: string | undefined;
}

export interface JournalEntryInput {
  date: string;
  description: string;
  lines: JournalLineInput[];
}

// ── Night audits ─────────────────────────────────────────────────────────────

export interface OtherIncomeEntryInput {
  description: string;
  amount: number;
  isCash?: boolean | undefined;
}

export const accountingApi = {
  // Chart of accounts
  listAccounts: () => client.get<LedgerAccount[]>('/accounting/ledger-accounts'),
  createAccount: (input: { code: string; name: string; type: LedgerAccount['type'] }) =>
    client.post<LedgerAccount>('/accounting/ledger-accounts', input),
  updateAccount: (id: string, input: Partial<{ code: string; name: string; type: LedgerAccount['type']; isActive: boolean }>) =>
    client.patch<LedgerAccount>(`/accounting/ledger-accounts/${id}`, input),
  deleteAccount: (id: string) =>
    client.delete<{ message: string }>(`/accounting/ledger-accounts/${id}`),

  // Journal entries
  listJournalEntries: (params?: { from?: string | undefined; to?: string | undefined; page?: number | undefined; limit?: number | undefined }) =>
    client.get<Record<string, unknown>[]>('/accounting/journal-entries', {
      params: params as Record<string, string | number | boolean | undefined>,
    }),
  getJournalEntry: (id: string) => client.get<Record<string, unknown>>(`/accounting/journal-entries/${id}`),
  createJournalEntry: (input: JournalEntryInput) =>
    client.post<Record<string, unknown>>('/accounting/journal-entries', input),
  updateJournalEntry: (id: string, input: { description?: string | undefined; lineDescriptions?: { index: number; description?: string }[] }) =>
    client.patch<Record<string, unknown>>(`/accounting/journal-entries/${id}`, input),
  deleteJournalEntry: (id: string) =>
    client.delete<{ message: string }>(`/accounting/journal-entries/${id}`),

  // Journal PDF/CSV — href-as-function for DownloadButton (authenticated
  // blob fetch; see client.getBlobUrl). Period filters are baked into the
  // path since getBlobUrl only takes a plain string, not a params object.
  getJournalPdfUrl: (period: { from?: string | undefined; to?: string | undefined }) => () =>
    client.getBlobUrl(`/accounting/journal-entries/pdf${qs(period)}`),
  getJournalCsvUrl: (period: { from?: string | undefined; to?: string | undefined }) => () =>
    client.getBlobUrl(`/accounting/journal-entries/csv${qs(period)}`),

  // Trial balance
  getTrialBalance: (period: { from?: string | undefined; to?: string | undefined }) =>
    client.get<Record<string, unknown>>(`/accounting/trial-balance${qs(period)}`),
  getTrialBalancePdfUrl: (period: { from?: string | undefined; to?: string | undefined }) => () =>
    client.getBlobUrl(`/accounting/trial-balance/pdf${qs(period)}`),
  getTrialBalanceCsvUrl: (period: { from?: string | undefined; to?: string | undefined }) => () =>
    client.getBlobUrl(`/accounting/trial-balance/csv${qs(period)}`),

  // Night audits
  listNightAudits: (params?: { status?: string | undefined; from?: string | undefined; to?: string | undefined; page?: number | undefined; limit?: number | undefined }) =>
    client.get<Record<string, unknown>[]>('/accounting/night-audits', {
      params: params as Record<string, string | number | boolean | undefined>,
    }),
  getNightAudit: (id: string) => client.get<Record<string, unknown>>(`/accounting/night-audits/${id}`),
  generateNightAudit: (auditDate: string) =>
    client.post<Record<string, unknown>>('/accounting/night-audits/generate', { auditDate }),
  updateNightAudit: (id: string, input: {
    openingCashFloat?: number | undefined;
    countedCash?: number | undefined;
    varianceNote?: string | undefined;
    notes?: string | undefined;
    otherIncomeEntries?: OtherIncomeEntryInput[];
  }) => client.patch<Record<string, unknown>>(`/accounting/night-audits/${id}`, input),
  finalizeNightAudit: (id: string) =>
    client.post<Record<string, unknown>>(`/accounting/night-audits/${id}/finalize`),
  getNightAuditPdfUrl: (id: string) => () =>
    client.getBlobUrl(`/accounting/night-audits/${id}/pdf`),
};
