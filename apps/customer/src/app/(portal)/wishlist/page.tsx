'use client';
import Link from 'next/link';
import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from '@stayos/auth';
import { api } from '@stayos/api-client';
import type { ApiError } from '@stayos/api-client';
import { SkeletonLoader, EmptyState, useToast, Icons } from '@stayos/ui';
import { wishlistKeys } from '@/lib/query-keys';

export default function WishlistPage(): React.ReactElement {
  const session   = useSession();
  const qc        = useQueryClient();
  const { toast } = useToast();

  const { data: wishlist, isLoading } = useQuery({
    queryKey: wishlistKeys.list(),
    queryFn:  () => api.customer.getWishlist(),
    enabled:  !!session,
  });

  const removeMutation = useMutation({
    // removeFromWishlist expects the tenantId (the Tenant document's _id),
    // not the wishlist subdocument's own _id.
    mutationFn: (tenantId: string) => api.customer.removeFromWishlist(tenantId),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: wishlistKeys.list() }); toast('Removed from saved places.', 'info'); },
    onError:    (err: ApiError) => toast(err.message ?? 'Failed to remove.', 'error'),
  });

  // Each entry is: { _id, savedAt, notes, tenantId: { _id, name, slug, type,
  // coverImage, address, ratings, baseRate } } — populated by the backend.
  const all = (wishlist as Record<string, unknown>[] | undefined) ?? [];

  return (
    <div data-page>
      <h1 data-page-title>Saved places</h1>
      <p data-page-subtitle>Properties you&apos;ve saved for later</p>

      {isLoading ? <SkeletonLoader rows={4} /> : all.length === 0 ? (
        <EmptyState
          title="No saved places yet"
          description="Tap the heart icon on any property to save it here."
          action={<Link href="/accommodation" data-btn-primary>Browse accommodation</Link>}
        />
      ) : (
        <div data-property-list>
          {all.map((entry) => {
            // The tenant object is nested under `tenantId` after population.
            const tenant = (entry['tenantId'] ?? {}) as Record<string, unknown>;
            const tenantId  = tenant['_id'] as string;
            const name      = tenant['name'] as string | undefined;
            const slug      = tenant['slug'] as string | undefined;
            const type      = tenant['type'] as string | undefined;
            const cover     = tenant['coverImage'] as string | undefined;
            const address   = (tenant['address'] ?? {}) as Record<string, unknown>;
            const city      = address['city'] as string | undefined;
            const ratings   = (tenant['ratings'] ?? {}) as Record<string, unknown>;
            const rating    = ratings['overall'] as number | undefined;
            const baseRate  = tenant['baseRate'] as number | null | undefined;

            if (!slug) return null; // guard against unpopulated entries

            return (
              <div key={tenantId ?? (entry['_id'] as string)} data-property-card data-property-list-item>
                <div data-property-card-image>
                  <img
                    src={cover ?? `/images/properties/${slug}-thumb.jpg`}
                    alt={name ?? 'Property'}
                    loading="lazy"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                  {type && <span data-property-type-badge>{type.replace(/_/g, ' ')}</span>}
                  <button
                    type="button"
                    data-property-card-wishlist
                    data-saved=""
                    aria-label="Remove from saved"
                    onClick={() => removeMutation.mutate(tenantId)}
                  >
                    <Icons.Heart size={16} fill="currentColor" />
                  </button>
                </div>
                <div data-property-card-body>
                  <div data-property-card-header>
                    <Link
                      href={`/accommodation/${slug}`}
                      data-property-card-name
                      style={{ textDecoration: 'none' }}
                    >
                      {name}
                    </Link>
                    {typeof rating === 'number' && rating > 0 && (
                      <span data-property-card-rating>
                        <Icons.Star size={14} fill="currentColor" /> {rating.toFixed(1)}
                      </span>
                    )}
                  </div>
                  {city && (
                    <div data-property-card-location>
                      <Icons.MapPin size={14} /> {city}
                    </div>
                  )}
                  <div data-property-card-pricing>
                    <div>
                      {typeof baseRate === 'number' ? (
                        <>
                          <span data-property-rate>R{baseRate.toLocaleString()}</span>
                          <span data-property-rate-label> / night</span>
                        </>
                      ) : (
                        <span data-property-rate>Contact for rate</span>
                      )}
                    </div>
                    <Link
                      href={`/accommodation/${slug}`}
                      data-btn-primary
                      style={{ padding: 'var(--space-2) var(--space-4)', fontSize: '13px' }}
                    >
                      View
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
