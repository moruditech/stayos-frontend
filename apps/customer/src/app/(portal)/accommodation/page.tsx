'use client';
import Link from 'next/link';
import React, { useState } from 'react';
import { useQuery, useQueries } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import { useSession } from '@stayos/auth';
import { api } from '@stayos/api-client';
import { SkeletonLoader, EmptyState, Icons, type LucideIcon } from '@stayos/ui';
import { accommodationKeys } from '@/lib/query-keys';
import { GuestsRoomsField, type GuestsRoomsValue } from '@/components/GuestsRoomsField';

type StayMode = 'stays' | 'student' | 'long_term';
const STAY_MODES: { id: StayMode; label: string; icon: LucideIcon }[] = [
  { id: 'stays',      label: 'Stays',            icon: Icons.Bed },
  { id: 'student',    label: 'Student Housing',  icon: Icons.GraduationCap },
  { id: 'long_term',  label: 'Long Term',        icon: Icons.Building2 },
];

type CategoryTab = 'all' | 'hotels' | 'guesthouses' | 'apartments';
const CATS: { id: CategoryTab; label: string; icon: LucideIcon }[] = [
  { id: 'all',         label: 'All',         icon: Icons.LayoutGrid },
  { id: 'hotels',      label: 'Hotels',      icon: Icons.Bed },
  { id: 'guesthouses', label: 'Guesthouses', icon: Icons.Home },
  { id: 'apartments',  label: 'Apartments',  icon: Icons.Building2 },
];

const TYPE_MAP: Record<CategoryTab, string[]> = {
  all:         [],
  hotels:      ['hotel', 'boutique_hotel'],
  guesthouses: ['guesthouse', 'bed_and_breakfast'],
  apartments:  ['apartment', 'villa', 'rental'],
};
const MODE_TYPE_MAP: Record<StayMode, string[]> = {
  stays:      [],
  student:    ['student_housing'],
  long_term:  [], // Long-term (lease-based) stays are not yet implemented — see "Coming soon" state below.
};

type SortOption = 'recommended' | 'price_asc' | 'price_desc' | 'rating_desc';
const SORT_OPTIONS: { id: SortOption; label: string }[] = [
  { id: 'recommended', label: 'Recommended' },
  { id: 'price_asc',   label: 'Price: low to high' },
  { id: 'price_desc',  label: 'Price: high to low' },
  { id: 'rating_desc', label: 'Rating' },
];

const AMENITY_OPTIONS = ['wifi', 'pool', 'breakfast', 'parking', 'gym'];

