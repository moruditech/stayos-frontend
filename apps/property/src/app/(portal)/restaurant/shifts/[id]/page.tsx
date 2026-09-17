'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api } from '@stayos/api-client';
import { PERMISSIONS, PLAN_FEATURES } from '@stayos/constants';
import { RoleGate, PlanGate, SkeletonLoader, EmptyState, StatusBadge, ReadOnlyField } from '@stayos/ui';
import { shiftKeys } from '@/lib/query-keys';

export default function ShiftDetailPage({ params }: { params: { id: string } }): React.ReactElement {
  return (
    <RoleGate
      perm={PERMISSIONS.POS_SHIFT_READ_ALL}
      fallback={<EmptyState title="You don't have access to shift history" />}
    >
      <PlanGate feature={PLAN_FEATURES.RESTAURANT_MODULE}>
        <ShiftDetailContent shiftId={params.id} />
      </PlanGate>
    </RoleGate>
  );
}

function ShiftDetailContent({ shiftId }: { shiftId: string }): React.ReactElement {
  const router = useRouter();

  const { data: shift, isLoading } = useQuery({
    queryKey: shiftKeys.detail(shiftId),
    queryFn: () => api.restaurantShifts.get(shiftId),
  });

  if (isLoading) return <SkeletonLoader rows={6} />;
  if (!shift) return <EmptyState title="Shift not found" />;

  const staffName = typeof shift.staffId === 'object' ? `${shift.staffId.firstName} ${shift.staffId.lastName}` : '—';
  const outletName = typeof shift.outletId === 'object' ? shift.outletId.name : '—';
  const tillName = typeof shift.tillId === 'object' ? shift.tillId.name : '—';
  const summary = shift.salesSummary;

  return (
    <div data-page="restaurant-shift-detail">
      <div data-page-header>
        <div>
          <button type="button" data-btn-ghost onClick={() => router.push('/restaurant/shifts')}>
            ← Back to Shifts
          </button>
          <h1>{staffName} — {outletName}</h1>
        </div>
        <StatusBadge status={shift.status} />
      </div>

      <div data-detail-grid>
        <ReadOnlyField label="Till" value={tillName} />
        <ReadOnlyField label="Opening float" value={`R${shift.openingFloat.toFixed(2)}`} />
        <ReadOnlyField label="Opened at" value={new Date(shift.openedAt).toLocaleString('en-ZA')} />
        {shift.closedAt && <ReadOnlyField label="Closed at" value={new Date(shift.closedAt).toLocaleString('en-ZA')} />}
        {shift.countedCash !== undefined && <ReadOnlyField label="Counted cash" value={`R${shift.countedCash.toFixed(2)}`} />}
        {shift.expectedCash !== undefined && <ReadOnlyField label="Expected cash" value={`R${shift.expectedCash.toFixed(2)}`} />}
        {shift.variance !== undefined && (
          <ReadOnlyField
            label="Variance"
            value={`R${shift.variance.toFixed(2)}`}
          />
        )}
      </div>

      {shift.varianceNote && (
        <div data-panel data-panel-padded style={{ marginTop: 'var(--space-4)' }}>
          <strong>Variance note</strong>
          <p>{shift.varianceNote}</p>
        </div>
      )}

      {summary && (
        <>
          <h2>Sales breakdown</h2>
          <div data-detail-grid>
            <ReadOnlyField label="Total sales" value={`R${summary.totalSales.toFixed(2)}`} />
            <ReadOnlyField label="Cash" value={`R${summary.cashSales.toFixed(2)}`} />
            <ReadOnlyField label="Card" value={`R${summary.cardSales.toFixed(2)}`} />
            <ReadOnlyField label="Room charge" value={`R${summary.roomChargeSales.toFixed(2)}`} />
            <ReadOnlyField label="Tips" value={`R${summary.tipsTotal.toFixed(2)}`} />
            <ReadOnlyField label="Refunds" value={`R${summary.refundsTotal.toFixed(2)}`} />
            <ReadOnlyField label="Discounts given" value={`R${summary.discountsTotal.toFixed(2)}`} />
            <ReadOnlyField label="Voids" value={String(summary.voidsCount)} />
          </div>
        </>
      )}
    </div>
  );
}
