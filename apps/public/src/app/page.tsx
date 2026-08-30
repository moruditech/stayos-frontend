'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  LayoutGrid,
  GraduationCap,
  Hotel,
  Home as HomeIcon,
  Building2,
  MapPin,
  ArrowRight,
  type LucideIcon,
} from 'lucide-react';
import { PublicHeader, PublicFooter } from '@/components/PublicLayout';

type SearchTab = 'all' | 'student' | 'hotels' | 'guesthouses' | 'rentals';

const SEARCH_TABS: { id: SearchTab; label: string; icon: LucideIcon }[] = [
  { id: 'all',         label: 'All',            icon: LayoutGrid   },
  { id: 'student',     label: 'Student Housing', icon: GraduationCap },
  { id: 'hotels',      label: 'Hotels',          icon: Hotel        },
  { id: 'guesthouses', label: 'Guesthouses',     icon: HomeIcon     },
  { id: 'rentals',     label: 'Rentals',         icon: Building2    },
];

const STATS = [
  { value: '4.8/5',   label: 'Average guest rating'        },
  { value: '25,000+', label: 'Stays booked'                },
  { value: '3,000+',  label: 'Properties on the platform'  },
  { value: '99.9%',   label: 'Platform uptime'             },
];

const PLANS = [
  { name: 'Starter',      price: 'R349',   for: 'Up to 5 rooms'   },
  { name: 'Professional', price: 'R799',   for: 'Up to 30 rooms',  featured: true },
  { name: 'Business',     price: 'R1,499', for: 'Up to 100 rooms' },
  { name: 'Enterprise',   price: 'Custom', for: 'Unlimited rooms'  },
];

