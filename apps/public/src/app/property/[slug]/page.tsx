'use client';
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@stayos/api-client';
import { PublicHeader, PublicFooter } from '@/components/PublicLayout';
import { SkeletonLoader } from '@stayos/ui';

interface Props { params: { slug: string } }

const CUSTOMER_PORTAL = process.env['NEXT_PUBLIC_CUSTOMER_PORTAL_URL'] ?? 'https://my.stayos.co.za';

export default function PublicPropertyPage({ params }: Props): React.ReactElement {
  const [checkIn, setCheckIn]   = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [guests, setGuests]     = useState(1);
  const [reviewPage]            = useState(1);

  const { data: property, isLoading: propLoading } = useQuery({
    queryKey: ['public','property', params.slug],
    queryFn:  () => api.discovery.getProperty(params.slug),
  });

  const { data: rooms } = useQuery({
    queryKey: ['public','property', params.slug,'rooms'],
    queryFn:  () => api.discovery.getPropertyRooms(params.slug),
    enabled:  !!property,
  });

  const { data: reviews } = useQuery({
    queryKey: ['public','property', params.slug,'reviews', reviewPage],
    queryFn:  () => api.discovery.getPropertyReviews(params.slug, reviewPage),
    enabled:  !!property,
  });

  if (propLoading) return (
    <>
      <PublicHeader />
      <div data-container style={{ padding:'var(--space-12) var(--page-padding-x)' }}><SkeletonLoader rows={6} /></div>
      <PublicFooter />
    </>
  );

  const p = property as Record<string,unknown> | undefined;
  if (!p) return (
    <>
      <PublicHeader />
      <div data-container style={{ padding:'var(--space-20)', textAlign:'center' }}>
        <h1>Property not found</h1>
        <a href="/search" data-btn-primary style={{ marginTop:'var(--space-6)', display:'inline-flex' }}>Back to search</a>
      </div>
      <PublicFooter />
    </>
  );

const isStudent = (p['type'] as string) === 'student_housing';
  const roomList  = (rooms as Record<string,unknown>[] | undefined) ?? [];
  const reviewList= (reviews as Record<string,unknown>[] | undefined) ?? [];
  const nights    = (checkIn && checkOut) ? Math.ceil((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000) : 0;

  // TAD 09 §4: student_housing → Apply (no account, no redirect)
  //            all others → "Book now" → my.stayos.co.za/login?redirect=...
  function bookHref(roomId?: string): string {
    let path = '/accommodation/' + params.slug + '/book';
    if (roomId) path += '?room=' + roomId;
    if (checkIn) path += (roomId ? '&' : '?') + 'checkIn=' + checkIn;
    if (checkOut) path += (roomId || checkIn ? '&' : '?') + 'checkOut=' + checkOut;
    return CUSTOMER_PORTAL + '/login?redirect=' + encodeURIComponent(path);
  }
  
  return (
    <>
      <PublicHeader />

      {/* Breadcrumb */}
      <div data-container style={{ padding:'var(--space-4) var(--page-padding-x) 0' }}>
        <nav style={{ display:'flex', gap:'var(--space-2)', fontSize:'var(--text-sm)', color:'var(--color-text-muted)' }}>
          <a href="/" data-link>Home</a> <span>›</span>
          <a href="/search" data-link>Search</a> <span>›</span>
          <span style={{ color:'var(--color-text-primary)' }}>{p['name'] as string}</span>
        </nav>
      </div>

      {/* Photo grid */}
      <div data-container style={{ padding:'var(--space-5) var(--page-padding-x)' }}>
        <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr', gridTemplateRows:'1fr 1fr', gap:'var(--space-2)', borderRadius:'var(--radius-xl)', overflow:'hidden', maxHeight:480 }}>
          {[0,1,2,3,4].map((i) => (
            <div key={i} style={{ gridRow: i===0?'1/3':'auto', background:'var(--color-surface-muted)', overflow:'hidden' }}>
              {/* /images/properties/[slug]-[i].jpg */}
              <img src={`/images/properties/\( {params.slug}- \){i}.jpg`} alt=""
                style={{ width:'100%', height:'100%', objectFit:'cover' }}
                loading={i===0?'eager':'lazy'}
                onError={(e) => { (e.target as HTMLImageElement).style.display='none'; }} />
            </div>
          ))}
        </div>
      </div>

      {/* Main content */}
      <div data-container style={{ padding:'0 var(--page-padding-x) var(--space-16)' }}>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 360px', gap:'var(--space-10)', alignItems:'flex-start' }}>

          {/* ── Left: property info ───────────────────────────────────── */}
          <div>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'var(--space-4)', flexWrap:'wrap', gap:'var(--space-3)' }}>
              <div>
                <span data-property-type-badge style={{ position:'static', display:'inline-block', marginBottom:'var(--space-2)' }}>
                  {(p['type'] as string)?.replace(/_/g,' ')}
                </span>
                <h1 style={{ fontSize:'var(--text-3xl)', fontWeight:'var(--font-bold)', lineHeight:'var(--leading-tight)', marginBottom:'var(--space-2)' }}>
                  {p['name'] as string}
                </h1>
                <div style={{ display:'flex', gap:'var(--space-5)', fontSize:'var(--text-sm)', color:'var(--color-text-secondary)', flexWrap:'wrap' }}>
                  <span>📍 {p['city'] as string}, {p['province'] as string ?? 'South Africa'}</span>
                  {p['rating'] && (
                    <span style={{ display:'flex', gap:'var(--space-1)', color:'var(--color-text-primary)', fontWeight:'var(--font-semibold)' }}>
                      ★ {(p['rating'] as number).toFixed(1)}
                      <span style={{ color:'var(--color-text-muted)', fontWeight:'normal' }}>({p['reviewCount'] as number ?? 0} reviews)</span>
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Key amenities */}
            {(p['amenities'] as string[])?.length > 0 && (
              <div style={{ display:'flex', flexWrap:'wrap', gap:'var(--space-3)', padding:'var(--space-5)', background:'var(--color-surface)', border:'1px solid var(--color-border)', borderRadius:'var(--radius-lg)', marginBottom:'var(--space-6)' }}>
                {(p['amenities'] as string[]).map((a) => (
                  <span key={a} style={{ fontSize:'var(--text-sm)', color:'var(--color-text-secondary)', display:'flex', gap:4 }}>✓ {a}</span>
                ))}
              </div>
            )}

            {/* Description */}
            {p['description'] && (
              <div style={{ marginBottom:'var(--space-8)' }}>
                <h2 style={{ fontSize:'var(--text-xl)', fontWeight:'var(--font-bold)', marginBottom:'var(--space-3)' }}>About this property</h2>
                <p style={{ fontSize:'var(--text-base)', color:'var(--color-text-secondary)', lineHeight:'var(--leading-relaxed)' }}>
                  {p['description'] as string}
                </p>
              </div>
            )}

            {/* Policies */}
            {p['policies'] && (
              <div style={{ marginBottom:'var(--space-8)', padding:'var(--space-5)', background:'var(--color-surface-muted)', borderRadius:'var(--radius-lg)' }}>
                <h2 style={{ fontSize:'var(--text-base)', fontWeight:'var(--font-bold)', marginBottom:'var(--space-3)' }}>Policies</h2>
                <p style={{ fontSize:'var(--text-sm)', color:'var(--color-text-secondary)', lineHeight:'var(--leading-relaxed)' }}>
                  {p['policies'] as string}
                </p>
              </div>
            )}

            {/* Rooms */}
            {roomList.length > 0 && (
              <div style={{ marginBottom:'var(--space-8)' }}>
                <h2 style={{ fontSize:'var(--text-xl)', fontWeight:'var(--font-bold)', marginBottom:'var(--space-5)' }}>
                  {isStudent ? 'Available rooms' : 'Room types'}
                </h2>
                <div style={{ display:'flex', flexDirection:'column', gap:'var(--space-4)' }}>
                  {roomList.map((room) => {
                    const r    = room as Record<string,unknown>;
                    const rate = r['baseRate'] as number ?? 0;
                    return (
                      <div key={r['_id'] as string} data-card>
                        <div style={{ display:'grid', gridTemplateColumns:'180px 1fr' }}>
                          <div style={{ background:'var(--color-surface-muted)', overflow:'hidden', minHeight:140 }}>
                            {/* /images/rooms/[roomId]-thumb.jpg */}
                            <img src={`/images/rooms/${r['_id'] as string}-thumb.jpg`} alt={r['name'] as string}
                              style={{ width:'100%', height:'100%', objectFit:'cover' }}
                              loading="lazy" onError={(e) => { (e.target as HTMLImageElement).style.display='none'; }} />
                          </div>
                          <div style={{ padding:'var(--space-4)', display:'flex', flexDirection:'column', gap:'var(--space-2)' }}>
                            <div style={{ fontWeight:'var(--font-bold)', fontSize:'var(--text-base)' }}>{r['name'] as string}</div>
                            <div style={{ fontSize:'var(--text-xs)', color:'var(--color-text-secondary)', display:'flex', gap:'var(--space-4)' }}>
                              <span>🛏 {r['bedCount'] as number ?? 1} bed{(r['bedCount'] as number)!==1?'s':''}</span>
                              <span>👤 Up to {r['capacity'] as number ?? 1}</span>
                            </div>
                            {r['amenities'] && (
                              <div style={{ display:'flex', flexWrap:'wrap', gap:'var(--space-2)' }}>
                                {((r['amenities'] as string[]) ?? []).slice(0,3).map((a) => (
                                  <span key={a} style={{ fontSize:'var(--text-xs)', color:'var(--color-text-secondary)' }}>✓ {a}</span>
                                ))}
                              </div>
                            )}
                            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:'auto' }}>
                              <div>
                                {!isStudent && (
                                  <>
                                    <span data-property-rate>R{rate.toLocaleString()}</span>
                                    <span data-property-rate-label> / night</span>
                                  </>
                                )}
                              </div>
                              {isStudent ? (
                                <a href={`/property/${params.slug}/apply`} data-btn-primary style={{ padding:'var(--space-2) var(--space-4)' }}>
                                  Apply now
                                </a>
                              ) : (
                                <a href={bookHref(r['_id'] as string)} data-btn-primary style={{ padding:'var(--space-2) var(--space-4)' }}>
                                  Book now
                                </a>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Reviews */}
            {reviewList.length > 0 && (
              <div>
                <h2 style={{ fontSize:'var(--text-xl)', fontWeight:'var(--font-bold)', marginBottom:'var(--space-5)' }}>Guest reviews</h2>
                <div style={{ display:'flex', flexDirection:'column', gap:'var(--space-4)' }}>
                  {reviewList.slice(0,5).map((rev) => {
                    const r = rev as Record<string,unknown>;
                    return (
                      <div key={r['_id'] as string} data-card-padded>
                        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'var(--space-2)' }}>
                          <span style={{ fontWeight:'var(--font-semibold)', fontSize:'var(--text-sm)' }}>{r['guestName'] as string ?? 'Guest'}</span>
                          <span style={{ fontSize:'var(--text-sm)', color:'var(--color-text-muted)' }}>★ {r['rating'] as number ?? 5}</span>
                        </div>
                        <p style={{ fontSize:'var(--text-sm)', color:'var(--color-text-secondary)', lineHeight:'var(--leading-relaxed)' }}>{r['comment'] as string}</p>
                        <div style={{ fontSize:'var(--text-xs)', color:'var(--color-text-muted)', marginTop:'var(--space-2)' }}>
                          {new Date(r['createdAt'] as string).toLocaleDateString('en-ZA', { month:'long', year:'numeric' })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* ── Right: CTA panel ─────────────────────────────────────── */}
          <div data-card-padded style={{ position:'sticky', top:80 }}>
            {isStudent ? (
              <>
                <h3 style={{ fontSize:'var(--text-lg)', fontWeight:'var(--font-bold)', marginBottom:'var(--space-2)' }}>Apply for accommodation</h3>
                <p style={{ fontSize:'var(--text-sm)', color:'var(--color-text-secondary)', marginBottom:'var(--space-5)', lineHeight:'var(--leading-relaxed)' }}>
                  No account required. Complete the application form and submit your documents.
                </p>
                <a href={`/property/${params.slug}/apply`} data-btn-primary data-btn-full>
                  Apply now →
                </a>
                <p style={{ fontSize:'var(--text-xs)', color:'var(--color-text-muted)', marginTop:'var(--space-3)', textAlign:'center' }}>
                  Applications are free to submit
                </p>
              </>
            ) : (
              <>
                <div style={{ marginBottom:'var(--space-4)' }}>
                  <div style={{ fontSize:'var(--text-xs)', color:'var(--color-text-muted)' }}>From</div>
                  <span data-property-rate style={{ fontSize:'var(--text-3xl)' }}>
                    R{((p['baseRate'] as number) ?? 0).toLocaleString()}
                  </span>
                  <span data-property-rate-label> / night</span>
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:'var(--space-3)', marginBottom:'var(--space-4)' }}>
                  <div data-form-group>
                    <label htmlFor="pp-ci">Check-in</label>
                    <input id="pp-ci" type="date" value={checkIn}
                      min={new Date().toISOString().split('T')[0]}
                      onChange={(e) => setCheckIn(e.target.value)} />
                  </div>
                  <div data-form-group>
                    <label htmlFor="pp-co">Check-out</label>
                    <input id="pp-co" type="date" value={checkOut}
                      min={checkIn||new Date().toISOString().split('T')[0]}
                      onChange={(e) => setCheckOut(e.target.value)} />
                  </div>
                  <div data-form-group>
                    <label htmlFor="pp-guests">Guests</label>
                    <select id="pp-guests" value={guests} onChange={(e) => setGuests(Number(e.target.value))}>
                      {[1,2,3,4,5,6].map((n) => <option key={n} value={n}>{n} guest{n!==1?'s':''}</option>)}
                    </select>
                  </div>
                </div>
                {nights > 0 && (
                  <div style={{ padding:'var(--space-3)', background:'var(--color-surface-muted)', borderRadius:'var(--radius-md)', marginBottom:'var(--space-4)', fontSize:'var(--text-sm)' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'var(--space-2)' }}>
                      <span>R{((p['baseRate'] as number)??0).toLocaleString()} × {nights} night{nights!==1?'s':''}</span>
                      <span>R{(((p['baseRate'] as number)??0)*nights).toLocaleString()}</span>
                    </div>
                    <div style={{ display:'flex', justifyContent:'space-between', fontWeight:'var(--font-bold)' }}>
                      <span>Total (indicative)</span>
                      <span>R{(((p['baseRate'] as number)??0)*nights*1.15).toLocaleString()}</span>
                    </div>
                  </div>
                )}
                <a href={bookHref()} data-btn-primary data-btn-full>Book now →</a>
                <p style={{ fontSize:'var(--text-xs)', color:'var(--color-text-muted)', textAlign:'center', marginTop:'var(--space-3)' }}>
                  You won&apos;t be charged yet
                </p>
              </>
            )}
            <div style={{ marginTop:'var(--space-5)', paddingTop:'var(--space-5)', borderTop:'1px solid var(--color-border)', fontSize:'var(--text-xs)', color:'var(--color-text-muted)', textAlign:'center' }}>
              🛡 Secure & trusted · 📅 Free cancellation on select rooms
            </div>
          </div>
        </div>
      </div>
      <PublicFooter />
    </>
  );
}'use client';
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@stayos/api-client';
import { PublicHeader, PublicFooter } from '@/components/PublicLayout';
import { SkeletonLoader } from '@stayos/ui';

interface Props { params: { slug: string } }

const CUSTOMER_PORTAL = process.env['NEXT_PUBLIC_CUSTOMER_PORTAL_URL'] ?? 'https://my.stayos.co.za';

export default function PublicPropertyPage({ params }: Props): React.ReactElement {
  const [checkIn, setCheckIn]   = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [guests, setGuests]     = useState(1);
  const [reviewPage]            = useState(1);

  const { data: property, isLoading: propLoading } = useQuery({
    queryKey: ['public','property', params.slug],
    queryFn:  () => api.discovery.getProperty(params.slug),
  });

  const { data: rooms } = useQuery({
    queryKey: ['public','property', params.slug,'rooms'],
    queryFn:  () => api.discovery.getPropertyRooms(params.slug),
    enabled:  !!property,
  });

  const { data: reviews } = useQuery({
    queryKey: ['public','property', params.slug,'reviews', reviewPage],
    queryFn:  () => api.discovery.getPropertyReviews(params.slug, reviewPage),
    enabled:  !!property,
  });

  if (propLoading) return (
    <>
      <PublicHeader />
      <div data-container style={{ padding:'var(--space-12) var(--page-padding-x)' }}><SkeletonLoader rows={6} /></div>
      <PublicFooter />
    </>
  );

  const p = property as Record<string,unknown> | undefined;
  if (!p) return (
    <>
      <PublicHeader />
      <div data-container style={{ padding:'var(--space-20)', textAlign:'center' }}>
        <h1>Property not found</h1>
        <a href="/search" data-btn-primary style={{ marginTop:'var(--space-6)', display:'inline-flex' }}>Back to search</a>
      </div>
      <PublicFooter />
    </>
  );

  const isStudent = (p['type'] as string) === 'student_housing';
  const roomList  = (rooms as Record<string,unknown>[] | undefined) ?? [];
  const reviewList= (reviews as Record<string,unknown>[] | undefined) ?? [];
  const nights    = (checkIn && checkOut) ? Math.ceil((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000) : 0;

  // TAD 09 §4: student_housing → Apply (no account, no redirect)
  //            all others → "Book now" → my.stayos.co.za/login?redirect=...
  function bookHref(roomId?: string): string {
    const path = `/accommodation/\( {params.slug}/book \){roomId ? `?room=\( {roomId}` : ''} \){checkIn ? `&checkIn=\( {checkIn}` : ''} \){checkOut ? `&checkOut=${checkOut}` : ''}`;
    return `\( {CUSTOMER_PORTAL}/login?redirect= \){encodeURIComponent(path)}`;
  }

  return (
    <>
      <PublicHeader />

      {/* Breadcrumb */}
      <div data-container style={{ padding:'var(--space-4) var(--page-padding-x) 0' }}>
        <nav style={{ display:'flex', gap:'var(--space-2)', fontSize:'var(--text-sm)', color:'var(--color-text-muted)' }}>
          <a href="/" data-link>Home</a> <span>›</span>
          <a href="/search" data-link>Search</a> <span>›</span>
          <span style={{ color:'var(--color-text-primary)' }}>{p['name'] as string}</span>
        </nav>
      </div>

      {/* Photo grid */}
      <div data-container style={{ padding:'var(--space-5) var(--page-padding-x)' }}>
        <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr', gridTemplateRows:'1fr 1fr', gap:'var(--space-2)', borderRadius:'var(--radius-xl)', overflow:'hidden', maxHeight:480 }}>
          {[0,1,2,3,4].map((i) => (
            <div key={i} style={{ gridRow: i===0?'1/3':'auto', background:'var(--color-surface-muted)', overflow:'hidden' }}>
              {/* /images/properties/[slug]-[i].jpg */}
              <img src={`/images/properties/\( {params.slug}- \){i}.jpg`} alt=""
                style={{ width:'100%', height:'100%', objectFit:'cover' }}
                loading={i===0?'eager':'lazy'}
                onError={(e) => { (e.target as HTMLImageElement).style.display='none'; }} />
            </div>
          ))}
        </div>
      </div>

      {/* Main content */}
      <div data-container style={{ padding:'0 var(--page-padding-x) var(--space-16)' }}>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 360px', gap:'var(--space-10)', alignItems:'flex-start' }}>

          {/* ── Left: property info ───────────────────────────────────── */}
          <div>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'var(--space-4)', flexWrap:'wrap', gap:'var(--space-3)' }}>
              <div>
                <span data-property-type-badge style={{ position:'static', display:'inline-block', marginBottom:'var(--space-2)' }}>
                  {(p['type'] as string)?.replace(/_/g,' ')}
                </span>
                <h1 style={{ fontSize:'var(--text-3xl)', fontWeight:'var(--font-bold)', lineHeight:'var(--leading-tight)', marginBottom:'var(--space-2)' }}>
                  {p['name'] as string}
                </h1>
                <div style={{ display:'flex', gap:'var(--space-5)', fontSize:'var(--text-sm)', color:'var(--color-text-secondary)', flexWrap:'wrap' }}>
                  <span>📍 {p['city'] as string}, {p['province'] as string ?? 'South Africa'}</span>
                  {p['rating'] && (
                    <span style={{ display:'flex', gap:'var(--space-1)', color:'var(--color-text-primary)', fontWeight:'var(--font-semibold)' }}>
                      ★ {(p['rating'] as number).toFixed(1)}
                      <span style={{ color:'var(--color-text-muted)', fontWeight:'normal' }}>({p['reviewCount'] as number ?? 0} reviews)</span>
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Key amenities */}
            {(p['amenities'] as string[])?.length > 0 && (
              <div style={{ display:'flex', flexWrap:'wrap', gap:'var(--space-3)', padding:'var(--space-5)', background:'var(--color-surface)', border:'1px solid var(--color-border)', borderRadius:'var(--radius-lg)', marginBottom:'var(--space-6)' }}>
                {(p['amenities'] as string[]).map((a) => (
                  <span key={a} style={{ fontSize:'var(--text-sm)', color:'var(--color-text-secondary)', display:'flex', gap:4 }}>✓ {a}</span>
                ))}
              </div>
            )}

            {/* Description */}
            {p['description'] && (
              <div style={{ marginBottom:'var(--space-8)' }}>
                <h2 style={{ fontSize:'var(--text-xl)', fontWeight:'var(--font-bold)', marginBottom:'var(--space-3)' }}>About this property</h2>
                <p style={{ fontSize:'var(--text-base)', color:'var(--color-text-secondary)', lineHeight:'var(--leading-relaxed)' }}>
                  {p['description'] as string}
                </p>
              </div>
            )}

            {/* Policies */}
            {p['policies'] && (
              <div style={{ marginBottom:'var(--space-8)', padding:'var(--space-5)', background:'var(--color-surface-muted)', borderRadius:'var(--radius-lg)' }}>
                <h2 style={{ fontSize:'var(--text-base)', fontWeight:'var(--font-bold)', marginBottom:'var(--space-3)' }}>Policies</h2>
                <p style={{ fontSize:'var(--text-sm)', color:'var(--color-text-secondary)', lineHeight:'var(--leading-relaxed)' }}>
                  {p['policies'] as string}
                </p>
              </div>
            )}

            {/* Rooms */}
            {roomList.length > 0 && (
              <div style={{ marginBottom:'var(--space-8)' }}>
                <h2 style={{ fontSize:'var(--text-xl)', fontWeight:'var(--font-bold)', marginBottom:'var(--space-5)' }}>
                  {isStudent ? 'Available rooms' : 'Room types'}
                </h2>
                <div style={{ display:'flex', flexDirection:'column', gap:'var(--space-4)' }}>
                  {roomList.map((room) => {
                    const r    = room as Record<string,unknown>;
                    const rate = r['baseRate'] as number ?? 0;
                    return (
                      <div key={r['_id'] as string} data-card>
                        <div style={{ display:'grid', gridTemplateColumns:'180px 1fr' }}>
                          <div style={{ background:'var(--color-surface-muted)', overflow:'hidden', minHeight:140 }}>
                            {/* /images/rooms/[roomId]-thumb.jpg */}
                            <img src={`/images/rooms/${r['_id'] as string}-thumb.jpg`} alt={r['name'] as string}
                              style={{ width:'100%', height:'100%', objectFit:'cover' }}
                              loading="lazy" onError={(e) => { (e.target as HTMLImageElement).style.display='none'; }} />
                          </div>
                          <div style={{ padding:'var(--space-4)', display:'flex', flexDirection:'column', gap:'var(--space-2)' }}>
                            <div style={{ fontWeight:'var(--font-bold)', fontSize:'var(--text-base)' }}>{r['name'] as string}</div>
                            <div style={{ fontSize:'var(--text-xs)', color:'var(--color-text-secondary)', display:'flex', gap:'var(--space-4)' }}>
                              <span>🛏 {r['bedCount'] as number ?? 1} bed{(r['bedCount'] as number)!==1?'s':''}</span>
                              <span>👤 Up to {r['capacity'] as number ?? 1}</span>
                            </div>
                            {r['amenities'] && (
                              <div style={{ display:'flex', flexWrap:'wrap', gap:'var(--space-2)' }}>
                                {((r['amenities'] as string[]) ?? []).slice(0,3).map((a) => (
                                  <span key={a} style={{ fontSize:'var(--text-xs)', color:'var(--color-text-secondary)' }}>✓ {a}</span>
                                ))}
                              </div>
                            )}
                            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:'auto' }}>
                              <div>
                                {!isStudent && (
                                  <>
                                    <span data-property-rate>R{rate.toLocaleString()}</span>
                                    <span data-property-rate-label> / night</span>
                                  </>
                                )}
                              </div>
                              {isStudent ? (
                                <a href={`/property/${params.slug}/apply`} data-btn-primary style={{ padding:'var(--space-2) var(--space-4)' }}>
                                  Apply now
                                </a>
                              ) : (
                                <a href={bookHref(r['_id'] as string)} data-btn-primary style={{ padding:'var(--space-2) var(--space-4)' }}>
                                  Book now
                                </a>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Reviews */}
            {reviewList.length > 0 && (
              <div>
                <h2 style={{ fontSize:'var(--text-xl)', fontWeight:'var(--font-bold)', marginBottom:'var(--space-5)' }}>Guest reviews</h2>
                <div style={{ display:'flex', flexDirection:'column', gap:'var(--space-4)' }}>
                  {reviewList.slice(0,5).map((rev) => {
                    const r = rev as Record<string,unknown>;
                    return (
                      <div key={r['_id'] as string} data-card-padded>
                        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'var(--space-2)' }}>
                          <span style={{ fontWeight:'var(--font-semibold)', fontSize:'var(--text-sm)' }}>{r['guestName'] as string ?? 'Guest'}</span>
                          <span style={{ fontSize:'var(--text-sm)', color:'var(--color-text-muted)' }}>★ {r['rating'] as number ?? 5}</span>
                        </div>
                        <p style={{ fontSize:'var(--text-sm)', color:'var(--color-text-secondary)', lineHeight:'var(--leading-relaxed)' }}>{r['comment'] as string}</p>
                        <div style={{ fontSize:'var(--text-xs)', color:'var(--color-text-muted)', marginTop:'var(--space-2)' }}>
                          {new Date(r['createdAt'] as string).toLocaleDateString('en-ZA', { month:'long', year:'numeric' })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* ── Right: CTA panel ─────────────────────────────────────── */}
          <div data-card-padded style={{ position:'sticky', top:80 }}>
            {isStudent ? (
              <>
                <h3 style={{ fontSize:'var(--text-lg)', fontWeight:'var(--font-bold)', marginBottom:'var(--space-2)' }}>Apply for accommodation</h3>
                <p style={{ fontSize:'var(--text-sm)', color:'var(--color-text-secondary)', marginBottom:'var(--space-5)', lineHeight:'var(--leading-relaxed)' }}>
                  No account required. Complete the application form and submit your documents.
                </p>
                <a href={`/property/${params.slug}/apply`} data-btn-primary data-btn-full>
                  Apply now →
                </a>
                <p style={{ fontSize:'var(--text-xs)', color:'var(--color-text-muted)', marginTop:'var(--space-3)', textAlign:'center' }}>
                  Applications are free to submit
                </p>
              </>
            ) : (
              <>
                <div style={{ marginBottom:'var(--space-4)' }}>
                  <div style={{ fontSize:'var(--text-xs)', color:'var(--color-text-muted)' }}>From</div>
                  <span data-property-rate style={{ fontSize:'var(--text-3xl)' }}>
                    R{((p['baseRate'] as number) ?? 0).toLocaleString()}
                  </span>
                  <span data-property-rate-label> / night</span>
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:'var(--space-3)', marginBottom:'var(--space-4)' }}>
                  <div data-form-group>
                    <label htmlFor="pp-ci">Check-in</label>
                    <input id="pp-ci" type="date" value={checkIn}
                      min={new Date().toISOString().split('T')[0]}
                      onChange={(e) => setCheckIn(e.target.value)} />
                  </div>
                  <div data-form-group>
                    <label htmlFor="pp-co">Check-out</label>
                    <input id="pp-co" type="date" value={checkOut}
                      min={checkIn||new Date().toISOString().split('T')[0]}
                      onChange={(e) => setCheckOut(e.target.value)} />
                  </div>
                  <div data-form-group>
                    <label htmlFor="pp-guests">Guests</label>
                    <select id="pp-guests" value={guests} onChange={(e) => setGuests(Number(e.target.value))}>
                      {[1,2,3,4,5,6].map((n) => <option key={n} value={n}>{n} guest{n!==1?'s':''}</option>)}
                    </select>
                  </div>
                </div>
                {nights > 0 && (
                  <div style={{ padding:'var(--space-3)', background:'var(--color-surface-muted)', borderRadius:'var(--radius-md)', marginBottom:'var(--space-4)', fontSize:'var(--text-sm)' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'var(--space-2)' }}>
                      <span>R{((p['baseRate'] as number)??0).toLocaleString()} × {nights} night{nights!==1?'s':''}</span>
                      <span>R{(((p['baseRate'] as number)??0)*nights).toLocaleString()}</span>
                    </div>
                    <div style={{ display:'flex', justifyContent:'space-between', fontWeight:'var(--font-bold)' }}>
                      <span>Total (indicative)</span>
                      <span>R{(((p['baseRate'] as number)??0)*nights*1.15).toLocaleString()}</span>
                    </div>
                  </div>
                )}
                <a href={bookHref()} data-btn-primary data-btn-full>Book now →</a>
                <p style={{ fontSize:'var(--text-xs)', color:'var(--color-text-muted)', textAlign:'center', marginTop:'var(--space-3)' }}>
                  You won&apos;t be charged yet
                </p>
              </>
            )}
            <div style={{ marginTop:'var(--space-5)', paddingTop:'var(--space-5)', borderTop:'1px solid var(--color-border)', fontSize:'var(--text-xs)', color:'var(--color-text-muted)', textAlign:'center' }}>
              🛡 Secure & trusted · 📅 Free cancellation on select rooms
            </div>
          </div>
        </div>
      </div>
      <PublicFooter />
    </>
  );
}