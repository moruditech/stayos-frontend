'use client';
import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from '@stayos/auth';
import { api } from '@stayos/api-client';
import type { ApiError } from '@stayos/api-client';
import { SkeletonLoader, EmptyState, useToast } from '@stayos/ui';

const WISHLIST_KEYS = { list: () => ['customer','wishlist'] as const };

export default function WishlistPage(): React.ReactElement {
  const session   = useSession();
  const qc        = useQueryClient();
  const { toast } = useToast();

  const { data: wishlist, isLoading } = useQuery({
    queryKey: WISHLIST_KEYS.list(),
    queryFn:  () => api.customer.getWishlist(),
    enabled:  !!session,
  });

  const removeMutation = useMutation({
    mutationFn: (propertyId: string) => api.customer.removeFromWishlist(propertyId),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: WISHLIST_KEYS.list() }); toast('Removed from saved places.', 'info'); },
    onError:    (err: ApiError) => toast(err.message ?? 'Failed to remove.', 'error'),
  });

  const all = (wishlist as Record<string,unknown>[] | undefined) ?? [];

  return (
    <div data-page>
      <h1 data-page-title>Saved places</h1>
      <p data-page-subtitle>Properties you&apos;ve saved for later</p>

      {isLoading ? <SkeletonLoader rows={4} /> : all.length === 0 ? (
        <EmptyState
          title="No saved places yet"
          description="Tap the heart icon on any property to save it here."
          action={<a href="/accommodation" data-btn-primary>Browse accommodation</a>}
        />
      ) : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(280px, 1fr))', gap:'var(--space-5)' }}>
          {all.map((item) => {
            const p = item as Record<string,unknown>;
            const rating = p['rating'] as number | undefined;
            return (
              <div key={p['_id'] as string} data-property-card>
                <div data-property-card-image>
                  {/* /images/properties/[slug]-thumb.jpg */}
                  <img src={`/images/properties/${p['slug'] as string}-thumb.jpg`} alt={p['name'] as string}
                    loading="lazy" style={{ width:'100%', height:'100%', objectFit:'cover' }}
                    onError={(e) => { (e.target as HTMLImageElement).style.display='none'; }} />
                  <span data-property-type-badge>{(p['type'] as string)?.replace(/_/g,' ')}</span>
                  <button type="button" data-property-card-wishlist data-saved=""
                    aria-label="Remove from saved"
                    onClick={() => removeMutation.mutate(p['_id'] as string)}>
                    ♥
                  </button>
                </div>
                <div data-property-card-body>
                  <div data-property-card-header>
                    <a href={`/accommodation/${p['slug'] as string}`} data-property-card-name style={{ textDecoration:'none' }}>
                      {p['name'] as string}
                    </a>
                    {rating && <span data-property-card-rating>★ {rating.toFixed(1)}</span>}
                  </div>
                  <div data-property-card-location>📍 {p['city'] as string}</div>
                  <div data-property-card-pricing>
                    <div>
                      <span data-property-rate>R{((p['baseRate'] as number) ?? 0).toLocaleString()}</span>
                      <span data-property-rate-label> / night</span>
                    </div>
                    <a href={`/accommodation/${p['slug'] as string}`} data-btn-primary style={{ padding:'var(--space-2) var(--space-4)', fontSize:'var(--text-sm)' }}>
                      View
                    </a>
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
