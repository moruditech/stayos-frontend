import React from 'react';
import {
  Calendar, Hotel, RefreshCcw, Users, CreditCard, Sparkles, BarChart3, Landmark,
  ClipboardList, BedDouble, Receipt, PencilLine, TrendingUp, GraduationCap, ArrowRight,
  type LucideIcon,
} from 'lucide-react';
import { PublicHeader, PublicFooter } from '@/components/PublicLayout';

export const metadata = {
  title: 'Services — StayOS',
  description: 'Discover how StayOS serves hospitality operators and student housing providers across South Africa.',
};

const HOSPITALITY_FEATURES: { icon: LucideIcon; title: string; desc: string }[] = [
  { icon: Calendar,   title: 'Booking management',         desc: 'Direct bookings with real-time availability, conflict detection and automated confirmations.'        },
  { icon: Hotel,      title: 'Room & rate management',      desc: 'Manage room types, pricing rules, promotions and seasonal rates from one dashboard.'                 },
  { icon: RefreshCcw, title: 'Channel manager & iCal sync', desc: 'Sync your calendar with Airbnb, Booking.com and other OTAs to prevent double bookings.'              },
  { icon: Users,      title: 'Guest management',            desc: 'Guest profiles, check-in/out, digital keys, ID verification and communication tools.'                },
  { icon: CreditCard, title: 'Payments & invoicing',        desc: 'Accept PayFast, Ozow and Stripe. Automated invoicing and folio management.'                          },
  { icon: Sparkles,   title: 'Housekeeping & maintenance',  desc: 'Task boards, staff schedules, work orders and real-time status updates.'                              },
  { icon: BarChart3,  title: 'Reports & analytics',         desc: 'Occupancy, revenue, ADR, booking source analysis and financial reporting.'                           },
  { icon: Landmark,   title: 'Agency mandates',             desc: 'Owner portal with mandate management for properties run by agencies.'                                 },
];

const STUDENT_FEATURES: { icon: LucideIcon; title: string; desc: string }[] = [
  { icon: ClipboardList, title: 'Online applications',    desc: 'Customisable application forms with document uploads, closing dates and automated status notifications.' },
  { icon: BedDouble,     title: 'Room & bed management',  desc: 'Manage capacity, bed types, room assignments and occupancy at the granular level.'                        },
  { icon: Receipt,       title: 'Student billing',         desc: 'Invoicing with line items for tuition, accommodation, laundry and admin fees. NSFAS and bursary support.' },
  { icon: PencilLine,    title: 'Digital leases',          desc: 'Issue, sign and store lease agreements digitally. Every access logged for compliance.'                    },
  { icon: TrendingUp,    title: 'Reporting',               desc: 'Financial, occupancy and student status reporting for management and compliance.'                         },
  { icon: GraduationCap, title: 'Multi-provider support',  desc: 'Built for universities, private providers and mixed portfolios.'                                          },
];

export default function ServicesPage(): React.ReactElement {
  return (
    <>
      <PublicHeader activePage="/services" />

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <div data-solid-hero>
        <div data-container>
          <span data-section-label>BUILT FOR TWO AUDIENCES</span>
          <h1 data-section-heading>Solutions that work for you</h1>
          <p data-section-intro>
            Whether you run a guesthouse, hotel, student residence or agency portfolio —
            StayOS has the tools to help you operate smarter.
          </p>
          <div data-solid-hero-actions>
            <a href="#hospitality" data-btn-white>Hospitality operators</a>
            <a href="#student" data-btn-outline-white>Student housing</a>
          </div>
        </div>
      </div>

      {/* ── Hospitality ───────────────────────────────────────────────────── */}
      <section id="hospitality" data-section>
        <div data-container>
          <div data-cols-2-lg>
            <div>
              <span data-section-label>FOR HOSPITALITY OPERATORS</span>
              <h2 data-section-heading>More bookings, less admin.</h2>
              <p data-section-intro>
                Direct bookings, real-time availability, automated payments and staff
                coordination — all in one platform built for South African hospitality
                businesses.
              </p>
              <div data-cta-actions data-start>
                <a href="/signup/property" data-btn-primary>
                  List your property <ArrowRight size={16} aria-hidden="true" />
                </a>
                <a href="/pricing" data-btn-secondary>View pricing</a>
              </div>
            </div>
            <div data-section-media>
              <img
                src="/images/public/services-hospitality-detail.jpg"
                alt="Hotel management"
                loading="lazy"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            </div>
          </div>

          <div data-features-grid>
            {HOSPITALITY_FEATURES.map((f) => (
              <div key={f.title} data-feature-item>
                <div data-feature-icon aria-hidden="true"><f.icon size={24} /></div>
                <h3 data-feature-title>{f.title}</h3>
                <p data-feature-desc>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Student housing ───────────────────────────────────────────────── */}
      <section id="student" data-section data-white>
        <div data-container>
          <div data-cols-2-lg>
            <div data-section-media>
              <img
                src="/images/public/services-student-detail.jpg"
                alt="Student accommodation"
                loading="lazy"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            </div>
            <div>
              <span data-section-label>FOR STUDENT HOUSING OPERATORS</span>
              <h2 data-section-heading>Built for universities and private providers.</h2>
              <p data-section-intro>
                Manage applications, leases, billing and occupancy for student
                accommodation — with tools for self-paying students, NSFAS and
                bursary recipients.
              </p>
              <div data-cta-actions data-start>
                <a href="/signup/property" data-btn-primary>
                  Get started <ArrowRight size={16} aria-hidden="true" />
                </a>
                <a href="/contact" data-btn-secondary>Talk to sales</a>
              </div>
            </div>
          </div>

          <div data-features-grid>
            {STUDENT_FEATURES.map((f) => (
              <div key={f.title} data-feature-item>
                <div data-feature-icon aria-hidden="true"><f.icon size={24} /></div>
                <h3 data-feature-title>{f.title}</h3>
                <p data-feature-desc>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────────────────────── */}
      <div data-cta-section>
        <div data-container>
          <h2 data-section-heading>Ready to get started?</h2>
          <p data-section-intro>
            Join thousands of operators across South Africa on StayOS.
          </p>
          <div data-cta-actions>
            <a href="/signup/property" data-btn-white>List your property</a>
            <a href="/contact" data-btn-outline-white>Talk to our team</a>
          </div>
        </div>
      </div>

      <PublicFooter />
    </>
  );
}
