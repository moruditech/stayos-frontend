'use client';

/**
 * Owner mandate management — portfolio-wide mandate history.
 *
 * TAD 12 §6 notes:
 *  - GET /owner/mandates is portfolio-wide (all properties, all statuses).
 *  - Mandate detail (dates, fee particulars) is stubbed — GET /owner/mandates/:id
 *    does not yet exist on the backend. Only boolean/status facts from the
 *    list response are shown until the detail endpoint lands.
 *  - Accepting can return 'Mandate activated' OR 'Mandate accepted — awaiting
 *    agency signature'. The confirmation UI reflects whichever actually occurred.
 *  - terminateMandateOwner includes an ownership check on the backend — the
 *    frontend doesn't need to add a separate guard.
 */

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@stayos/api-client';
import type { ApiError } from '@stayos/api-client';
import type { OwnerMandate } from '@stayos/api-client';
import {
  SkeletonLoader,
  EmptyState,
  StatusBadge,
  useToast,
  ConfirmDialog,
  MandateTerminationBanner,
} from '@stayos/ui';

const mandateKeys = {
  list: () => ['owner', 'mandates'] as const,
};

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-ZA', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export default function MandatesPage(): React.ReactElement {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [terminatingId, setTerminatingId] = useState<string | null>(null);
  const [acceptResult, setAcceptResult] = useState<string | null>(null);

  const { data: mandates, isLoading } = useQuery({
    queryKey: mandateKeys.list(),
    queryFn: () => api.owner.listMandates(),
  });

  const acceptMutation = useMutation({
    mutationFn: (id: string) => api.owner.acceptMandate(id),
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: mandateKeys.list() });
      setAcceptResult(result.message);
    },
    onError: (err: ApiError) => {
      toast(err.message ?? 'Failed to accept mandate.', 'error');
    },
  });

  const terminateMutation = useMutation({
    mutationFn: (id: string) => api.owner.terminateMandate(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: mandateKeys.list() });
      setTerminatingId(null);
      toast('Termination notice initiated.', 'success');
    },
    onError: (err: ApiError) => {
      setTerminatingId(null);
      toast(err.message ?? 'Failed to terminate mandate.', 'error');
    },
  });

  if (isLoading) return <SkeletonLoader rows={3} />;

  const activeMandates = mandates?.filter(
    (m) => m.mandateStatus === 'active' || m.mandateStatus === 'termination_notice'
  ) ?? [];
  const historyMandates = mandates?.filter(
    (m) => m.mandateStatus === 'terminated' || m.mandateStatus === 'pending'
  ) ?? [];

  if (acceptResult) {
    return (
      <div data-page="mandates">
        <div data-success-panel>
          <h1>
            {acceptResult === 'Mandate activated'
              ? 'Mandate activated'
              : 'Mandate accepted'}
          </h1>
          <p>
            {acceptResult === 'Mandate activated'
              ? 'The mandate is now active. The agency now has access to manage this property on your behalf.'
              : 'Your acceptance has been recorded. The mandate will activate once the agency also signs.'}
          </p>
          <button
            type="button"
            data-btn-primary
            onClick={() => setAcceptResult(null)}
          >
            Back to mandates
          </button>
        </div>
      </div>
    );
  }

  return (
    <div data-page="mandates">
      <div data-page-header>
        <h1>Mandates</h1>
        <p data-page-subtitle>Agency management agreements across your portfolio</p>
      </div>

      {/* Active / termination-notice mandates */}
      {activeMandates.length > 0 && (
        <section data-mandate-section>
          <h2>Active mandates</h2>
          {activeMandates.map((mandate) => (
            <MandateCard
              key={mandate._id}
              mandate={mandate}
              onAccept={() => acceptMutation.mutate(mandate._id)}
              onTerminate={() => setTerminatingId(mandate._id)}
              acceptPending={acceptMutation.isPending}
              terminatePending={terminateMutation.isPending}
            />
          ))}
        </section>
      )}

      {/* Pending mandates waiting for signature */}
      {mandates?.filter((m) => m.mandateStatus === 'pending').map((mandate) => (
        <MandateCard
          key={mandate._id}
          mandate={mandate}
          onAccept={() => acceptMutation.mutate(mandate._id)}
          onTerminate={() => setTerminatingId(mandate._id)}
          acceptPending={acceptMutation.isPending}
          terminatePending={terminateMutation.isPending}
        />
      ))}

      {/* History */}
      {historyMandates.length > 0 && (
        <section data-mandate-section>
          <h2>History</h2>
          {historyMandates.map((mandate) => (
            <MandateCard
              key={mandate._id}
              mandate={mandate}
              onAccept={() => acceptMutation.mutate(mandate._id)}
              onTerminate={() => setTerminatingId(mandate._id)}
              acceptPending={acceptMutation.isPending}
              terminatePending={terminateMutation.isPending}
            />
          ))}
        </section>
      )}

      {!mandates?.length && (
        <EmptyState
          title="No mandates"
          description="Agency management agreements will appear here once created."
        />
      )}

      <ConfirmDialog
        open={!!terminatingId}
        title="Initiate termination?"
        message="This will start the notice period for this mandate. Agency access will be revoked when the notice period ends. This cannot be undone."
        confirmLabel="Initiate termination"
        cancelLabel="Cancel"
        destructive
        onConfirm={() => {
          if (terminatingId) terminateMutation.mutate(terminatingId);
        }}
        onCancel={() => setTerminatingId(null)}
      />
    </div>
  );
}

function MandateCard({
  mandate,
  onAccept,
  onTerminate,
  acceptPending,
  terminatePending,
}: {
  mandate: OwnerMandate;
  onAccept: () => void;
  onTerminate: () => void;
  acceptPending: boolean;
  terminatePending: boolean;
}): React.ReactElement {
  return (
    <div data-mandate-card>
      <div data-mandate-card-header>
        <div>
          <span data-mandate-agency>{mandate.agencyId?.name ?? '—'}</span>
          <StatusBadge status={mandate.mandateStatus} />
        </div>
      </div>

      {mandate.mandateStatus === 'termination_notice' && (
        <MandateTerminationBanner terminationDate={mandate.terminationDate} />
      )}

      <div data-mandate-meta>
        <div>
          <span data-meta-label>Created</span>
          <span>{new Date(mandate.createdAt).toLocaleDateString('en-ZA')}</span>
        </div>
        {mandate.terminationDate && (
          <div>
            <span data-meta-label>Termination date</span>
            <span>{new Date(mandate.terminationDate).toLocaleDateString('en-ZA')}</span>
          </div>
        )}
        <p data-mandate-detail-note>
          Fee details and full mandate particulars are loading — this information will
          appear once the mandate detail endpoint is available.
        </p>
      </div>

      <div data-mandate-card-actions>
        {mandate.mandateStatus === 'pending' && (
          <button
            type="button"
            data-btn-primary
            disabled={acceptPending}
            onClick={onAccept}
          >
            {acceptPending ? 'Accepting…' : 'Accept mandate'}
          </button>
        )}
        {(mandate.mandateStatus === 'active' ||
          mandate.mandateStatus === 'termination_notice') && (
          <button
            type="button"
            data-btn-destructive
            disabled={terminatePending}
            onClick={onTerminate}
          >
            Initiate termination
          </button>
        )}
      </div>
    </div>
  );
}
