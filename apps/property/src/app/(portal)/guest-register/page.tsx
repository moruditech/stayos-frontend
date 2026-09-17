'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery } from '@tanstack/react-query';
import { api } from '@stayos/api-client';
import type { ApiError, GuestRegisterListEntry } from '@stayos/api-client';
import { SkeletonLoader, Pagination, RoleGate, Icons, useToast, EmptyBlock } from '@stayos/ui';
import { PERMISSIONS } from '@stayos/constants';
import { guestRegisterKeys } from '@/lib/query-keys';

const DOCUMENT_LABELS: Record<string, string> = {
  sa_id: 'SA ID',
  passport: 'Passport',
  other: 'Other',
};

const CAPTURED_VIA_LABELS: Record<string, string> = {
  front_desk_scan: 'Front desk',
  guest_self_service: 'Guest self-service',
  kiosk: 'Kiosk',
};

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' });
}

// Minimal CSV escaping — wrap in quotes and double up any embedded quotes.
// Good enough for the fields this register has (names, addresses, IDs);
// none of them are expected to contain newlines, but we handle it anyway.
function csvCell(value: string | number | undefined | null): string {
  const s = String(value ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function buildCsv(entries: GuestRegisterListEntry[]): string {
  const headers = [
    'Full name', 'ID/Passport number', 'Document type', 'Nationality',
    'Residence status', 'Residential address', 'Booking confirmation', 'Checked in at',
  ];
  const rows = entries.map((e) => [
    csvCell(e.fullName),
    csvCell(e.idOrPassportNumber),
    csvCell(DOCUMENT_LABELS[e.documentType] ?? e.documentType),
    csvCell(e.nationality),
    csvCell(e.residenceStatus),
    csvCell(e.residentialAddress),
    csvCell(e.bookingId?.confirmationNumber),
    csvCell(fmtDate(e.checkInAt)),
  ].join(','));
  return [headers.join(','), ...rows].join('\n');
}

function downloadCsv(csv: string, filename: string): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function GuestRegisterPage(): React.ReactElement {
  const { toast } = useToast();
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);
  const [viewingEntryId, setViewingEntryId] = useState<string | null>(null);

  const filters = { from: from || undefined, to: to || undefined, page, limit: 20 };

  const { data, isLoading } = useQuery({
    queryKey: guestRegisterKeys.list(filters),
    queryFn: () => api.guestregister.list(filters),
  });

  const viewDocumentMutation = useMutation({
    mutationFn: (entryId: string) => api.guestregister.getDocumentUrl(entryId),
    onError: (err: ApiError) => toast(err.message ?? 'Failed to open document.', 'error'),
  });

  const exportMutation = useMutation({
    mutationFn: () => api.guestregister.export({ from: from || undefined, to: to || undefined }),
    onSuccess: (entries) => {
      downloadCsv(buildCsv(entries), `guest-register-${new Date().toISOString().slice(0, 10)}.csv`);
    },
    onError: (err: ApiError) => toast(err.message ?? 'Failed to export register.', 'error'),
  });

  const entries = data?.data ?? [];

  return (
    <div data-page="guest-register">
      <div data-page-header>
        <div>
          <h1>Guest Register</h1>
          <p data-page-subtitle>
            Legal record of guest identity documents (Immigration Act s.40 &amp; Reg 36)
          </p>
        </div>
        <RoleGate perm={PERMISSIONS.REPORT_EXPORT}>
          <button
            type="button"
            data-btn-secondary
            onClick={() => exportMutation.mutate()}
            disabled={exportMutation.isPending}
          >
            <Icons.Download size={15} aria-hidden="true" />
            {exportMutation.isPending ? 'Exporting…' : 'Export CSV'}
          </button>
        </RoleGate>
      </div>

      <div data-filter-bar>
        <div data-form-group>
          <label htmlFor="gr-from">From</label>
          <input id="gr-from" type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} />
        </div>
        <div data-form-group>
          <label htmlFor="gr-to">To</label>
          <input id="gr-to" type="date" value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }} />
        </div>
      </div>

      {isLoading ? (
        <SkeletonLoader rows={6} />
      ) : entries.length === 0 ? (
        <EmptyBlock
          icon={Icons.ScrollText}
          title="No register entries"
          description={from || to ? 'No entries in this date range.' : 'Entries appear here once guests are checked in.'}
        />
      ) : (
        <>
          <div data-table-wrap>
            <table data-table>
              <thead>
                <tr>
                  <th>Guest</th>
                  <th>ID / Passport</th>
                  <th>Nationality</th>
                  <th>Residence status</th>
                  <th>Booking</th>
                  <th>Checked in</th>
                  <th>Captured via</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry._id} data-row>
                    <td>{entry.fullName}</td>
                    <td>
                      {entry.idOrPassportNumber}
                      <div data-cell-entity-sub>{DOCUMENT_LABELS[entry.documentType] ?? entry.documentType}</div>
                    </td>
                    <td>{entry.nationality}</td>
                    <td>{entry.residenceStatus.replace(/_/g, ' ')}</td>
                    <td>
                      {entry.bookingId?.confirmationNumber ? (
                        <Link href={`/bookings/${entry.bookingId._id}`} data-table-link>
                          {entry.bookingId.confirmationNumber}
                        </Link>
                      ) : '—'}
                    </td>
                    <td>{fmtDate(entry.checkInAt)}</td>
                    <td>{CAPTURED_VIA_LABELS[entry.capturedVia] ?? entry.capturedVia}</td>
                    <td data-row-actions>
                      <RoleGate perm={PERMISSIONS.PROPERTY_ALL}>
                        <button
                          type="button"
                          data-btn-ghost
                          data-btn-sm
                          disabled={viewDocumentMutation.isPending && viewingEntryId === entry._id}
                          onClick={() => {
                            setViewingEntryId(entry._id);
                            // Open a blank tab synchronously within the click
                            // handler so browsers don't treat the later
                            // navigation (after the signed-URL fetch
                            // resolves) as a blocked popup.
                            const tab = window.open('', '_blank');
                            viewDocumentMutation.mutate(entry._id, {
                              onSuccess: ({ url }) => {
                                if (tab) tab.location.href = url;
                              },
                              onError: () => tab?.close(),
                            });
                          }}
                        >
                          View document
                        </button>
                      </RoleGate>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {data?.meta && <Pagination meta={data.meta} onPageChange={setPage} />}
        </>
      )}
    </div>
  );
}
