'use client';

import Link from 'next/link';

/**
 * Journal & Trial Balance — General Ledger reporting.
 *
 * Entries are either auto-posted from a finalized Night Audit (source:
 * 'night_audit') or created here manually. Once posted, amounts/accounts
 * are immutable by design (accounting integrity — correct a mistake with
 * a new adjusting entry, not by rewriting history); only descriptions can
 * be edited afterwards, which is what requirement 4b's "manually adjusted
 * like adding descriptions" refers to.
 */

import React, { useState } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@stayos/api-client';
import type { ApiError, LedgerAccount, JournalLineInput } from '@stayos/api-client';
import {
  SkeletonLoader, EmptyState, useToast, Modal, InlineError, ConfirmDialog,
  Icons, Dropdown, DownloadButton,
} from '@stayos/ui';
import { accountingKeys } from '@/lib/query-keys';

function fmtCurrency(n: number | null | undefined): string {
  return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(n || 0);
}
function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' });
}
function firstOfMonthIso(): string {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}
function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

interface EntryFormInput {
  date: string;
  description: string;
  lines: { accountId: string; debit?: number | undefined; credit?: number | undefined; description?: string }[];
}

export default function JournalPage(): React.ReactElement {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<'journal' | 'trial-balance'>('journal');
  const [from, setFrom] = useState(firstOfMonthIso());
  const [to, setTo] = useState(todayIso());
  const [showNewEntry, setShowNewEntry] = useState(false);
  const [editingEntry, setEditingEntry] = useState<Record<string, unknown> | null>(null);
  const [deleteEntryId, setDeleteEntryId] = useState<string | null>(null);

  const period = { from, to };

  const { data: accounts } = useQuery({
    queryKey: accountingKeys.accounts(),
    queryFn: () => api.accounting.listAccounts(),
    staleTime: 120_000,
  });
  const accountOptions = (accounts ?? []).filter((a) => a.isActive).map((a: LedgerAccount) => ({
    value: a._id, label: `${a.code} — ${a.name}`,
  }));

  const { data: entries, isLoading: entriesLoading } = useQuery({
    queryKey: accountingKeys.journalList(period),
    queryFn: () => api.accounting.listJournalEntries({ ...period, limit: 200 }),
    enabled: tab === 'journal',
  });

  const { data: trialBalance, isLoading: tbLoading } = useQuery({
    queryKey: accountingKeys.trialBalance(period),
    queryFn: () => api.accounting.getTrialBalance(period),
    enabled: tab === 'trial-balance',
  });

  const entryForm = useForm<EntryFormInput>({
    defaultValues: { date: todayIso(), description: '', lines: [{ accountId: '' }, { accountId: '' }] },
  });
  const { fields, append, remove } = useFieldArray({ control: entryForm.control, name: 'lines' });
  const watchedLines = entryForm.watch('lines');
  const totalDebit = watchedLines.reduce((s, l) => s + (Number(l.debit) || 0), 0);
  const totalCredit = watchedLines.reduce((s, l) => s + (Number(l.credit) || 0), 0);
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01 && totalDebit > 0;

  const editForm = useForm<{ description: string; lineDescriptions: string[] }>();

  const createEntryMutation = useMutation({
    mutationFn: (input: EntryFormInput) => {
      const lines: JournalLineInput[] = input.lines.map((l) => ({
        accountId: l.accountId,
        debit: Number(l.debit) || 0,
        credit: Number(l.credit) || 0,
        description: l.description,
      }));
      return api.accounting.createJournalEntry({ date: input.date, description: input.description, lines });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['accounting', 'journal-entries'] });
      void queryClient.invalidateQueries({ queryKey: ['accounting', 'trial-balance'] });
      setShowNewEntry(false);
      entryForm.reset({ date: todayIso(), description: '', lines: [{ accountId: '' }, { accountId: '' }] });
      toast('Journal entry posted.', 'success');
    },
    onError: (err: ApiError) => toast(err.message ?? 'Failed to post entry — check that debits equal credits.', 'error'),
  });

  const updateEntryMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: { description: string; lineDescriptions: { index: number; description: string }[] } }) =>
      api.accounting.updateJournalEntry(id, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['accounting', 'journal-entries'] });
      setEditingEntry(null);
      toast('Descriptions updated.', 'success');
    },
    onError: (err: ApiError) => toast(err.message ?? 'Failed to update.', 'error'),
  });

  const deleteEntryMutation = useMutation({
    mutationFn: (id: string) => api.accounting.deleteJournalEntry(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['accounting', 'journal-entries'] });
      void queryClient.invalidateQueries({ queryKey: ['accounting', 'trial-balance'] });
      setDeleteEntryId(null);
      toast('Journal entry deleted.', 'success');
    },
    onError: (err: ApiError) => { setDeleteEntryId(null); toast(err.message ?? 'Failed to delete.', 'error'); },
  });

  function openEdit(entry: Record<string, unknown>): void {
    const lines = entry['lines'] as Record<string, unknown>[];
    editForm.reset({
      description: String(entry['description'] ?? ''),
      lineDescriptions: lines.map((l) => String(l['description'] ?? '')),
    });
    setEditingEntry(entry);
  }

  return (
    <div data-page="journal">
      <div data-page-header>
        <div>
          <Link href="/accounting" data-breadcrumb><Icons.ChevronLeft data-breadcrumb-icon aria-hidden="true" /> Accounting</Link>
          <h1>Journal &amp; Trial Balance</h1>
        </div>
        {tab === 'journal' && (
          <button type="button" data-btn-primary onClick={() => setShowNewEntry(true)}>+ New journal entry</button>
        )}
      </div>

      <div data-toolbar>
        <div data-tab-bar>
          <button type="button" data-tab data-active={tab === 'journal' || undefined} onClick={() => setTab('journal')}>Journal</button>
          <button type="button" data-tab data-active={tab === 'trial-balance' || undefined} onClick={() => setTab('trial-balance')}>Trial Balance</button>
        </div>
        <div data-form-row>
          <div data-form-group>
            <label htmlFor="period-from">From</label>
            <input id="period-from" type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div data-form-group>
            <label htmlFor="period-to">To</label>
            <input id="period-to" type="date" value={to} min={from} max={todayIso()} onChange={(e) => setTo(e.target.value)} />
          </div>
        </div>
        {tab === 'journal' ? (
          <div data-header-actions>
            <DownloadButton href={api.accounting.getJournalPdfUrl(period)} filename={`journal-${from}-to-${to}.pdf`} label="PDF" />
            <DownloadButton href={api.accounting.getJournalCsvUrl(period)} filename={`journal-${from}-to-${to}.csv`} label="CSV" />
          </div>
        ) : (
          <div data-header-actions>
            <DownloadButton href={api.accounting.getTrialBalancePdfUrl(period)} filename={`trial-balance-${from}-to-${to}.pdf`} label="PDF" />
            <DownloadButton href={api.accounting.getTrialBalanceCsvUrl(period)} filename={`trial-balance-${from}-to-${to}.csv`} label="CSV" />
          </div>
        )}
      </div>

      {tab === 'journal' ? (
        entriesLoading ? <SkeletonLoader rows={5} /> : !entries?.length ? (
          <EmptyState title="No journal entries in this period" description="Finalize a night audit or post a manual entry." />
        ) : (
          <div data-journal-list>
            {entries.map((entryRaw) => {
              const entry = entryRaw as unknown as Record<string, unknown>;
              const id = String(entry['_id']);
              const lines = entry['lines'] as Record<string, unknown>[];
              const isManual = entry['source'] === 'manual';
              return (
                <div key={id} data-journal-entry-card>
                  <div data-journal-entry-header>
                    <div>
                      <strong>{String(entry['entryNumber'])}</strong> — {fmtDate(String(entry['date']))} — {String(entry['description'])}
                      {!isManual && <span data-auto-badge> Night Audit</span>}
                    </div>
                    <div data-action-cluster>
                      <button type="button" data-btn-ghost data-btn-sm onClick={() => openEdit(entry)}>Edit description</button>
                      {isManual && (
                        <button type="button" data-btn-ghost data-btn-sm data-destructive onClick={() => setDeleteEntryId(id)}>Delete</button>
                      )}
                    </div>
                  </div>
                  <table data-table>
                    <thead><tr><th>Account</th><th>Description</th><th>Debit</th><th>Credit</th></tr></thead>
                    <tbody>
                      {lines.map((l, i) => {
                        const acc = l['accountId'] as Record<string, unknown>;
                        return (
                          <tr key={i}>
                            <td>{acc ? `${acc['code']} ${acc['name']}` : '—'}</td>
                            <td>{String(l['description'] ?? '')}</td>
                            <td>{l['debit'] ? fmtCurrency(Number(l['debit'])) : ''}</td>
                            <td>{l['credit'] ? fmtCurrency(Number(l['credit'])) : ''}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr><td></td><td>Total</td><td>{fmtCurrency(Number(entry['totalDebit']))}</td><td>{fmtCurrency(Number(entry['totalCredit']))}</td></tr>
                    </tfoot>
                  </table>
                </div>
              );
            })}
          </div>
        )
      ) : (
        tbLoading ? <SkeletonLoader rows={6} /> : (
          <>
            {trialBalance && (trialBalance as unknown as Record<string, unknown>)['balanced'] === false && (
              <div role="alert" data-alert data-alert-warning>
                Out of balance — total debits do not equal total credits for this period.
              </div>
            )}
            <table data-table>
              <thead><tr><th>Code</th><th>Account</th><th>Debit</th><th>Credit</th></tr></thead>
              <tbody>
                {((trialBalance as unknown as Record<string, unknown>)?.['rows'] as Record<string, unknown>[] ?? []).map((r) => (
                  <tr key={String(r['accountId'])}>
                    <td>{String(r['code'])}</td>
                    <td>{String(r['name'])}</td>
                    <td>{r['debitBalance'] ? fmtCurrency(Number(r['debitBalance'])) : ''}</td>
                    <td>{r['creditBalance'] ? fmtCurrency(Number(r['creditBalance'])) : ''}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td></td><td>Total</td>
                  <td>{fmtCurrency(Number((trialBalance as unknown as Record<string, unknown>)?.['totalDebit']))}</td>
                  <td>{fmtCurrency(Number((trialBalance as unknown as Record<string, unknown>)?.['totalCredit']))}</td>
                </tr>
              </tfoot>
            </table>
          </>
        )
      )}

      {/* New manual journal entry */}
      <Modal open={showNewEntry} onClose={() => setShowNewEntry(false)} title="New journal entry">
        <form onSubmit={entryForm.handleSubmit((v) => createEntryMutation.mutate(v))} noValidate data-form>
          <div data-form-row>
            <div data-form-group>
              <label htmlFor="je-date">Date</label>
              <input id="je-date" type="date" max={todayIso()} {...entryForm.register('date')} />
            </div>
            <div data-form-group>
              <label htmlFor="je-desc">Description</label>
              <input id="je-desc" type="text" placeholder="e.g. Opening balance adjustment" {...entryForm.register('description')} />
            </div>
          </div>

          {fields.map((field, index) => (
            <div key={field.id} data-form-row data-po-item-row>
              <div data-form-group>
                <label htmlFor={`je-account-${index}`}>Account</label>
                <Controller
                  control={entryForm.control}
                  name={`lines.${index}.accountId`}
                  render={({ field: f }) => (
                    <Dropdown id={`je-account-${index}`} options={accountOptions} value={f.value ?? ''} onChange={f.onChange} placeholder="Select…" />
                  )}
                />
              </div>
              <div data-form-group>
                <label htmlFor={`je-debit-${index}`}>Debit</label>
                <input id={`je-debit-${index}`} type="number" min={0} step="0.01" {...entryForm.register(`lines.${index}.debit`, { valueAsNumber: true })} />
              </div>
              <div data-form-group>
                <label htmlFor={`je-credit-${index}`}>Credit</label>
                <input id={`je-credit-${index}`} type="number" min={0} step="0.01" {...entryForm.register(`lines.${index}.credit`, { valueAsNumber: true })} />
              </div>
              {fields.length > 2 && (
                <button type="button" data-btn-ghost data-btn-sm data-destructive onClick={() => remove(index)}>Remove</button>
              )}
            </div>
          ))}
          <button type="button" data-btn-ghost data-btn-sm onClick={() => append({ accountId: '' })}>+ Add line</button>

          <div data-form-group>
            <p data-field-hint>
              Debits: {fmtCurrency(totalDebit)} — Credits: {fmtCurrency(totalCredit)}
              {' — '}
              {isBalanced ? 'Balanced ✓' : 'Not balanced yet'}
            </p>
          </div>

          <div data-modal-actions>
            <button type="button" data-btn-ghost onClick={() => setShowNewEntry(false)}>Cancel</button>
            <button type="submit" data-btn-primary disabled={!isBalanced || createEntryMutation.isPending}>
              {createEntryMutation.isPending ? 'Posting…' : 'Post entry'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit descriptions on an existing entry */}
      <Modal open={!!editingEntry} onClose={() => setEditingEntry(null)} title="Edit journal entry descriptions">
        {editingEntry && (
          <form
            onSubmit={editForm.handleSubmit((v) => {
              updateEntryMutation.mutate({
                id: String(editingEntry['_id']),
                input: {
                  description: v.description,
                  lineDescriptions: v.lineDescriptions.map((description, index) => ({ index, description })),
                },
              });
            })}
            noValidate data-form
          >
            <p data-field-hint>
              Amounts and accounts on a posted entry can&apos;t be changed — post a new adjusting
              entry to correct the numbers. You can update descriptions here for clarity.
            </p>
            <div data-form-group>
              <label htmlFor="edit-je-desc">Entry description</label>
              <input id="edit-je-desc" type="text" {...editForm.register('description')} />
              <InlineError message={editForm.formState.errors.description?.message} />
            </div>
            {(editingEntry['lines'] as Record<string, unknown>[]).map((l, i) => {
              const acc = l['accountId'] as Record<string, unknown>;
              return (
                <div key={i} data-form-group>
                  <label htmlFor={`edit-line-desc-${i}`}>{acc ? `${acc['code']} ${acc['name']}` : `Line ${i + 1}`}</label>
                  <input id={`edit-line-desc-${i}`} type="text" {...editForm.register(`lineDescriptions.${i}`)} />
                </div>
              );
            })}
            <div data-modal-actions>
              <button type="button" data-btn-ghost onClick={() => setEditingEntry(null)}>Cancel</button>
              <button type="submit" data-btn-primary disabled={updateEntryMutation.isPending}>
                {updateEntryMutation.isPending ? 'Saving…' : 'Save descriptions'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      <ConfirmDialog
        open={!!deleteEntryId}
        title="Delete this journal entry?"
        message="This permanently removes the entry from the ledger. This can't be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        destructive
        onConfirm={() => { if (deleteEntryId) deleteEntryMutation.mutate(deleteEntryId); }}
        onCancel={() => setDeleteEntryId(null)}
      />
    </div>
  );
}
