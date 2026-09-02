'use client';

import Link from 'next/link';
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { api } from '@stayos/api-client';
import { SkeletonLoader, Icons } from '@stayos/ui';
import { accommodationKeys } from '@/lib/query-keys';

interface Props { params: { slug: string } }

const CUSTOMER_PORTAL = process.env['NEXT_PUBLIC_CUSTOMER_PORTAL_URL'] ?? 'https://my.stayos.co.za';

export default function PropertyDetailPage({ params }: Props): React.ReactElement {
  const router        = useRouter();
  const [checkIn, setCheckIn]   = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [guests, setGuests]     = useState(1);
  const [reviewPage] = useState(1);

  const { data: property, isLoading: propLoading } = useQuery({
    queryKey: accommodationKeys.detail(params.slug),
    queryFn:  () => api.discovery.getProperty(params.slug),
  });

  const { data: rooms } = useQuery({
    queryKey: accommodationKeys.rooms(params.slug),
    queryFn:  () => api.discovery.getPropertyRooms(params.slug),
    enabled:  !!property,
  });

  const { data: reviews } = useQuery({
    queryKey: accommodationKeys.reviews(params.slug, reviewPage),
    queryFn:  () => api.discovery.getPropertyReviews(params.slug, reviewPage),
    enabled:  !!property,
  });

  if (propLoading) return <div data-search-page><SkeletonLoader rows={6} /></div>;

  const p = property as Record<string, unknown> | undefined;
  if (!p) return <div data-search-page><p>Property not found.</p></div>;

  const isStudent = (p['type'] as string) === 'student_housing';
  const roomList  = (rooms as Record<string, unknown>[] | undefined) ?? [];
  const reviewList = (reviews as Record<string, unknown>[] | undefined) ?? [];
  const rating = p['rating'] as number | undefined;
  const description = p['description'] as string | undefined;

  // CTA per TAD 09 §4 / TAD 10 §3:
  // student_housing → "Apply now" → /accommodation/[slug]/apply (no login required)
  // all others → "Book now" → redirect to my.stayos.co.za/login?redirect=... if not authenticated
  function handleBookNow(roomId?: string): void {
    const redirectPath = `/accommodation/${params.slug}/book${roomId ? `?room=${roomId}` : ''}${checkIn ? `&checkIn=${checkIn}` : ''}${checkOut ? `&checkOut=${checkOut}` : ''}`;
    window.location.href = `${CUSTOMER_PORTAL}/login?redirect=${encodeURIComponent(redirectPath)}`;
  }

  return (
    <div data-search-page>
      <button type="button" onClick={() => router.back()}
        style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', color: 'var(--color-text-secondary)', fontSize: '13px', marginBottom: 'var(--space-4)', cursor: 'pointer' }}>
        <Icons.ChevronLeft size={16} /> Back to search
      </button>

      {/* Property hero images */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 'var(--space-2)', borderRadius: 'var(--radius-xl)', overflow: 'hidden', marginBottom: 'var(--space-6)', aspectRatio: '16/7' }}>
        {[0, 1, 2].map((i) => (
          <div key={i} style={{ background: 'var(--color-bg-sunk)', overflow: 'hidden', gridRow: i === 0 ? '1 / 3' : 'auto' }}>
            {/* Images: /images/properties/[slug]-[i].jpg */}
            <img src={`/images/properties/${params.slug}-${i}.jpg`} alt=""
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              loading={i === 0 ? 'eager' : 'lazy'}
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 'var(--space-8)' }}>
        {/* Left column — property info */}
        <div>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-4)', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
            <div>
              <span data-property-type-badge style={{ position: 'static', marginBottom: 'var(--space-2)', display: 'inline-block' }}>
                {(p['type'] as string)?.replace(/_/g, ' ')}
              </span>
              <h1 style={{ fontSize: '28px', fontWeight: '700', lineHeight: '1.15' }}>
                {p['name'] as string}
              </h1>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', marginTop: 'var(--space-2)', fontSize: '13px', color: 'var(--color-text-secondary)' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-1)' }}><Icons.MapPin size={14} /> {p['city'] as string}, {p['province'] as string}</span>
                {rating && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)', color: 'var(--color-text)', fontWeight: '600' }}>
                    <Icons.Star size={14} fill="currentColor" /> {rating.toFixed(1)}
                    <span style={{ color: 'var(--color-text-muted)', fontWeight: '400' }}>
                      ({p['reviewCount'] as number ?? 0} reviews)
                    </span>
                  </span>
                )}
              </div>
            </div>
            <button type="button" data-property-card-wishlist style={{ position: 'static', width: '44px', height: '44px', boxShadow: 'var(--shadow-raised)' }}><Icons.Heart size={18} /></button>
          </div>

          {/* Amenities */}
          {(p['amenities'] as string[])?.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-3)', marginBottom: 'var(--space-6)', padding: 'var(--space-5)', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)' }}>
              {(p['amenities'] as string[]).map((a) => (
                <span key={a} data-amenity-tag style={{ fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: 'var(--space-1)' }}><Icons.Check size={14} /> {a}</span>
              ))}
            </div>
          )}

          {/* Description */}
          {description && (
            <div style={{ marginBottom: 'var(--space-6)' }}>
              <h2 style={{ fontSize: '19px', fontWeight: '700', marginBottom: 'var(--space-3)' }}>About this property</h2>
              <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: '1.65' }}>
                {description}
              </p>
            </div>
          )}

          {/* Rooms / accommodation types */}
          {roomList.length > 0 && (
            <div style={{ marginBottom: 'var(--space-6)' }}>
              <h2 style={{ fontSize: '19px', fontWeight: '700', marginBottom: 'var(--space-4)' }}>
                {isStudent ? 'Available rooms' : 'Room types'}
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                {roomList.map((room) => (
                  <div key={room['_id'] as string} data-card>
                    <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', minHeight: '140px' }}>
                      <div style={{ background: 'var(--color-bg-sunk)', overflow: 'hidden' }}>
                        {/* Image: /images/rooms/[roomId]-thumb.jpg */}
                        <img src={`/images/rooms/${room['_id'] as string}-thumb.jpg`} alt={room['name'] as string}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          loading="lazy" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                      </div>
                      <div style={{ padding: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                        <div style={{ fontWeight: '700', fontSize: '14.5px' }}>{room['name'] as string}</div>
                        <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', display: 'flex', gap: 'var(--space-3)' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-1)' }}><Icons.Bed size={14} /> {room['bedCount'] as number ?? 1} bed{(room['bedCount'] as number) !== 1 ? 's' : ''}</span>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-1)' }}><Icons.User size={14} /> Up to {room['capacity'] as number ?? 1} guest{(room['capacity'] as number) !== 1 ? 's' : ''}</span>
                        </div>
                        <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <span data-property-rate>R{(room['baseRate'] as number ?? 0).toLocaleString()}</span>
                            <span data-property-rate-label> / night</span>
                          </div>
                          {isStudent ? (
                            <Link href={`/accommodation/${params.slug}/apply`} data-btn-primary style={{ padding: 'var(--space-2) var(--space-5)' }}>
                              Apply now
                            </Link>
                          ) : (
                            <button type="button" data-btn-primary style={{ padding: 'var(--space-2) var(--space-5)' }}
                              onClick={() => handleBookNow(room['_id'] as string)}>
                              Book now
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Reviews */}
          {reviewList.length > 0 && (
            <div>
              <h2 style={{ fontSize: '19px', fontWeight: '700', marginBottom: 'var(--space-4)' }}>
                Guest reviews
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                {reviewList.map((r) => (
                  <div key={r['_id'] as string} data-card-padded>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-2)' }}>
                      <div style={{ fontWeight: '600', fontSize: '13px' }}>{r['guestName'] as string ?? 'Guest'}</div>
                      <div style={{ fontSize: '13px', color: 'var(--color-text-muted)', display: 'inline-flex', alignItems: 'center', gap: 'var(--space-1)' }}>
                        <Icons.Star size={14} fill="currentColor" /> {r['rating'] as number ?? 5}
                      </div>
                    </div>
                    <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: '1.65' }}>
                      {r['comment'] as string}
                    </p>
                    <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: 'var(--space-2)' }}>
                      {new Date(r['createdAt'] as string).toLocaleDateString('en-ZA', { month: 'long', year: 'numeric' })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Booking / Apply CTA panel */}
        <div data-card-padded style={{ position: 'sticky', top: 'calc(var(--header-height) + var(--space-4))', alignSelf: 'flex-start' }}>
          {isStudent ? (
            <>
              <h3 style={{ fontSize: '17px', fontWeight: '700', marginBottom: 'var(--space-2)' }}>Apply for accommodation</h3>
              <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-5)' }}>
                No account required. Submit your application in minutes.
              </p>
              <Link href={`/accommodation/${params.slug}/apply`} data-btn-primary data-btn-full>Apply now →</Link>
            </>
          ) : (
            <>
              <h3 style={{ fontSize: '17px', fontWeight: '700', marginBottom: 'var(--space-4)' }}>
                From <span style={{ color: 'var(--color-primary)' }}>R{(p['baseRate'] as number ?? 0).toLocaleString()}</span> / night
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
                <div data-form-group>
                  <label htmlFor="ci-detail">Check-in</label>
                  <input id="ci-detail" type="date" value={checkIn}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={(e) => setCheckIn(e.target.value)} />
                </div>
                <div data-form-group>
                  <label htmlFor="co-detail">Check-out</label>
                  <input id="co-detail" type="date" value={checkOut}
                    min={checkIn || new Date().toISOString().split('T')[0]}
                    onChange={(e) => setCheckOut(e.target.value)} />
                </div>
                <div data-form-group>
                  <label htmlFor="guests-detail">Guests</label>
                  <select id="guests-detail" value={guests} onChange={(e) => setGuests(Number(e.target.value))}>
                    {[1, 2, 3, 4].map((n) => <option key={n} value={n}>{n} guest{n !== 1 ? 's' : ''}</option>)}
                  </select>
                </div>
              </div>
              <button type="button" data-btn-primary data-btn-full onClick={() => handleBookNow()}>Book now →</button>
              <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', textAlign: 'center', marginTop: 'var(--space-3)' }}>
                You won&apos;t be charged yet
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
