'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api } from '@stayos/api-client';
import type { ApiError, HostSearchResult, VisitorLogEntry } from '@stayos/api-client';
import { SkeletonLoader, useToast, Modal, InlineError, StatusBadge, applyServerErrors } from '@stayos/ui';
import { accessKeys } from '@/lib/query-keys';

// Must match the backend checkInSchema exactly (src/modules/access/access.validation.js)
// — field names here are what applyServerErrors maps 422 responses onto, so a
// mismatch here silently drops server-side errors. See Document 06 §3 /
// packages/ui/src/InlineError.tsx.
const HOST_TYPES   = ['guest', 'staff'] as const;
const PURPOSES     = ['guest', 'delivery', 'contractor', 'family', 'other'] as const;
const VISIT_TYPES  = ['day_visit', 'sleepover'] as const;

const visitorSchema = z.object({
  visitorName:   z.string().min(1, 'Visitor name is required'),
  hostType:      z.enum(HOST_TYPES),
  hostId:        z.string().min(1, 'Select who this visitor is here to see'),
  hostBookingId: z.string().optional(),
  purpose:       z.enum(PURPOSES).default('guest'),
  visitType:     z.enum(VISIT_TYPES).default('day_visit'),
  idNumber:      z.string().optional(),
  consentGiven:  z.boolean().default(true),
  vehicleReg:    z.string().optional(),
});
type VisitorInput = z.infer<typeof visitorSchema>;

const PURPOSE_LABELS: Record<(typeof PURPOSES)[number], string> = {
  guest: 'Guest', delivery: 'Delivery', contractor: 'Contractor', family: 'Family', other: 'Other',
};

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleString('en-ZA', { dateStyle: 'short', timeStyle: 'short' });
}

