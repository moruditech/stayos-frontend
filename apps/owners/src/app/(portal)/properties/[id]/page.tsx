'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { api } from '@stayos/api-client';
import {
  SkeletonLoader,
  StatusBadge,
  ReadOnlyField,
  useToast,
  ConfirmDialog,
  MandateBanner,
} from '@stayos/ui';
import { useEnterProperty } from '@/hooks/useEnterProperty';

const ownerPropertyKeys = {
  detail: (id: string) => ['owner', 'properties', id] as const,
  mandates: () => ['owner', 'mandates'] as const,
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(amount);
}

export default function PropertyDetailPage(): React.ReactElement {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { toast } = useToast();
  const { enterProperty, loading: enterLoading } = useEnterProperty();

  const { data: property, isLoading } = useQuery({
    queryKey: ownerPropertyKeys.detail(id),
    queryFn: () => api.owner.getProperty(id),
  });

  if (isLoading) return <SkeletonLoader rows={5} />;
  if (!property) return <p>Property not found.</p>;

  const isReadOnly = !!property.activeMandateId;

  return (
    <div data-page="property-detail">
      {isReadOnly && <MandateBanner />}

      <div data-page-header>
        <div>
          <a href="/properties" data-breadcrumb>← Back to properties</a>
          <h1>{property.name}</h1>
        </div>
        <div data-header-actions>
          {property.status === 'active' && (
            <button
              type="button"
              data-btn-primary
              disabled={enterLoading}
              onClick={() => void enterProperty(id)}
            >
              {enterLoading ? 'Opening…' : 'Open property'}
            </button>
          )}
        </div>
      </div>

      <div data-detail-grid>
        <section data-detail-section>
          <h2>Property details</h2>
          <div data-field-list>
            <ReadOnlyField label="Name" value={property.name} />
            <ReadOnlyField label="Type" value={property.type} />
            <ReadOnlyField label="Status" value={<StatusBadge status={property.status} />} />
            {isReadOnly && (
              <ReadOnlyField
                label="Management"
                value={
                  <span data-agency-badge>
                    Managed by {property.agencyId?.name ?? 'an agency'}
                  </span>
                }
              />
            )}
          </div>
        </section>

        <section data-detail-section>
          <h2>Subscription</h2>
          <div data-field-list>
            <ReadOnlyField label="Plan" value={property.planId?.name ?? '—'} />
            <ReadOnlyField label="Tier" value={property.planId?.tier ?? '—'} />
            <ReadOnlyField
              label="Monthly fee"
              value={
                property.planId?.monthlyPrice != null
                  ? formatCurrency(property.planId.monthlyPrice)
                  : '—'
              }
            />
          </div>
          {property.status === 'active' && (
            <a href={`/properties`} data-btn-ghost data-btn-sm style={{ marginTop: 12 }}>
              Manage subscription →
            </a>
          )}
        </section>

        <section data-detail-section>
          <h2>Agency mandate</h2>
          {property.activeMandateId ? (
            <>
              <p data-info-note>
                This property is currently under an active agency management mandate. You
                have view-only access while the mandate is in force.
              </p>
              <div data-mandate-actions>
                <a href="/mandates" data-btn-ghost>
                  View mandate history
                </a>
              </div>
            </>
          ) : (
            <p data-info-note>
              No active mandate. You have full operational control of this property.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
