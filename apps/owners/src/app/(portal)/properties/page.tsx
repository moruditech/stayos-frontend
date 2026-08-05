'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@stayos/api-client';
import {
  SkeletonLoader,
  EmptyState,
  StatusBadge,
  useToast,
} from '@stayos/ui';
import { useEnterProperty } from '@/hooks/useEnterProperty';

const ownerPropertyKeys = {
  list: () => ['owner', 'properties'] as const,
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(amount);
}

export default function PropertiesPage(): React.ReactElement {
  const { toast } = useToast();
  const { enterProperty, loading: enterLoading } = useEnterProperty();
  const [enteringId, setEnteringId] = useState<string | null>(null);

  const { data: properties, isLoading } = useQuery({
    queryKey: ownerPropertyKeys.list(),
    queryFn: () => api.owner.listProperties(),
  });

  async function handleEnter(id: string): Promise<void> {
    setEnteringId(id);
    try {
      await enterProperty(id);
    } catch {
      toast('Failed to enter property. Please try again.', 'error');
      setEnteringId(null);
    }
  }

  if (isLoading) return <SkeletonLoader rows={4} />;

  return (
    <div data-page="properties">
      <div data-page-header>
        <div>
          <h1>My properties</h1>
          <p data-page-subtitle>Manage your property portfolio</p>
        </div>
        <a href="/properties/new" data-btn-primary>
          + Add property
        </a>
      </div>

      {!properties?.length ? (
        <EmptyState
          title="No properties yet"
          description="Add your first property to start managing it through StayOS."
          action={
            <a href="/properties/new" data-btn-primary>
              Add your first property
            </a>
          }
        />
      ) : (
        <div data-property-grid>
          {properties.map((property) => (
            <div key={property._id} data-property-card>
              <div data-property-card-header>
                <div>
                  <h2 data-property-name>{property.name}</h2>
                  <span data-property-type>{property.type}</span>
                </div>
                <StatusBadge status={property.status} />
              </div>

              <div data-property-card-meta>
                <div data-property-meta-item>
                  <span data-meta-label>Plan</span>
                  <span data-meta-value>{property.planId?.name ?? '—'}</span>
                </div>
                <div data-property-meta-item>
                  <span data-meta-label>Monthly</span>
                  <span data-meta-value>
                    {property.planId?.monthlyPrice != null
                      ? formatCurrency(property.planId.monthlyPrice)
                      : '—'}
                  </span>
                </div>
                {property.agencyId && (
                  <div data-property-meta-item>
                    <span data-meta-label>Managed by</span>
                    <span data-meta-value data-agency-badge>
                      {property.agencyId.name}
                    </span>
                  </div>
                )}
                {property.activeMandateId && (
                  <div data-property-meta-item>
                    <span data-meta-label>Access</span>
                    <span data-meta-value data-readonly-indicator>
                      View only
                    </span>
                  </div>
                )}
              </div>

              <div data-property-card-actions>
                <a href={`/properties/${property._id}`} data-btn-ghost>
                  View details
                </a>
                {property.status === 'active' ? (
                  <button
                    type="button"
                    data-btn-primary
                    disabled={enterLoading && enteringId === property._id}
                    onClick={() => void handleEnter(property._id)}
                  >
                    {enterLoading && enteringId === property._id
                      ? 'Opening…'
                      : 'Open property'}
                  </button>
                ) : (
                  <span data-status-note>
                    {property.status === 'pending'
                      ? 'Awaiting approval'
                      : property.status === 'suspended'
                      ? 'Suspended'
                      : property.status}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
