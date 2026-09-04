'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams, useRouter } from 'next/navigation';
import { api } from '@stayos/api-client';
import { MapPin, Map, ArrowRight, Search as SearchIcon, Star, Check, SlidersHorizontal, ArrowUpDown, ChevronDown } from 'lucide-react';
import { PublicHeader, PublicFooter } from '@/components/PublicLayout';
import PageBanner from '@/components/PageBanner';

type FilterType = 'all'|'hotel'|'guesthouse'|'student_housing'|'apartment'|'lodge';
const TYPE_LABELS: Record<FilterType,string> = { all:'All', hotel:'Hotels', guesthouse:'Guesthouses', student_housing:'Student Housing', apartment:'Apartments', lodge:'Lodges' };

const SORT_OPTIONS: [string, string][] = [
  ['recommended', 'Recommended'],
  ['rating', 'Highest rated'],
  ['price_asc', 'Price: low → high'],
  ['price_desc', 'Price: high → low'],
];

// "View details" (and "Apply now") always stay within the public site first —
// the property page itself is what sends non-student bookings to customer-portal
// login, via its own "Book now" CTA. Search results should never redirect
// straight to the customer app.
function ctaHref(p: Record<string,unknown>): string {
  const slug = p['slug'] as string;
  return (p['type'] as string) === 'student_housing' ? `/property/${slug}/apply` : `/property/${slug}`;
}

