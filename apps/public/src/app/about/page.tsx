import React from 'react';
import {
  Users,
  GraduationCap,
  Building2,
  Landmark,
  Globe,
  User,
  Settings,
  Check,
  ChevronDown,
  Home as HomeIcon,
  Play,
  type LucideIcon,
} from 'lucide-react';
import { PublicHeader, PublicFooter } from '@/components/PublicLayout';

export const metadata = {
  title: 'About StayOS — Technology built for every stay',
  description: "StayOS is South Africa's all-in-one accommodation platform connecting guests, students, property owners and agencies.",
};

const STATS = [
  { value: '1,000+', label: 'Properties',        sub: 'Across South Africa'     },
  { value: '200+',   label: 'Cities & Towns',     sub: 'Nationwide coverage'     },
  { value: '250K+',  label: 'Bookings',           sub: 'And counting'            },
  { value: '150K+',  label: 'Students housed',    sub: 'Housed and supported'    },
  { value: '80+',    label: 'Agencies',           sub: 'Managing properties'     },
  { value: '99.9%',  label: 'Platform uptime',    sub: 'Reliability you can trust'},
];

const PORTALS: { icon: LucideIcon; title: string; desc: string }[] = [
  { icon: Globe,     title: 'Public Website',  desc: 'Discover properties, compare options and find the perfect stay or student accommodation.' },
  { icon: User,      title: 'Customer Portal', desc: 'Guests and students book, apply, pay, manage stays, loyalty and support.'                 },
  { icon: Building2, title: 'Property Portal', desc: 'Property teams manage bookings, operations, staff, finances and reports.'                  },
  { icon: Landmark,  title: 'Agency Portal',   desc: 'Agencies manage multiple properties, mandates, billing and staff.'                         },
  { icon: Settings,  title: 'Platform Admin',  desc: 'StayOS platform operations, vetting, support, billing and insights.'                       },
];

const AUDIENCE: { icon: LucideIcon; title: string; desc: string; points: string[] }[] = [
  {
    icon: Users, title: 'Guests',
    desc: 'Find and book hotels, guesthouses and rentals with confidence.',
    points: ['Best rates', 'Secure bookings', 'Loyalty rewards', '24/7 support'],
  },
  {
    icon: GraduationCap, title: 'Students',
    desc: 'Apply, manage and pay for accommodation with ease.',
    points: ['Easy applications', 'Transparent fees', 'Digital leases', 'Payment plans'],
  },
  {
    icon: Building2, title: 'Property Owners',
    desc: 'Run your property smarter and grow your business.',
    points: ['More bookings', 'Streamlined operations', 'Powerful insights', 'Lower costs'],
  },
  {
    icon: Landmark, title: 'Agencies',
    desc: 'Manage multiple properties and drive performance.',
    points: ['Centralised portfolio', 'Mandate management', 'Staff management', 'Clear statements'],
  },
];

const JOURNEY = [
  { year: '2021',  label: 'The Idea',             detail: 'Identified challenges in hospitality and student accommodation management.'                 },
  { year: '2022',  label: 'Building StayOS',       detail: 'Platform architecture, core modules and first properties onboarded.'                        },
  { year: '2023',  label: 'Growth & Partnerships', detail: 'Expanded to cities nationwide and launched agency collaboration.'                            },
  { year: '2024',  label: 'One Unified Platform',  detail: 'Connected every portal, launched loyalty, reports and advanced operations.'                  },
  { year: '2025+', label: 'The Future',            detail: 'Continuous innovation, AI-powered insights and global ambitions.'                            },
];

const SA_POINTS = [
  'Support for ZAR and local payment methods',
  'Built to handle loadshedding, connectivity and real-world challenges',
  'Designed for hotels, guesthouses, rentals and student housing',
  'Compliant with South African laws and POPIA',
];

const FAQS = [
  { q: 'What is StayOS?',                          a: "StayOS is South Africa's all-in-one accommodation platform for guests, students, property owners and agencies." },
  { q: 'Who can list their property on StayOS?',   a: 'Any property owner or agency can register and list accommodation, subject to our vetting process.'          },
  { q: 'How do guests book on StayOS?',            a: 'Guests browse listings, select dates, and complete a booking through the Customer Portal at my.stayos.co.za.' },
  { q: 'How do students apply for accommodation?', a: 'Students browse student housing listings and submit applications directly — no account required to apply.'   },
  { q: 'How does the loyalty program work?',       a: 'Guests earn Q Points on every stay and activity, which can be redeemed for discounts and upgrades.'          },
  { q: 'Does StayOS integrate with OTAs?',         a: 'Yes — StayOS supports iCal channel sync with Airbnb, Booking.com and other OTA platforms.'                  },
  { q: 'Is my data safe on StayOS?',               a: 'All data is encrypted and we are fully POPIA-compliant. We never sell or share your data with third parties.' },
  { q: 'What payment methods are supported?',      a: 'We support PayFast, Ozow and Stripe, covering credit/debit cards, EFT and instant EFT.'                    },
  { q: 'How can I contact support?',               a: 'Via the Contact page, our in-app support tickets, email at hello@stayos.co.za, or WhatsApp at +27 82 123 4567.' },
];