// ── Host search combobox ─────────────────────────────────────────────────────
// A visitor's host is always a real, currently-checked-in guest or an active
// staff member — never free text. Debounced 300ms, and only fires once the
// query is 2+ characters (matches the backend's hostSearchQuerySchema floor).
function HostSearchField({
  hostType, value, onSelect, error,
}: {
  hostType: 'guest' | 'staff';
  value: { hostId: string; label: string } | null;
  onSelect: (result: HostSearchResult | null) => void;
  error?: string;
}): React.ReactElement {
  // Seeded once from `value` at mount only — intentionally not re-synced on
  // every prop change, since the parent clears `value` as soon as the user
  // types (a fresh search invalidates the old pick) and re-deriving
  // inputValue from that on every render would wipe out what's mid-typing.
  // The parent instead remounts this field (via `key={hostType}`) whenever
  // it wants a hard reset — e.g. toggling between guest/staff.
  const [inputValue, setInputValue] = useState(value?.label ?? '');
  const [debounced, setDebounced]   = useState('');
  const [open, setOpen]             = useState(false);
  const blurTimer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    const t = setTimeout(() => setDebounced(inputValue.trim()), 300);
    return () => clearTimeout(t);
  }, [inputValue]);

  const searchActive = debounced.length >= 2;
  const { data: results, isFetching } = useQuery({
    queryKey: accessKeys.hostSearch(hostType, debounced),
    queryFn: () => api.access.searchHosts(hostType, debounced),
    enabled: searchActive,
    staleTime: 10_000,
  });

  return (
    <div data-host-search>
      <input
        id="vis-host"
        type="text"
        role="combobox"
        aria-expanded={open}
        autoComplete="off"
        placeholder={hostType === 'guest' ? 'Search checked-in guests…' : 'Search staff…'}
        value={inputValue}
        onChange={(e) => {
          setInputValue(e.target.value);
          setOpen(true);
          if (value) onSelect(null); // typing again clears a prior selection
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => { blurTimer.current = setTimeout(() => setOpen(false), 150); }}
      />
      {open && searchActive && (
        <ul data-host-search-results>
          {isFetching && <li data-host-search-status>Searching…</li>}
          {!isFetching && (results?.length ?? 0) === 0 && (
            <li data-host-search-status>
              {hostType === 'guest' ? 'No currently checked-in guest matches.' : 'No matching staff member.'}
            </li>
          )}
          {!isFetching && results?.map((r) => (
            <li key={`${r.hostType}-${r.hostId}-${r.hostBookingId ?? ''}`}>
              <button
                type="button"
                data-host-search-result
                onMouseDown={(e) => e.preventDefault()} // keep input focus so onBlur doesn't beat the click
                onClick={() => {
                  clearTimeout(blurTimer.current);
                  const label = r.disambiguated && r.sublabel ? `${r.label} — ${r.sublabel}` : r.label;
                  setInputValue(label);
                  setOpen(false);
                  onSelect(r);
                }}
              >
                <span data-host-search-result-name>{r.label}</span>
                {r.sublabel && <span data-host-search-result-sub>{r.sublabel}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
      {!searchActive && inputValue.length > 0 && inputValue.length < 2 && (
        <p data-hint>Type at least 2 characters to search.</p>
      )}
      <InlineError message={error} />
    </div>
  );
}

export default function VisitorsPage(): React.ReactElement {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showNew, setShowNew] = useState(false);
  const [selectedHost, setSelectedHost] = useState<{ hostId: string; label: string } | null>(null);

  const { data: visitors, isLoading } = useQuery({
    queryKey: accessKeys.visitors(),
    queryFn: () => api.access.listVisitors(),
    staleTime: 30_000,
  });

  const { data: policy } = useQuery({
    queryKey: accessKeys.visitorPolicy(),
    queryFn: () => api.access.getVisitorPolicy(),
    staleTime: 60_000,
  });

  const form = useForm<VisitorInput>({
    resolver: zodResolver(visitorSchema),
    defaultValues: {
      hostType: 'guest', purpose: 'guest', visitType: 'day_visit', consentGiven: true,
    },
  });

  const hostType = form.watch('hostType');
  const idNumber = form.watch('idNumber');

  function resetModal(): void {
    form.reset({ hostType: 'guest', purpose: 'guest', visitType: 'day_visit', consentGiven: true });
    setSelectedHost(null);
  }

  const checkInMutation = useMutation({
    mutationFn: (input: VisitorInput) => api.access.checkInVisitor(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: accessKeys.visitors() });
      setShowNew(false);
      resetModal();
      toast('Visitor checked in.', 'success');
    },
    onError: (err: ApiError) => {
      if (err.code === 'VALIDATION_ERROR') {
        applyServerErrors(form, err);
        const hasUnattachedError = err.fields?.some((f) => !f.field);
        if (hasUnattachedError || !err.fields?.length) toast(err.message, 'error');
      } else {
        // e.g. HOST_NOT_FOUND (the selected guest/staff member is no longer
        // valid) or OUTSIDE_VISITING_HOURS — whole-request errors with no
        // single field to attach to.
        toast(err.message ?? 'Failed to check in visitor.', 'error');
      }
    },
  });

  const checkOutMutation = useMutation({
    mutationFn: (id: string) => api.access.checkOutVisitor(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: accessKeys.visitors() });
      toast('Visitor checked out.', 'success');
    },
    onError: (err: ApiError) => toast(err.message ?? 'Failed to check out visitor.', 'error'),
  });

  const activeVisitors = (visitors ?? []).filter((v) => !v.checkedOutAt);
  const recentVisitors = (visitors ?? []).filter((v) => !!v.checkedOutAt).slice(0, 20);

  return (
    <div data-page="visitors">
      <div data-page-header>
        <h1>Access Control</h1>
        <p data-page-subtitle>Visitor log</p>
        <button type="button" data-btn-primary onClick={() => setShowNew(true)}>
          + Check in visitor
        </button>
      </div>

      <section data-access-section>
        <h2>Currently on site ({activeVisitors.length})</h2>
        {isLoading ? <SkeletonLoader rows={3} /> : !activeVisitors.length ? (
          <p data-empty-note>No visitors currently on site.</p>
        ) : (
          <table data-table>
            <thead>
              <tr><th>Name</th><th>Host</th><th>Purpose</th><th>Visit type</th><th>Arrived</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {activeVisitors.map((v) => (
                <tr key={v._id}>
                  <td>{v.visitorName}</td>
                  <td>{v.hostName}{v.hostRoomNumber ? ` — Room ${v.hostRoomNumber}` : ''}</td>
                  <td>{PURPOSE_LABELS[v.purpose] ?? v.purpose}</td>
                  <td>
                    <StatusBadge status={v.visitType} />
                    {v.overstayAlertSentAt && <StatusBadge status="overstaying" />}
                  </td>
                  <td>{v.checkedInAt ? fmtTime(v.checkedInAt) : '—'}</td>
                  <td>
                    <button type="button" data-btn-ghost data-btn-sm
                      disabled={checkOutMutation.isPending}
                      onClick={() => checkOutMutation.mutate(v._id)}>
                      Check out
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {recentVisitors.length > 0 && (
        <section data-access-section>
          <h2>Recent departures</h2>
          <table data-table>
            <thead>
              <tr><th>Name</th><th>Host</th><th>Arrived</th><th>Departed</th></tr>
            </thead>
            <tbody>
              {recentVisitors.map((v) => (
                <tr key={v._id}>
                  <td>{v.visitorName}</td>
                  <td>{v.hostName}{v.hostRoomNumber ? ` — Room ${v.hostRoomNumber}` : ''}</td>
                  <td>{v.checkedInAt ? fmtTime(v.checkedInAt) : '—'}</td>
                  <td>{v.checkedOutAt ? fmtTime(v.checkedOutAt) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      <Modal open={showNew} onClose={() => { setShowNew(false); resetModal(); }} title="Check in visitor">
        <form
          onSubmit={form.handleSubmit((v) => checkInMutation.mutate(v))}
          noValidate
          data-form
        >
          <div data-form-group>
            <label htmlFor="vis-name">Visitor name</label>
            <input id="vis-name" type="text" {...form.register('visitorName')} />
            <InlineError message={form.formState.errors.visitorName?.message} />
          </div>

          <div data-form-group>
            <label htmlFor="vis-host-type">Visiting</label>
            <select
              id="vis-host-type"
              value={hostType}
              onChange={(e) => {
                form.setValue('hostType', e.target.value as VisitorInput['hostType']);
                form.setValue('hostId', '');
                form.setValue('hostBookingId', undefined);
                setSelectedHost(null);
              }}
            >
              <option value="guest">A guest</option>
              <option value="staff">A staff member</option>
            </select>
          </div>

          <div data-form-group>
            <label htmlFor="vis-host">
              {hostType === 'guest' ? 'Guest' : 'Staff member'}
            </label>
            <HostSearchField
              key={hostType}
              hostType={hostType}
              value={selectedHost}
              error={form.formState.errors.hostId?.message}
              onSelect={(result) => {
                if (!result) {
                  setSelectedHost(null);
                  form.setValue('hostId', '');
                  form.setValue('hostBookingId', undefined);
                  return;
                }
                setSelectedHost({ hostId: result.hostId, label: result.label });
                form.setValue('hostId', result.hostId, { shouldValidate: true });
                form.setValue('hostBookingId', result.hostBookingId);
              }}
            />
          </div>

          <div data-form-row>
            <div data-form-group>
              <label htmlFor="vis-purpose">Purpose</label>
              <select id="vis-purpose" {...form.register('purpose')}>
                {PURPOSES.map((p) => <option key={p} value={p}>{PURPOSE_LABELS[p]}</option>)}
              </select>
            </div>
            <div data-form-group>
              <label htmlFor="vis-visit-type">Visit type</label>
              <select id="vis-visit-type" {...form.register('visitType')}>
                <option value="day_visit">Day visit</option>
                <option value="sleepover">Sleepover</option>
              </select>
              {policy?.enforceVisitingHours && (
                <p data-hint>
                  Day visits must check in between {policy.visitingHoursStart}–{policy.visitingHoursEnd}.
                  Sleepovers are exempt.
                </p>
              )}
            </div>
          </div>

          <div data-form-row>
            <div data-form-group>
              <label htmlFor="vis-id">ID number <span data-optional>(optional)</span></label>
              <input id="vis-id" type="text" {...form.register('idNumber')} />
            </div>
            <div data-form-group>
              <label htmlFor="vis-vehicle">Vehicle reg <span data-optional>(optional)</span></label>
              <input id="vis-vehicle" type="text" {...form.register('vehicleReg')} />
            </div>
          </div>

          {!!idNumber && (
            <div data-form-group data-form-checkbox>
              <label htmlFor="vis-consent">
                <input id="vis-consent" type="checkbox" {...form.register('consentGiven')} />
                {' '}Visitor consents to this ID number being captured
              </label>
              <p data-hint>Unchecked, the ID number above will be discarded rather than stored.</p>
            </div>
          )}

          <div data-modal-actions>
            <button type="button" data-btn-ghost onClick={() => { setShowNew(false); resetModal(); }}>Cancel</button>
            <button type="submit" data-btn-primary disabled={checkInMutation.isPending}>
              {checkInMutation.isPending ? 'Checking in…' : 'Check in'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