function SearchContent(): React.ReactElement {
  const router = useRouter();
  const sp     = useSearchParams();

  const [city, setCity]         = useState(sp.get('city') ?? '');
  const [checkIn, setCheckIn]   = useState(sp.get('checkIn') ?? '');
  const [checkOut, setCheckOut] = useState(sp.get('checkOut') ?? '');
  const [type, setType]         = useState<FilterType>((sp.get('type') as FilterType) ?? 'all');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [sort, setSort]         = useState('recommended');
  const [openMenu, setOpenMenu] = useState<'filter'|'sort'|null>(null);

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
      {/* Search bar */}
      <section style={{ background:'var(--color-surface)', borderBottom:'1px solid var(--color-border)', padding:'var(--space-5) var(--page-padding-x)' }}>
        <form onSubmit={handleSearch} style={{ maxWidth:'var(--content-max-width)', margin:'0 auto' }}>
          <div data-cols-search-bar style={{ gap:'var(--space-3)', alignItems:'flex-end' }}>
            <div data-form-group>
              <label htmlFor="sc">Destination</label>
              <input id="sc" type="text" placeholder="City or property name" value={city} onChange={(e) => setCity(e.target.value)} />
            </div>
            <div data-form-group>
              <label htmlFor="sci">Check-in</label>
              <input id="sci" type="date" value={checkIn} min={new Date().toISOString().split('T')[0]} onChange={(e) => setCheckIn(e.target.value)} />
            </div>
            <div data-form-group>
              <label htmlFor="sco">Check-out</label>
              <input id="sco" type="date" value={checkOut} min={checkIn||new Date().toISOString().split('T')[0]} onChange={(e) => setCheckOut(e.target.value)} />
            </div>
            <button type="submit" data-btn-primary>Search <ArrowRight size={16} aria-hidden="true" /></button>
          </div>
        </form>
      </section>

      <div data-container style={{ paddingTop:'var(--space-6)', paddingBottom:'var(--space-16)' }}>

        {/* Filter / sort bar */}
        <div style={{ display:'flex', gap:'var(--space-3)', marginBottom:'var(--space-6)', position:'relative', zIndex:20 }}>
          <div style={{ position:'relative' }}>
            <button type="button" data-btn-secondary
              onClick={() => setOpenMenu(openMenu==='filter' ? null : 'filter')}
              style={{ display:'inline-flex', alignItems:'center', gap:'var(--space-2)' }}>
              <SlidersHorizontal size={16} aria-hidden="true" />
              Filter{(type!=='all' || minPrice || maxPrice) ? ' •' : ''}
              <ChevronDown size={14} aria-hidden="true" />
            </button>
            {openMenu==='filter' && (
              <div style={{ position:'absolute', top:'calc(100% + var(--space-2))', left:0, width:'min(320px, 88vw)', background:'var(--color-surface)', border:'1px solid var(--color-border)', borderRadius:'var(--radius-lg)', boxShadow:'var(--shadow-lg)', padding:'var(--space-5)' }}>
                <strong style={{ display:'block', fontSize:'var(--text-sm)', fontWeight:'var(--font-bold)', marginBottom:'var(--space-3)' }}>Property type</strong>
                {(Object.entries(TYPE_LABELS) as [FilterType,string][]).map(([t,label]) => (
                  <label key={t} data-checkbox-label style={{ marginBottom:'var(--space-2)', cursor:'pointer' }}>
                    <input type="radio" name="type" checked={type===t} onChange={() => setType(t)} style={{ accentColor:'var(--color-primary)' }} />
                    {label}
                  </label>
                ))}

                <strong style={{ display:'block', fontSize:'var(--text-sm)', fontWeight:'var(--font-bold)', margin:'var(--space-4) 0 var(--space-3)' }}>Price / night</strong>
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

                <button type="button" data-btn-primary data-btn-full style={{ marginTop:'var(--space-4)' }}
                  onClick={() => setOpenMenu(null)}>
                  Show results
                </button>
              </div>
            )}
          </div>

          <div style={{ position:'relative' }}>
            <button type="button" data-btn-secondary
              onClick={() => setOpenMenu(openMenu==='sort' ? null : 'sort')}
              style={{ display:'inline-flex', alignItems:'center', gap:'var(--space-2)' }}>
              <ArrowUpDown size={16} aria-hidden="true" />
              Sort
              <ChevronDown size={14} aria-hidden="true" />
            </button>
            {openMenu==='sort' && (
              <div style={{ position:'absolute', top:'calc(100% + var(--space-2))', left:0, width:'min(240px, 88vw)', background:'var(--color-surface)', border:'1px solid var(--color-border)', borderRadius:'var(--radius-lg)', boxShadow:'var(--shadow-lg)', padding:'var(--space-5)' }}>
                {SORT_OPTIONS.map(([v,l]) => (
                  <label key={v} data-checkbox-label style={{ marginBottom:'var(--space-2)', cursor:'pointer' }}>
                    <input type="radio" name="sort" checked={sort===v}
                      onChange={() => { setSort(v); setOpenMenu(null); }}
                      style={{ accentColor:'var(--color-primary)' }} />
                    {l}
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Backdrop — closes an open dropdown on outside click */}
        {openMenu && (
          <div onClick={() => setOpenMenu(null)} aria-hidden="true"
            style={{ position:'fixed', inset:0, zIndex:10 }} />
        )}

        {/* Results */}
        <div>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'var(--space-5)' }}>
            <span style={{ fontSize:'var(--text-sm)', color:'var(--color-text-secondary)' }}>
              {isLoading ? 'Searching…' : <><strong>{properties.length}</strong> properties found{city ? ` in ${city}` : ''}</>}
            </span>
            <a href="#" style={{ fontSize:'var(--text-sm)', color:'var(--color-primary)', fontWeight:'var(--font-medium)', display:'inline-flex', alignItems:'center', gap:'var(--space-1)' }}><Map size={16} aria-hidden="true" /> Map view</a>
          </div>

          {isLoading ? (
            <div style={{ display:'flex', flexDirection:'column', gap:'var(--space-4)' }}>
              {[1,2,3].map((i) => <div key={i} style={{ height:200, background:'var(--color-surface-muted)', borderRadius:'var(--radius-lg)' }} />)}
            </div>
          ) : properties.length===0 ? (
            <div style={{ textAlign:'center', padding:'var(--space-20)', background:'var(--color-surface)', borderRadius:'var(--radius-xl)', border:'1px solid var(--color-border)' }}>
              <div style={{ marginBottom:'var(--space-4)', color:'var(--color-text-muted)', display:'flex', justifyContent:'center' }}><SearchIcon size={48} /></div>
              <h3 style={{ fontSize:'var(--text-xl)', fontWeight:'var(--font-bold)', marginBottom:'var(--space-2)' }}>No properties found</h3>
              <p style={{ color:'var(--color-text-secondary)' }}>Try a different location or adjust your filters.</p>
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:'var(--space-4)' }}>
              {properties.map((item) => {
                const p          = item as Record<string,unknown>;
                const isStudent  = (p['type'] as string)==='student_housing';
                const address    = p['address'] as Record<string,unknown> | undefined;
                const ratings    = p['ratings'] as Record<string,unknown> | undefined;
                const fromRate   = p['fromRate'] as number | null | undefined;
                return (
                  <div key={p['_id'] as string} data-card data-cols-media-md>
                    <div style={{ position:'relative', background:'var(--color-surface-muted)', overflow:'hidden', minHeight:200 }}>
                      <img src={`/images/properties/${p['slug'] as string}-main.jpg`} alt={p['name'] as string}
                        style={{ width:'100%', height:'100%', objectFit:'cover' }} loading="lazy"
                        onError={(e) => { (e.target as HTMLImageElement).style.display='none'; }} />
                      <span data-property-type-badge>{(p['type'] as string)?.replace(/_/g,' ')}</span>
                      {Boolean(p['discountPercent']) && <span data-property-card-discount>{p['discountPercent'] as number}% OFF</span>}
                    </div>
                    <div style={{ padding:'var(--space-5)', display:'flex', flexDirection:'column', gap:'var(--space-3)' }}>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                        <h3 style={{ fontSize:'var(--text-lg)', fontWeight:'var(--font-bold)', lineHeight:'var(--leading-snug)' }}>{p['name'] as string}</h3>
                        {Boolean(ratings?.['overall']) && <span style={{ display:'flex', alignItems:'center', gap:4, fontSize:'var(--text-sm)', fontWeight:'var(--font-bold)', flexShrink:0 }}><Star size={14} fill="currentColor" aria-hidden="true" /> {(ratings?.['overall'] as number).toFixed(1)} <span style={{ color:'var(--color-text-muted)', fontWeight:'normal' }}>({ratings?.['totalReviews'] as number ?? 0})</span></span>}
                      </div>
                      <div style={{ fontSize:'var(--text-sm)', color:'var(--color-text-secondary)', display:'flex', alignItems:'center', gap:4 }}><MapPin size={14} aria-hidden="true" /> {[address?.['city'], address?.['province']].filter(Boolean).join(', ') || 'South Africa'}</div>
                      <div style={{ display:'flex', flexWrap:'wrap', gap:'var(--space-3)' }}>
                        {((p['amenities'] as string[]) ?? []).slice(0,4).map((a) => (
                          <span key={a} style={{ fontSize:'var(--text-xs)', color:'var(--color-text-secondary)', display:'flex', alignItems:'center', gap:4 }}><Check size={12} aria-hidden="true" /> {a}</span>
                        ))}
                      </div>
                      {Boolean(p['freeCancellation']) && <span data-property-tag="free_cancellation">Free cancellation</span>}
                      {Boolean(p['breakfastIncluded']) && <span data-property-tag="breakfast">Breakfast included</span>}
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'end', marginTop:'auto' }}>
                        <div>
                          {!isStudent && (
                            fromRate != null ? <>
                              <div style={{ fontSize:'var(--text-xs)', color:'var(--color-text-muted)' }}>From</div>
                              <span data-property-rate>R{fromRate.toLocaleString()}</span>
                              <span data-property-rate-label> / night</span>
                              {nights>0 && <div data-property-rate-total>Total R{(fromRate*nights).toLocaleString()} for {nights} night{nights!==1?'s':''}<br/>Includes taxes and fees</div>}
                            </> : <span style={{ fontSize:'var(--text-sm)', color:'var(--color-text-muted)' }}>Price on request</span>
                          )}
                        </div>
                        <Link href={ctaHref(p)} data-btn-primary style={{ whiteSpace:'nowrap' }}>
                          {isStudent ? 'Apply now' : 'View details'}
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default function SearchPage(): React.ReactElement {
  return (
    <>
      <PublicHeader activePage="/search" />
      <PageBanner
        label="Search"
        heading="Find your next stay."
        sub="Search hotels, guesthouses, student housing and apartments across South Africa."
      />
      <Suspense fallback={<div style={{ padding: 'var(--space-16)', textAlign: 'center' }}>Searching properties…</div>}>
        <SearchContent />
      </Suspense>
      <PublicFooter />
    </>
  );
}

