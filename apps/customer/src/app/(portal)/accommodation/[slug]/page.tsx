'use client';
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { api } from '@stayos/api-client';
import { SkeletonLoader, EmptyState, Icons } from '@stayos/ui';
import { accommodationKeys } from '@/lib/query-keys';
import { useWishlist } from '@/lib/useWishlist';
import { ImageLightbox } from '@/components/ImageLightbox';

interface Props { params: { slug: string } }

export default function PropertyDetailPage({ params }: Props): React.ReactElement {
  const slug   = params.slug;
  const router = useRouter();
  const { isSaved, toggle: toggleWishlist } = useWishlist();
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const { data: property, isLoading } = useQuery({
    queryKey: accommodationKeys.detail(slug),
    queryFn:  () => api.discovery.getProperty(slug),
  });

  const { data: rooms } = useQuery({
    queryKey: accommodationKeys.rooms(slug),
    queryFn:  () => api.discovery.getPropertyRooms(slug),
    enabled:  !!property,
  });

  const { data: reviews } = useQuery({
    queryKey: accommodationKeys.reviews(slug, 1),
    queryFn:  () => api.discovery.getPropertyReviews(slug, 1),
    enabled:  !!property,
  });

  if (isLoading) {
    return (
      <div data-page>
        <SkeletonLoader rows={6} />
      </div>
    );
  }

  if (!property) {
    return (
      <div data-page>
        <EmptyState title="Property not found"
          description="This property may have been removed or is no longer available."
          action={<button type="button" data-btn-primary onClick={() => router.push('/accommodation')}>Back to search</button>} />
      </div>
    );
  }

  const p = property as Record<string, unknown>;
  const tenantId = p['_id'] as string;
  const isStudentHousing = p['type'] === 'student_housing';
  const rating  = p['rating'] as number | undefined;
  const reviewCount = p['reviewCount'] as number | undefined;
  const baseRate = p['baseRate'] as number | null | undefined;
  const roomList = (rooms as Record<string, unknown>[] | undefined) ?? [];
  const reviewList = (reviews as Record<string, unknown>[] | undefined) ?? [];

  const gallery: string[] = [
    `/images/properties/${slug}-main.jpg`,
    `/images/properties/${slug}-2.jpg`,
    `/images/properties/${slug}-3.jpg`,
    `/images/properties/${slug}-4.jpg`,
    `/images/properties/${slug}-5.jpg`,
  ];

  function goToApply(roomId?: string): void {
    router.push(`/accommodation/${slug}/apply${roomId ? `?roomId=${roomId}` : ''}`);
  }

  function goToBook(roomId: string): void {
    router.push(`/accommodation/${slug}/book?roomId=${roomId}`);
  }

  return (
    <div data-page>
      <button type="button" data-back-link
        style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 'var(--space-1)', marginBottom: 'var(--space-4)' }}
        onClick={() => router.push('/accommodation')}>
        <Icons.ChevronLeft size={16} /> Back to search
      </button>

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 'var(--space-4)', marginBottom: 'var(--space-2)' }}>
        <div>
          <h1 data-page-title style={{ marginBottom: 'var(--space-1)' }}>{p['name'] as string}</h1>
          <div data-property-card-location>
            <Icons.MapPin size={14} /> {p['city'] as string}{p['province'] ? `, ${p['province'] as string}` : ''}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 'var(--space-2)' }}>
          <button type="button" data-property-card-wishlist data-saved={isSaved(tenantId) ? '' : undefined}
            aria-label="Save to wishlist" style={{ position: 'static' }}
            onClick={() => toggleWishlist(tenantId)}>
            <Icons.Heart size={18} fill={isSaved(tenantId) ? 'currentColor' : 'none'} />
          </button>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>From</div>
            <span data-property-rate>
              {typeof baseRate === 'number' ? `R${baseRate.toLocaleString()}` : 'Contact for rate'}
            </span>
            {typeof baseRate === 'number' && !isStudentHousing && <span data-property-rate-label> / night</span>}
          </div>
        </div>
      </div>

      {rating && (
        <div data-property-card-rating style={{ marginBottom: 'var(--space-4)' }}>
          <Icons.Star size={14} fill="currentColor" /> {rating.toFixed(1)} ({reviewCount ?? 0} reviews)
        </div>
      )}

      {/* Photo gallery — click any tile for the full interactive zoom viewer */}
      <div data-property-hero-grid>
        {gallery.slice(0, 3).map((src, i) => (
          <div key={src} data-property-hero-cell data-hero-main={i === 0 ? '' : undefined}
            onClick={() => setLightboxIndex(i)}>
            <img src={src} alt={`${p['name'] as string} photo ${i + 1}`}
              onError={(e) => { (e.target as HTMLImageElement).style.visibility = 'hidden'; }} />
          </div>
        ))}
      </div>

      {lightboxIndex !== null && (
        <ImageLightbox images={gallery} initialIndex={lightboxIndex} onClose={() => setLightboxIndex(null)} />
      )}

      {/* About */}
      {!!p['description'] && (
        <section style={{ marginBottom: 'var(--space-6)' }}>
          <h2 data-section-title style={{ marginBottom: 'var(--space-2)' }}>About this place</h2>
          <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>{p['description'] as string}</p>
        </section>
      )}

      {/* Amenities */}
      {Array.isArray(p['amenities']) && (p['amenities'] as string[]).length > 0 && (
        <section style={{ marginBottom: 'var(--space-6)' }}>
          <h2 data-section-title style={{ marginBottom: 'var(--space-2)' }}>Amenities</h2>
          <div data-property-card-amenities>
            {(p['amenities'] as string[]).map((a) => (
              <span key={a} data-amenity-tag><Icons.Check size={12} /> {a.replace(/_/g, ' ')}</span>
            ))}
          </div>
        </section>
      )}

      {/* Rooms — "Apply" (student housing) or "Book" (everything else) act
          directly on this room; no separate date-picker + Apply footer, and
          no full-page navigation (router.push keeps this an SPA transition). */}
      <section style={{ marginBottom: 'var(--space-6)' }}>
        <h2 data-section-title style={{ marginBottom: 'var(--space-3)' }}>
          {isStudentHousing ? 'Room types' : 'Available rooms'}
        </h2>
        {roomList.length === 0 ? (
          <EmptyState title="No rooms listed"
            description="This property hasn't published any room types yet." />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            {roomList.map((r) => {
              const roomId  = r['_id'] as string;
              const roomRate = r['baseRate'] as number | null | undefined;
              return (
                <div key={roomId} data-room-card-grid style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
                  <div data-room-card-image>
                    <img src={`/images/rooms/${roomId}-main.jpg`} alt={r['name'] as string}
                      onError={(e) => { (e.target as HTMLImageElement).style.visibility = 'hidden'; }} />
                  </div>
                  <div data-room-card-body>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 'var(--space-2)' }}>
                      <span style={{ fontWeight: 600, fontSize: '15px' }}>{r['name'] as string}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap', fontSize: '13px', color: 'var(--color-text-secondary)' }}>
                      <span><Icons.Users size={14} /> Up to {r['capacity'] as number ?? r['adultCapacity'] as number} guests</span>
                      {!!r['bedCount'] && <span><Icons.Bed size={14} /> {r['bedCount'] as number} bed{(r['bedCount'] as number) !== 1 ? 's' : ''}</span>}
                    </div>
                    {!!r['description'] && (
                      <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>{r['description'] as string}</p>
                    )}
                    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 'auto', paddingTop: 'var(--space-2)' }}>
                      <div>
                        <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>From</div>
                        <span data-property-rate>
                          {typeof roomRate === 'number' ? `R${roomRate.toLocaleString()}` : 'Contact for rate'}
                        </span>
                        {typeof roomRate === 'number' && !isStudentHousing && <span data-property-rate-label> / night</span>}
                      </div>
                      {isStudentHousing ? (
                        <button type="button" data-btn-primary onClick={() => goToApply(roomId)}>Apply</button>
                      ) : (
                        <button type="button" data-btn-primary onClick={() => goToBook(roomId)}>Book</button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Reviews */}
      {reviewList.length > 0 && (
        <section style={{ marginBottom: 'var(--space-6)' }}>
          <h2 data-section-title style={{ marginBottom: 'var(--space-3)' }}>Reviews</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            {reviewList.slice(0, 5).map((rev) => {
              const review = rev as Record<string, unknown>;
              const customer = review['customerId'] as Record<string, unknown> | undefined;
              return (
                <div key={review['_id'] as string} style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: 'var(--space-3)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-1)' }}>
                    <strong style={{ fontSize: '13px' }}>
                      {customer ? `${customer['firstName'] as string} ${customer['lastName'] as string}` : 'Guest'}
                    </strong>
                    {typeof review['rating'] === 'number' && (
                      <span data-property-card-rating><Icons.Star size={13} fill="currentColor" /> {(review['rating'] as number).toFixed(1)}</span>
                    )}
                  </div>
                  {!!review['comment'] && (
                    <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>{review['comment'] as string}</p>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {isStudentHousing && (
        <button type="button" data-btn-primary data-btn-full onClick={() => goToApply()}>
          Apply for this property
        </button>
      )}
    </div>
  );
}