export default function AccommodationPage(): React.ReactElement {
  const session = useSession();
  const searchParams = useSearchParams();
  const [stayMode, setStayMode]   = useState<StayMode>('stays');
  const [category, setCategory] = useState<CategoryTab>('all');
  const [city, setCity]         = useState(searchParams.get('city') ?? '');
  const [checkIn, setCheckIn]   = useState(searchParams.get('checkIn') ?? '');
  const [checkOut, setCheckOut] = useState(searchParams.get('checkOut') ?? '');
  const [guestsRooms, setGuestsRooms] = useState<GuestsRoomsValue>({
    guests: Number(searchParams.get('guests')) || 1,
    rooms:  Number(searchParams.get('rooms')) || 1,
  });
  const [editingSearch, setEditingSearch] = useState(false);

  // Working filter/sort state
  const [sort, setSort] = useState<SortOption>('recommended');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [openPopover, setOpenPopover] = useState<'sort' | 'price' | 'amenities' | null>(null);

  // Long-term (lease-based) stays aren't built yet — don't hit the search
  // API for a mode that has no real backing data; show "Coming soon" instead.
  const isLongTermMode = stayMode === 'long_term';

  function clearSearch(): void {
    setCity('');
    setCheckIn('');
    setCheckOut('');
    setGuestsRooms({ guests: 1, rooms: 1 });
    setEditingSearch(false);
  }

  const filters: Record<string, string> = {};
  filters['guests'] = String(guestsRooms.guests);
  filters['rooms']  = String(guestsRooms.rooms);
  if (city)    filters['city']     = city;
  if (checkIn) filters['checkIn']  = checkIn;
  if (checkOut)filters['checkOut'] = checkOut;
  if (minPrice) filters['minRate'] = minPrice;
  if (maxPrice) filters['maxRate'] = maxPrice;
  if (selectedAmenities.length) filters['amenities'] = selectedAmenities.join(',');
  // The "Stays / Student Housing / Long Term" tabs set the broad market
  // segment; the category chips below further narrow "Stays" results by
  // property type. Student Housing bypasses the chip row entirely.
  if (stayMode === 'student') {
    filters['types'] = MODE_TYPE_MAP.student.join(',');
  } else if (stayMode === 'stays' && category !== 'all') {
    filters['types'] = TYPE_MAP[category].join(',');
  }

  const { data: results, isLoading } = useQuery({
    queryKey: accommodationKeys.list(filters),
    queryFn:  () => api.discovery.searchProperties(filters),
    enabled:  !isLongTermMode,
  });

  const { data: featured } = useQuery({
    queryKey: accommodationKeys.list({}),
    queryFn:  () => api.discovery.getFeatured(),
    enabled:  !city && !isLongTermMode,
  });

  const rawProperties = (results as Record<string, unknown>[] | undefined) ?? (featured as Record<string, unknown>[] | undefined) ?? [];

  // Room pricing lives on the Room model, not the property itself — fetch
  // each visible property's cheapest room in parallel so "From RXXX" is
  // real data instead of a fake/absent value. getPropertyRooms is already
  // sorted ascending by baseRate on the backend, so rooms[0] is the cheapest.
  const rateQueries = useQueries({
    queries: rawProperties.map((p) => ({
      queryKey: accommodationKeys.list({ rooms: p['slug'] as string }),
      queryFn:  () => api.discovery.getPropertyRooms(p['slug'] as string),
      enabled:  !!p['slug'],
      staleTime: 5 * 60 * 1000,
    })),
  });

  const properties = rawProperties.map((p, i) => {
    const rooms = rateQueries[i]?.data as Record<string, unknown>[] | undefined;
    const cheapest = rooms?.[0]?.['baseRate'] as number | undefined;
    return { ...p, __fromRate: cheapest };
  });

  const activeFilterCount = (minPrice || maxPrice ? 1 : 0) + (selectedAmenities.length > 0 ? 1 : 0);

  const sorted = [...properties].sort((a, b) => {
    if (sort === 'price_asc')  return ((a['__fromRate'] as number) ?? Infinity) - ((b['__fromRate'] as number) ?? Infinity);
    if (sort === 'price_desc') return ((b['__fromRate'] as number) ?? -Infinity) - ((a['__fromRate'] as number) ?? -Infinity);
    if (sort === 'rating_desc') return (((b['ratings'] as Record<string, unknown>)?.['overall'] as number) ?? 0) - (((a['ratings'] as Record<string, unknown>)?.['overall'] as number) ?? 0);
    return 0;
  });

  return (
    <div data-search-page>
      <h1 data-page-title>Accommodation</h1>
      <p data-page-subtitle>Find the perfect place to stay</p>

      {/* Search summary / edit bar — only shown when not actively editing,
          so it never renders at the same time as the open search widget. */}
      {city && !editingSearch ? (
        <div data-search-summary>
          <div data-search-summary-text onClick={() => setEditingSearch(true)} style={{ cursor: 'pointer' }}>
            <span data-search-summary-location><Icons.MapPin size={14} /> {city}</span>
            <span data-search-summary-dates>
              {checkIn && checkOut ? `${checkIn} – ${checkOut} · ` : ''}{guestsRooms.guests} Guest{guestsRooms.guests !== 1 ? 's' : ''}, {guestsRooms.rooms} Room{guestsRooms.rooms !== 1 ? 's' : ''}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            <button type="button" onClick={() => setEditingSearch(true)}
              style={{ color: 'var(--color-primary)', fontSize: 'var(--text-sm)', fontWeight: 'var(--font-medium)', display: 'inline-flex', alignItems: 'center', gap: 'var(--space-1)', background: 'none', border: 'none', cursor: 'pointer' }}>
              Edit <Icons.Pencil size={14} />
            </button>
            <button type="button" onClick={clearSearch} aria-label="Clear search"
              style={{ color: 'var(--color-text-muted)', display: 'flex', background: 'none', border: 'none', cursor: 'pointer' }}>
              <Icons.X size={16} />
            </button>
          </div>
        </div>
      ) : null}

      {/* Inline search (shown when editing or no city) */}
      {(!city || editingSearch) && (
        <div data-search-widget style={{ marginBottom: 'var(--space-4)' }}>
          <div data-stay-mode-tabs>
            {STAY_MODES.map((m) => (
              <button key={m.id} type="button"
                data-stay-mode-tab
                data-active={stayMode === m.id ? '' : undefined}
                onClick={() => setStayMode(m.id)}>
                <m.icon size={16} /> {m.label}
                {m.id === 'long_term' && <span data-badge-soon>Soon</span>}
              </button>
            ))}
          </div>
          <div data-search-fields>
            <div data-search-field data-search-location>
              <label htmlFor="city">Where are you going?</label>
              <div data-search-location-input>
                <Icons.MapPin size={16} aria-hidden="true" />
                <input id="city" type="text" placeholder="City or neighbourhood" value={city}
                  onChange={(e) => setCity(e.target.value)} />
              </div>
            </div>
            <div data-search-fields-row>
              <div data-search-field>
                <label htmlFor="ci">Check-in</label>
                <input id="ci" type="date" value={checkIn}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={(e) => setCheckIn(e.target.value)} />
              </div>
              <div data-search-field>
                <label htmlFor="co">Check-out</label>
                <input id="co" type="date" value={checkOut}
                  min={checkIn || new Date().toISOString().split('T')[0]}
                  onChange={(e) => setCheckOut(e.target.value)} />
              </div>
              <GuestsRoomsField value={guestsRooms} onChange={setGuestsRooms} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-4)' }}>
            {city && (
              <button type="button" data-btn-ghost onClick={clearSearch}>Clear</button>
            )}
            <button type="button" data-btn-primary data-btn-full style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-2)' }}
              onClick={() => setEditingSearch(false)}>
              Search accommodation <Icons.Search size={18} />
            </button>
          </div>
        </div>
      )}

      {/* Category chips — only relevant to "Stays" mode */}
      {stayMode === 'stays' && (
        <div data-filter-bar>
          {CATS.map((c) => (
            <button key={c.id} type="button" data-filter-chip
              data-active={category === c.id ? '' : undefined}
              onClick={() => setCategory(c.id)}>
              <c.icon size={14} style={{ display: 'inline', verticalAlign: '-2px', marginRight: '4px' }} />{c.label}
            </button>
          ))}
        </div>
      )}

      {/* Explore by category — moved above results per feedback: browsing
          aid belongs near the top, not buried under the results list. */}
      <div data-section-header style={{ marginTop: 'var(--space-5)' }}>
        <span data-section-title>Explore by category</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 'var(--space-3)', marginBottom: 'var(--space-6)' }}>
        {[
          { label: 'Beachfront',      icon: Icons.Palmtree, type: 'beachfront' },
          { label: 'Pet Friendly',    icon: Icons.PawPrint, type: 'pet_friendly' },
          { label: 'Family Friendly', icon: Icons.Users,    type: 'family' },
          { label: 'Business Stay',   icon: Icons.Briefcase,type: 'business' },
        ].map((c) => (
          <Link key={c.label} href={`/accommodation?amenity=${c.type}`} data-card
            style={{ padding: 'var(--space-4)', textAlign: 'center', textDecoration: 'none', cursor: 'pointer' }}>
            <div style={{ display: 'flex', justifyContent: 'center', color: 'var(--color-primary)', marginBottom: 'var(--space-2)' }}><c.icon size={28} /></div>
            <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-medium)' }}>{c.label}</div>
          </Link>
        ))}
      </div>

      {isLongTermMode ? (
        <div data-card-padded style={{ textAlign: 'center', padding: 'var(--space-10) var(--space-6)' }}>
          <div style={{ display: 'flex', justifyContent: 'center', color: 'var(--color-text-muted)', marginBottom: 'var(--space-4)' }}>
            <Icons.Building2 size={40} />
          </div>
          <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--font-bold)', marginBottom: 'var(--space-2)' }}>
            Long Term stays — coming soon
          </h2>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', maxWidth: '28rem', margin: '0 auto' }}>
            Lease-based long-term accommodation isn&apos;t available yet. Check back soon, or browse short-stay Hotels, Guesthouses and Apartments under the Stays tab.
          </p>
        </div>
      ) : (
        <>
          {/* Filter + sort row — genuinely working dropdowns */}
          <div data-filter-bar style={{ marginBottom: 0 }}>
            <div data-filter-chip-wrap>
              <button type="button" data-filter-chip
                data-active={activeFilterCount > 0 ? '' : undefined}
                onClick={() => { setMinPrice(''); setMaxPrice(''); setSelectedAmenities([]); }}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-1)' }}>
                <Icons.SlidersHorizontal size={14} /> Filters {activeFilterCount > 0 ? `(${activeFilterCount}) — clear` : ''}
              </button>
            </div>

            <div data-filter-chip-wrap>
              <button type="button" data-filter-chip data-active={sort !== 'recommended' ? '' : undefined}
                onClick={() => setOpenPopover(openPopover === 'sort' ? null : 'sort')}>
                Sort <Icons.ChevronDown size={14} style={{ display: 'inline', verticalAlign: '-2px' }} />
              </button>
              {openPopover === 'sort' && (
                <div data-filter-popover>
                  {SORT_OPTIONS.map((o) => (
                    <button key={o.id} type="button" data-filter-popover-option
                      data-active={sort === o.id ? '' : undefined}
                      onClick={() => { setSort(o.id); setOpenPopover(null); }}>
                      {sort === o.id && <Icons.Check size={14} />} {o.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div data-filter-chip-wrap>
              <button type="button" data-filter-chip data-active={(minPrice || maxPrice) ? '' : undefined}
                onClick={() => setOpenPopover(openPopover === 'price' ? null : 'price')}>
                Price <Icons.ChevronDown size={14} style={{ display: 'inline', verticalAlign: '-2px' }} />
              </button>
              {openPopover === 'price' && (
                <div data-filter-popover>
                  <div data-filter-popover-row style={{ marginBottom: 'var(--space-2)' }}>
                    <input type="number" placeholder="Min" value={minPrice} data-filter-popover-input
                      onChange={(e) => setMinPrice(e.target.value)} />
                    <span style={{ color: 'var(--color-text-muted)' }}>–</span>
                    <input type="number" placeholder="Max" value={maxPrice} data-filter-popover-input
                      onChange={(e) => setMaxPrice(e.target.value)} />
                  </div>
                  <button type="button" data-btn-primary data-btn-full
                    style={{ padding: 'var(--space-2)', fontSize: 'var(--text-sm)' }}
                    onClick={() => setOpenPopover(null)}>
                    Apply
                  </button>
                </div>
              )}
            </div>

            <div data-filter-chip-wrap>
              <button type="button" data-filter-chip data-active={selectedAmenities.length > 0 ? '' : undefined}
                onClick={() => setOpenPopover(openPopover === 'amenities' ? null : 'amenities')}>
                Amenities <Icons.ChevronDown size={14} style={{ display: 'inline', verticalAlign: '-2px' }} />
              </button>
              {openPopover === 'amenities' && (
                <div data-filter-popover>
                  {AMENITY_OPTIONS.map((a) => (
                    <button key={a} type="button" data-filter-popover-option
                      data-active={selectedAmenities.includes(a) ? '' : undefined}
                      onClick={() => setSelectedAmenities((prev) =>
                        prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a])}>
                      {selectedAmenities.includes(a) && <Icons.Check size={14} />} {a.charAt(0).toUpperCase() + a.slice(1)}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Results count */}
          <div data-results-header>
            <span data-results-count>
              <strong>{sorted.length}</strong> properties found
            </span>
            <Link href="/accommodation?mapview=true" data-section-link style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-1)' }}>
              <Icons.Map size={14} /> Map view
            </Link>
          </div>

          {/* Results */}
          {isLoading ? (
            <SkeletonLoader rows={4} />
          ) : sorted.length === 0 ? (
            <EmptyState title="No properties found"
              description="Try a different location, date range, or remove some filters." />
          ) : (
            <div data-property-list>
              {sorted.map((p) => (
                <PropertySearchCard key={p['_id'] as string} property={p} />
              ))}
            </div>
          )}
        </>
      )}

      {/* Member CTA — only relevant to signed-out visitors; every user on
          this page is already authenticated in the customer portal. */}
      {!session && (
        <div data-support-callout style={{ marginTop: 'var(--space-6)' }}>
          <div data-support-callout-text>
            <span data-support-callout-icon aria-hidden="true"><Icons.Tag size={20} /></span>
            <div>
              <strong>Unlock member rates</strong>
              <p>Sign in to access exclusive deals and save more on your next stay.</p>
            </div>
          </div>
          <Link href="/login" data-btn-primary style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <Icons.User size={16} /> Sign in / Register
          </Link>
        </div>
      )}
    </div>
  );
}

function PropertySearchCard({ property: p }: { property: Record<string, unknown> }): React.ReactElement {
  const ratings = p['ratings'] as Record<string, unknown> | undefined;
  const rating = ratings?.['overall'] as number | undefined;
  const reviews = ratings?.['totalReviews'] as number | undefined;
  const rate = p['__fromRate'] as number | undefined;
  const address = p['address'] as Record<string, unknown> | undefined;
  const city = address?.['city'] as string | undefined;

  return (
    <Link href={`/accommodation/${p['slug'] as string}`} data-property-card data-property-list-item
      style={{ textDecoration: 'none' }}>
      <div data-property-card-image>
        {/* Image path: /images/properties/[slug]-main.jpg */}
        <img src={`/images/properties/${p['slug'] as string}-main.jpg`} alt={p['name'] as string}
          loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
        <span data-property-type-badge>{(p['type'] as string)?.replace(/_/g, ' ')}</span>
        <button type="button" data-property-card-wishlist aria-label="Save" onClick={(e) => e.preventDefault()}><Icons.Heart size={16} /></button>
      </div>
      <div data-property-card-body>
        <div data-property-card-header>
          <span data-property-card-name>{p['name'] as string}</span>
          {rating && (
            <span data-property-card-rating><Icons.Star size={14} fill="currentColor" /> {rating.toFixed(1)}{reviews ? ` (${reviews})` : ''}</span>
          )}
        </div>
        <div data-property-card-location>
          <Icons.MapPin size={14} /> {city ?? '—'}
        </div>
        <div data-property-card-amenities>
          {((p['amenities'] as string[]) ?? []).slice(0, 3).map((a) => (
            <span key={a} data-amenity-tag><Icons.Wifi size={12} /> {a}</span>
          ))}
        </div>
        <div data-property-card-pricing>
          <div>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>From</div>
            <span data-property-rate>{rate ? `R${rate.toLocaleString()}` : '—'}</span>
            {rate ? <span data-property-rate-label> / night</span> : null}
          </div>
          <button type="button" data-btn-primary style={{ padding: 'var(--space-2) var(--space-4)', fontSize: 'var(--text-sm)' }}>
            View details
          </button>
        </div>
      </div>
    </Link>
  );
}
