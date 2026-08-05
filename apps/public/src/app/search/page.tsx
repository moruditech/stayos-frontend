'use client';
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams, useRouter } from 'next/navigation';
import { api } from '@stayos/api-client';
import { PublicHeader, PublicFooter } from '@/components/PublicLayout';

const CUSTOMER_PORTAL = process.env['NEXT_PUBLIC_CUSTOMER_PORTAL_URL'] ?? 'https://my.stayos.co.za';

type FilterType = 'all'|'hotel'|'guesthouse'|'student_housing'|'apartment'|'lodge';
const TYPE_LABELS: Record<FilterType,string> = { all:'All', hotel:'Hotels', guesthouse:'Guesthouses', student_housing:'Student Housing', apartment:'Apartments', lodge:'Lodges' };

// Per TAD 09 §4: student_housing → Apply (no login), others → Book via Customer Portal
function ctaHref(p: Record<string,unknown>): string {
  if ((p['type'] as string) === 'student_housing') return `/property/${p['slug'] as string}/apply`;
  const redirect = encodeURIComponent(`/accommodation/${p['slug'] as string}`);
  return `${CUSTOMER_PORTAL}/login?redirect=${redirect}`;
}

export default function SearchPage(): React.ReactElement {
  const router = useRouter();
  const sp     = useSearchParams();

  const [city, setCity]         = useState(sp.get('city') ?? '');
  const [checkIn, setCheckIn]   = useState(sp.get('checkIn') ?? '');
  const [checkOut, setCheckOut] = useState(sp.get('checkOut') ?? '');
  const [type, setType]         = useState<FilterType>((sp.get('type') as FilterType) ?? 'all');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [sort, setSort]         = useState('recommended');

  const filters: Record<string,string> = {};
  if (city)       filters['city']     = city;
  if (checkIn)    filters['checkIn']  = checkIn;
  if (checkOut)   filters['checkOut'] = checkOut;
  if (type!=='all') filters['type']   = type;
  if (minPrice)   filters['minRate']  = minPrice;
  if (maxPrice)   filters['maxRate']  = maxPrice;
  if (sort!=='recommended') filters['sort'] = sort;

  const { data: results, isLoading } = useQuery({
    queryKey: ['public','search', filters],
    queryFn:  () => api.discovery.searchProperties(filters),
  });

  const properties = (results as Record<string,unknown>[] | undefined) ?? [];
  const nights = (checkIn && checkOut) ? Math.ceil((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000) : 0;

  function handleSearch(e: React.FormEvent): void {
    e.preventDefault();
    router.replace(`/search?${new URLSearchParams(filters).toString()}`);
  }

  return (
    <>
      <PublicHeader activePage="/search" />

      {/* Search bar */}
      <section style={{ background:'var(--color-surface)', borderBottom:'1px solid var(--color-border)', padding:'var(--space-5) var(--page-padding-x)' }}>
        <form onSubmit={handleSearch} style={{ maxWidth:'var(--content-max-width)', margin:'0 auto' }}>
          <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr auto', gap:'var(--space-3)', alignItems:'flex-end' }}>
            <div data-form-group>
              <label htmlFor="sc">Destination</label>
              <input id="sc" type="text" placeholder="📍 City or property name" value={city} onChange={(e) => setCity(e.target.value)} />
            </div>
            <div data-form-group>
              <label htmlFor="sci">Check-in</label>
              <input id="sci" type="date" value={checkIn} min={new Date().toISOString().split('T')[0]} onChange={(e) => setCheckIn(e.target.value)} />
            </div>
            <div data-form-group>
              <label htmlFor="sco">Check-out</label>
              <input id="sco" type="date" value={checkOut} min={checkIn||new Date().toISOString().split('T')[0]} onChange={(e) => setCheckOut(e.target.value)} />
            </div>
            <button type="submit" data-btn-primary>Search →</button>
          </div>
        </form>
      </section>

      <div data-container style={{ paddingTop:'var(--space-8)', paddingBottom:'var(--space-16)' }}>
        <div style={{ display:'grid', gridTemplateColumns:'220px 1fr', gap:'var(--space-8)', alignItems:'flex-start' }}>

          {/* Sidebar */}
          <aside style={{ position:'sticky', top:80, display:'flex', flexDirection:'column', gap:'var(--space-6)' }}>
            <div>
              <strong style={{ display:'block', fontSize:'var(--text-sm)', fontWeight:'var(--font-bold)', marginBottom:'var(--space-3)' }}>Property type</strong>
              {(Object.entries(TYPE_LABELS) as [FilterType,string][]).map(([t,label]) => (
                <label key={t} data-checkbox-label style={{ marginBottom:'var(--space-2)', cursor:'pointer' }}>
                  <input type="radio" name="type" checked={type===t} onChange={() => setType(t)} style={{ accentColor:'var(--color-primary)' }} />
                  {label}
                </label>
              ))}
            </div>

            <div>
              <strong style={{ display:'block', fontSize:'var(--text-sm)', fontWeight:'var(--font-bold)', marginBottom:'var(--space-3)' }}>Price / night</strong>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'var(--space-2)' }}>
                <div data-form-group>
                  <label htmlFor="smin">Min</label>
                  <input id="smin" type="number" placeholder="R0" value={minPrice} onChange={(e) => setMinPrice(e.target.value)} />
                </div>
                <div data-form-group>
                  <label htmlFor="smax">Max</label>
                  <input id="smax" type="number" placeholder="Any" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} />
                </div>
              </div>
            </div>

            <div>
              <strong style={{ display:'block', fontSize:'var(--text-sm)', fontWeight:'var(--font-bold)', marginBottom:'var(--space-3)' }}>Sort by</strong>
              {[['recommended','Recommended'],['rating','Highest rated'],['price_asc','Price: low → high'],['price_desc','Price: high → low']].map(([v,l]) => (
                <label key={v} data-checkbox-label style={{ marginBottom:'var(--space-2)', cursor:'pointer' }}>
                  <input type="radio" name="sort" checked={sort===v} onChange={() => setSort(v)} style={{ accentColor:'var(--color-primary)' }} />
                  {l}
                </label>
              ))}
            </div>
          </aside>

          {/* Results */}
          <div>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'var(--space-5)' }}>
              <span style={{ fontSize:'var(--text-sm)', color:'var(--color-text-secondary)' }}>
                {isLoading ? 'Searching…' : <><strong>{properties.length}</strong> properties found{city ? ` in ${city}` : ''}</>}
              </span>
              <a href="#" style={{ fontSize:'var(--text-sm)', color:'var(--color-primary)', fontWeight:'var(--font-medium)' }}>🗺 Map view</a>
            </div>

            {isLoading ? (
              <div style={{ display:'flex', flexDirection:'column', gap:'var(--space-4)' }}>
                {[1,2,3].map((i) => <div key={i} style={{ height:200, background:'var(--color-surface-muted)', borderRadius:'var(--radius-lg)' }} />)}
              </div>
            ) : properties.length===0 ? (
              <div style={{ textAlign:'center', padding:'var(--space-20)', background:'var(--color-surface)', borderRadius:'var(--radius-xl)', border:'1px solid var(--color-border)' }}>
                <div style={{ fontSize:'var(--text-5xl)', marginBottom:'var(--space-4)' }}>🔍</div>
                <h3 style={{ fontSize:'var(--text-xl)', fontWeight:'var(--font-bold)', marginBottom:'var(--space-2)' }}>No properties found</h3>
                <p style={{ color:'var(--color-text-secondary)' }}>Try a different location or adjust your filters.</p>
              </div>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:'var(--space-4)' }}>
                {properties.map((item) => {
                  const p          = item as Record<string,unknown>;
                  const isStudent  = (p['type'] as string)==='student_housing';
                  const rate       = p['baseRate'] as number ?? 0;
                  return (
                    <div key={p['_id'] as string} data-card style={{ display:'grid', gridTemplateColumns:'280px 1fr' }}>
                      <div style={{ position:'relative', background:'var(--color-surface-muted)', overflow:'hidden', minHeight:200 }}>
                        {/* /images/properties/[slug]-main.jpg */}
                        <img src={`/images/properties/${p['slug'] as string}-main.jpg`} alt={p['name'] as string}
                          style={{ width:'100%', height:'100%', objectFit:'cover' }} loading="lazy"
                          onError={(e) => { (e.target as HTMLImageElement).style.display='none'; }} />
                        <span data-property-type-badge>{(p['type'] as string)?.replace(/_/g,' ')}</span>
                        {p['discountPercent'] && <span data-property-card-discount>{p['discountPercent'] as number}% OFF</span>}
                      </div>
                      <div style={{ padding:'var(--space-5)', display:'flex', flexDirection:'column', gap:'var(--space-3)' }}>
                        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                          <h3 style={{ fontSize:'var(--text-lg)', fontWeight:'var(--font-bold)', lineHeight:'var(--leading-snug)' }}>{p['name'] as string}</h3>
                          {p['rating'] && <span style={{ display:'flex', gap:4, fontSize:'var(--text-sm)', fontWeight:'var(--font-bold)', flexShrink:0 }}>★ {(p['rating'] as number).toFixed(1)} <span style={{ color:'var(--color-text-muted)', fontWeight:'normal' }}>({p['reviewCount'] as number ?? 0})</span></span>}
                        </div>
                        <div style={{ fontSize:'var(--text-sm)', color:'var(--color-text-secondary)' }}>📍 {p['city'] as string}{p['distanceFromCentre'] ? ` · ${p['distanceFromCentre'] as string} km from centre` : ''}</div>
                        <div style={{ display:'flex', flexWrap:'wrap', gap:'var(--space-3)' }}>
                          {((p['amenities'] as string[]) ?? []).slice(0,4).map((a) => (
                            <span key={a} style={{ fontSize:'var(--text-xs)', color:'var(--color-text-secondary)', display:'flex', gap:4 }}>✓ {a}</span>
                          ))}
                        </div>
                        {p['freeCancellation'] && <span data-property-tag="free_cancellation">Free cancellation</span>}
                        {p['breakfastIncluded'] && <span data-property-tag="breakfast">Breakfast included</span>}
                        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end', marginTop:'auto' }}>
                          <div>
                            {!isStudent && <>
                              <div style={{ fontSize:'var(--text-xs)', color:'var(--color-text-muted)' }}>From</div>
                              <span data-property-rate>R{rate.toLocaleString()}</span>
                              <span data-property-rate-label> / night</span>
                              {nights>0 && <div data-property-rate-total>Total R{(rate*nights).toLocaleString()} for {nights} night{nights!==1?'s':''}<br/>Includes taxes and fees</div>}
                            </>}
                          </div>
                          <a href={ctaHref(p)} data-btn-primary style={{ whiteSpace:'nowrap' }}>
                            {isStudent ? 'Apply now' : 'View details'}
                          </a>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      <PublicFooter />
    </>
  );
}