export default function AboutPage(): React.ReactElement {
  return (
    <>
      <PublicHeader activePage="/about" />

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section data-page-hero>
        <img
          data-page-hero-bg
          src="/images/public/about-hero.jpg"
          alt="South African hospitality"
          loading="eager"
        />
        <div data-page-hero-overlay aria-hidden="true" />
        <div data-page-hero-content>
          <span data-page-hero-label>ABOUT STAYOS</span>
          <h1 data-page-hero-heading>Technology built for every stay.</h1>
          <p data-page-hero-sub>
            StayOS is South Africa&apos;s all-in-one accommodation platform connecting
            guests, students, property owners and agencies with seamless technology,
            trusted data and real human support.
          </p>
          <div data-page-hero-actions>
            <a href="/search" data-btn-primary>Explore our platform</a>
            <button
              type="button"
              data-btn-outline-white
            >
              <Play size={14} fill="currentColor" aria-hidden="true" /> Watch overview
            </button>
          </div>
        </div>
      </section>

      {/* ── Our Story ─────────────────────────────────────────────────────── */}
      <section data-section data-white>
        <div data-container>
          <span data-section-label>OUR STORY</span>
          <div data-cols-2>
            <div>
              <h2 data-section-heading>Solving real challenges. Together.</h2>
              <p data-section-intro>
                StayOS was created by LekkerQ (Pty) Ltd, a South African tech company
                born from experience in the hospitality and student accommodation
                industries.
              </p>
            </div>
            <div data-prose>
              <p>
                We saw property owners juggling multiple disconnected systems. Guests struggled
                to find reliable places to stay. Students faced confusing application and
                payment processes.
              </p>
              <p>
                So we built one intelligent platform that brings everything together — search,
                book, apply, manage, pay and grow. From day one, our goal has been simple:
                build reliable, easy-to-use tools that help accommodation businesses run
                better, and give every guest and student a smoother experience.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Platform overview ─────────────────────────────────────────────── */}
      <section data-section>
        <div data-container>
          <span data-section-label>ONE PLATFORM. FOUR EXPERIENCES.</span>
          <h2 data-section-heading>Built for every role.</h2>
          <div data-icon-grid data-cols="5" data-center>
            {PORTALS.map((p) => (
              <div key={p.title}>
                <div data-icon-item-icon aria-hidden="true"><p.icon size={28} /></div>
                <div data-icon-item-title>{p.title}</div>
                <div data-icon-item-desc>{p.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Who we serve ──────────────────────────────────────────────────── */}
      <section data-section data-white>
        <div data-container>
          <span data-section-label>WHO WE SERVE</span>
          <h2 data-section-heading>A platform for everyone.</h2>
          <div data-icon-grid data-cols="4">
            {AUDIENCE.map((a) => (
              <div key={a.title}>
                <div data-icon-item-icon aria-hidden="true"><a.icon size={28} /></div>
                <div data-icon-item-title>{a.title}</div>
                <div data-icon-item-desc>{a.desc}</div>
                <ul data-checklist>
                  {a.points.map((pt) => (
                    <li key={pt}>
                      <Check size={14} aria-hidden="true" />
                      {pt}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Stats ─────────────────────────────────────────────────────────── */}
      <div data-stats-row>
        <div data-stats-grid data-cols="3">
          {STATS.map((s) => (
            <div key={s.label} data-stat-item>
              <strong data-stat-value>{s.value}</strong>
              <span data-stat-label>{s.label}</span>
              <span data-stat-sub>{s.sub}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── South Africa ──────────────────────────────────────────────────── */}
      <section data-section data-white>
        <div data-container>
          <div data-cols-2-lg>
            <div>
              <span data-section-label>BUILT IN SOUTH AFRICA</span>
              <h2 data-section-heading>For South Africa. By South Africans.</h2>
              <p data-section-intro>
                StayOS is proudly South African. We understand our market, our
                challenges and our opportunities.
              </p>
              <ul data-checklist>
                {SA_POINTS.map((pt) => (
                  <li key={pt}>
                    <Check size={15} aria-hidden="true" />
                    {pt}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p data-eyebrow>OUR JOURNEY</p>
              <div data-journey>
                {JOURNEY.map((j) => (
                  <div key={j.year} data-journey-item>
                    <span data-journey-year>{j.year}</span>
                    <div>
                      <div data-journey-label>{j.label}</div>
                      <div data-journey-detail>{j.detail}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ ───────────────────────────────────────────────────────────── */}
      <section data-section>
        <div data-container>
          <span data-section-label>FAQS</span>
          <h2 data-section-heading>Frequently asked questions</h2>
          <div data-accordion>
            {FAQS.map((faq) => (
              <details key={faq.q}>
                <summary>
                  {faq.q}
                  <ChevronDown size={16} aria-hidden="true" data-chevron />
                </summary>
                <p data-answer>{faq.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────────────────────── */}
      <div data-cta-section>
        <div data-container>
          <h2 data-section-heading>Let&apos;s build better stays, together.</h2>
          <p data-section-intro>
            Join thousands of property owners, agencies, guests and students who trust
            StayOS every day.
          </p>
          <div data-cta-actions>
            <a href="/search" data-btn-white>
              <HomeIcon size={16} aria-hidden="true" /> Explore Properties
            </a>
            <a href="/signup/property" data-btn-outline-white>
              <Building2 size={16} aria-hidden="true" /> For Property Owners
            </a>
            <a href="/contact" data-btn-outline-white>
              <Users size={16} aria-hidden="true" /> Contact Sales
            </a>
          </div>
        </div>
      </div>

      <PublicFooter />
    </>
  );
}