export default function HomePage(): React.ReactElement {
  const router = useRouter();
  const [searchTab, setSearchTab] = useState<SearchTab>('all');
  const [destination, setDest]    = useState('');
  const [checkIn, setCheckIn]     = useState('');
  const [checkOut, setCheckOut]   = useState('');
  const [guests, setGuests]       = useState('1 guest');

  function handleSearch(): void {
    const p = new URLSearchParams();
    if (destination)        p.set('city', destination);
    if (checkIn)            p.set('checkIn', checkIn);
    if (checkOut)           p.set('checkOut', checkOut);
    if (searchTab !== 'all') p.set('type', searchTab);
    router.push(`/search?${p.toString()}`);
  }

  return (
    <>
      <PublicHeader activePage="/" />

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section data-hero>
        <div data-hero-overlay aria-hidden="true" />
        <div data-hero-content>
          <h1 data-hero-headline>
            One platform.<br />Every stay.
          </h1>
          <p data-hero-sub>
            StayOS connects people to the right place to stay and helps property
            operators run their business smarter, every day.
          </p>
          <div data-hero-actions>
            <a href="/search" data-btn-primary>
              Find a place to stay <ArrowRight size={16} aria-hidden="true" />
            </a>
            <a href="/signup/property" data-btn-secondary>
              <Building2 size={16} aria-hidden="true" /> List your property
            </a>
          </div>
        </div>

        {/* Search panel — sits below the hero grid, full width */}
        <div data-search-panel>
          <div data-container>
            <p data-search-title>Find your next stay</p>
            <div data-search-tabs>
              {SEARCH_TABS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  data-search-tab
                  data-active={searchTab === t.id ? '' : undefined}
                  onClick={() => setSearchTab(t.id)}
                >
                  <t.icon size={16} aria-hidden="true" />
                  <span>{t.label}</span>
                </button>
              ))}
            </div>
            <div data-search-fields>
              <div data-form-group data-input-with-icon>
                <MapPin size={16} aria-hidden="true" data-input-icon />
                <input
                  type="text"
                  placeholder="Where are you going?"
                  value={destination}
                  onChange={(e) => setDest(e.target.value)}
                />
              </div>
              <div data-form-group>
                <label>Check-in</label>
                <input
                  type="date"
                  value={checkIn}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={(e) => setCheckIn(e.target.value)}
                />
              </div>
              <div data-form-group>
                <label>Check-out</label>
                <input
                  type="date"
                  value={checkOut}
                  min={checkIn || new Date().toISOString().split('T')[0]}
                  onChange={(e) => setCheckOut(e.target.value)}
                />
              </div>
              <div data-form-group>
                <label>Guests</label>
                <select value={guests} onChange={(e) => setGuests(e.target.value)}>
                  {['1 guest', '2 guests', '3 guests', '4+ guests'].map((g) => (
                    <option key={g}>{g}</option>
                  ))}
                </select>
              </div>
              <button type="button" data-btn-primary onClick={handleSearch}>
                Search <ArrowRight size={16} aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── Trust bar ─────────────────────────────────────────────────────── */}
      <div data-trust-bar>
        <div data-container>
          <span data-trust-label>Trusted by operators and guests across South Africa</span>
          <div data-trust-logos>
            {['Damelin', 'Varsity College', 'Stadio', 'Rosebank College', 'Vega School'].map((name) => (
              <span key={name} data-trust-logo>{name}</span>
            ))}
          </div>
        </div>
      </div>

      {/* ── Services ──────────────────────────────────────────────────────── */}
      <section data-section data-white>
        <div data-container>
          <span data-section-label>BUILT FOR TWO AUDIENCES</span>
          <h2 data-section-heading>Solutions that work for you</h2>
          <p data-section-intro>
            Whether you run a guesthouse, hotel, student residence or agency portfolio — StayOS
            has the right tools for you.
          </p>

          <div data-service-rows>
            {/* Student housing */}
            <div data-service-row>
              <div>
                <GraduationCap size={28} data-service-row-icon aria-hidden="true" />
                <h3 data-service-row-heading>Student Housing Operators</h3>
                <p data-service-row-desc>
                  Manage varsity accommodation, applications, occupancies and billing —
                  all in one place designed for universities and private providers.
                </p>
                <ul data-service-row-points>
                  <li>Online applications that are easy for students</li>
                  <li>Room &amp; bed management made simple</li>
                  <li>Automated billing and financial reporting</li>
                  <li>NSFAS and bursary recipient support</li>
                </ul>
                <a href="/services#student" data-section-link>
                  Explore student housing solutions <ArrowRight size={14} aria-hidden="true" />
                </a>
              </div>
              <div data-service-row-media>
                <img
                  src="/images/public/services-student.jpg"
                  alt="Student accommodation"
                  loading="lazy"
                />
              </div>
            </div>

            {/* Hospitality */}
            <div data-service-row data-flip>
              <div>
                <Hotel size={28} data-service-row-icon aria-hidden="true" />
                <h3 data-service-row-heading>Hospitality Operators</h3>
                <p data-service-row-desc>
                  For hotels, guesthouses and rentals that want more bookings and
                  less admin — with tools that grow with your business.
                </p>
                <ul data-service-row-points>
                  <li>Direct bookings, fewer commissions</li>
                  <li>Channel manager &amp; calendar sync</li>
                  <li>Guest management &amp; secure payments</li>
                  <li>Insights to grow your business</li>
                </ul>
                <a href="/services#hospitality" data-section-link>
                  Explore hospitality solutions <ArrowRight size={14} aria-hidden="true" />
                </a>
              </div>
              <div data-service-row-media>
                <img
                  src="/images/public/services-hospitality.jpg"
                  alt="Hotel operations"
                  loading="lazy"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats ─────────────────────────────────────────────────────────── */}
      <div data-stats-row>
        <div data-stats-grid>
          {STATS.map((s) => (
            <div key={s.label} data-stat-item>
              <strong data-stat-value>{s.value}</strong>
              <span data-stat-label>{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Pricing teaser ────────────────────────────────────────────────── */}
      <section data-section data-white>
        <div data-container>
          <div data-pricing-teaser>
            <div>
              <span data-section-label>FAIR PRICING, REAL VALUE</span>
              <h2 data-section-heading>Plans that grow with your business</h2>
              <p data-section-intro>
                Choose the plan that fits you today, with the flexibility to scale
                tomorrow. All prices in ZAR, excl. VAT.
              </p>
              <a href="/pricing" data-section-link>
                View all plans <ArrowRight size={14} aria-hidden="true" />
              </a>
            </div>

            <div>
              <table data-plan-table>
                <thead>
                  <tr>
                    <th>Plan</th>
                    <th>From</th>
                    <th>Best for</th>
                  </tr>
                </thead>
                <tbody>
                  {PLANS.map((p) => (
                    <tr key={p.name} data-featured-row={p.featured ? '' : undefined}>
                      <td>{p.name}</td>
                      <td>{p.price}{p.price !== 'Custom' ? '/mo' : ''}</td>
                      <td>{p.for}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <a href="/signup/property" data-btn-primary>
                Start free trial <ArrowRight size={14} aria-hidden="true" />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────────────────────── */}
      <div data-cta-section>
        <div data-container>
          <h2 data-section-heading>Ready to simplify how you host or stay?</h2>
          <p data-section-intro>
            Join thousands of operators and guests who trust StayOS every day.
          </p>
          <div data-cta-actions>
            <a href="/signup/property" data-btn-white>
              <Building2 size={16} aria-hidden="true" /> List your property
            </a>
            <a href="/search" data-btn-outline-white>
              Find a place to stay <ArrowRight size={16} aria-hidden="true" />
            </a>
          </div>
        </div>
      </div>

      <PublicFooter />
    </>
  );
}
