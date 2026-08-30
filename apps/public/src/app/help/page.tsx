import React from 'react';
import {
  BookOpen,
  Search,
  CreditCard,
  User,
  Building2,
  Landmark,
  ArrowRight,
  ChevronDown,
  MessageCircle,
  Mail,
  HelpCircle,
  GraduationCap,
  ShieldCheck,
  type LucideIcon,
} from 'lucide-react';
import { PublicHeader, PublicFooter } from '@/components/PublicLayout';

export const metadata = {
  title: 'Help Centre — StayOS',
  description: 'Find guides, FAQs and troubleshooting articles for guests, students, property owners and agencies on the StayOS platform.',
};

const CATEGORIES: { icon: LucideIcon; title: string; slug: string; desc: string; count: number }[] = [
  { icon: Search,        title: 'Getting Started',         slug: 'getting-started',  desc: 'Create an account, navigate the platform and take your first steps.',        count: 8  },
  { icon: BookOpen,      title: 'Bookings & Reservations', slug: 'bookings',          desc: 'How to book, modify, cancel and understand confirmation emails.',            count: 12 },
  { icon: CreditCard,    title: 'Payments & Billing',      slug: 'payments',          desc: 'Payment methods, invoices, refunds and failed transaction troubleshooting.', count: 10 },
  { icon: User,          title: 'Account & Profile',       slug: 'account',           desc: 'Update your profile, reset your password and manage communication prefs.',   count: 7  },
  { icon: GraduationCap, title: 'Student Accommodation',   slug: 'students',          desc: 'Applications, leases, billing and move-in processes for students.',          count: 9  },
  { icon: Building2,     title: 'Property Owners',         slug: 'property-owners',   desc: 'Onboarding, room setup, bookings management and operations guides.',          count: 14 },
  { icon: Landmark,      title: 'Agencies',                slug: 'agencies',          desc: 'Managing mandates, properties, staff and agency billing.',                   count: 6  },
  { icon: ShieldCheck,   title: 'Privacy & Security',      slug: 'privacy',           desc: 'How your data is stored, POPIA rights and account security.',                count: 5  },
];

const FEATURED: { category: string; title: string; slug: string }[] = [
  { category: 'Getting Started',         title: 'How to create a StayOS account',               slug: 'getting-started/create-account'      },
  { category: 'Bookings & Reservations', title: 'How to make a booking',                         slug: 'bookings/how-to-book'                },
  { category: 'Bookings & Reservations', title: 'Cancellation and refund policy',                slug: 'bookings/cancellation-policy'        },
  { category: 'Payments & Billing',      title: 'Supported payment methods',                     slug: 'payments/supported-methods'          },
  { category: 'Payments & Billing',      title: 'Why was my payment declined?',                  slug: 'payments/payment-declined'           },
  { category: 'Account & Profile',       title: 'How to reset your password',                    slug: 'account/reset-password'              },
  { category: 'Student Accommodation',   title: 'How to apply for student accommodation',        slug: 'students/how-to-apply'               },
  { category: 'Property Owners',         title: 'Getting your property live on StayOS',          slug: 'property-owners/go-live'             },
];

const FAQS = [
  { q: 'How do I book accommodation on StayOS?',          a: 'Browse properties at stayos.co.za, choose your dates, and complete your booking through the Customer Portal at my.stayos.co.za. You will receive a confirmation email once the booking is confirmed.'                                                                  },
  { q: 'What payment methods does StayOS support?',       a: 'We support PayFast, Ozow and Stripe, covering credit and debit cards, EFT and instant EFT. All payments are processed securely.'                                                                                                                                       },
  { q: 'How do I cancel a booking?',                      a: "Log in to your Customer Portal, go to your booking, and select Cancel Booking. Refund eligibility depends on the property's cancellation policy shown at the time of booking."                                                                                         },
  { q: 'How do students apply for accommodation?',        a: 'Browse student housing listings and submit an application directly from the property page. No account is required to apply, but you will need one to manage your application.'                                                                                          },
  { q: 'How do I list my property on StayOS?',            a: 'Register at stayos.co.za/signup/property and complete our onboarding process. Our team will review and verify your listing before it goes live.'                                                                                                                        },
  { q: 'How does the Q Points loyalty programme work?',   a: 'Guests earn Q Points on every eligible stay and activity. Points can be redeemed for discounts and upgrades on future bookings through the Customer Portal.'                                                                                                            },
  { q: 'How do I contact StayOS support?',                a: 'Use the Support section in your Customer Portal to open a ticket, email us at hello@stayos.co.za, or use the contact form on our Contact page.'                                                                                                                         },
  { q: 'Is my personal data safe on StayOS?',             a: 'Yes. All data is encrypted at rest and in transit. We are fully POPIA-compliant and we never sell or share your personal data with third parties without your consent.'                                                                                                  },
];

export default function HelpCentrePage(): React.ReactElement {
  return (
    <>
      <PublicHeader activePage="/help" />

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <div data-help-hero>
        <div data-container>
          <span data-section-label>HELP CENTRE</span>
          <h1 data-section-heading>How can we help you?</h1>
          <p data-section-intro>
            Guides, FAQs and troubleshooting articles for guests, students, property
            owners and agencies.
          </p>
          <div data-help-search-bar>
            <input
              type="search"
              placeholder="Search the help centre…"
              aria-label="Search help articles"
            />
            <button type="button" data-btn-primary>
              <Search size={16} aria-hidden="true" />
              Search
            </button>
          </div>
        </div>
      </div>

      {/* ── Categories ────────────────────────────────────────────────────── */}
      <section data-section>
        <div data-container>
          <span data-section-label>BROWSE BY TOPIC</span>
          <h2 data-section-heading>What do you need help with?</h2>
          <div data-help-categories>
            {CATEGORIES.map((cat) => (
              <a
                key={cat.slug}
                href={`/help/${cat.slug}`}
                data-help-category
              >
                <div data-help-category-icon aria-hidden="true">
                  <cat.icon size={20} />
                </div>
                <div>
                  <div data-category-title>{cat.title}</div>
                  <div data-category-desc>{cat.desc}</div>
                  <div data-category-count>{cat.count} articles</div>
                </div>
                <ArrowRight size={16} aria-hidden="true" data-category-arrow />
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* ── Featured articles ─────────────────────────────────────────────── */}
      <section data-section data-white>
        <div data-container>
          <span data-section-label>POPULAR ARTICLES</span>
          <h2 data-section-heading>Most read guides</h2>
          <div data-featured-articles>
            {FEATURED.map((article) => (
              <a
                key={article.slug}
                href={`/help/${article.slug}`}
                data-featured-article
              >
                <div>
                  <span data-article-category>{article.category}</span>
                  <span data-article-title>{article.title}</span>
                </div>
                <ArrowRight size={14} aria-hidden="true" data-article-arrow />
              </a>
            ))}
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

      {/* ── Support callout ───────────────────────────────────────────────── */}
      <section data-section data-white>
        <div data-container>
          <div data-support-callout>
            <div data-support-callout-text>
              <span data-support-callout-icon aria-hidden="true">
                <HelpCircle size={20} />
              </span>
              <div>
                <strong>Still need help?</strong>
                <p>Our support team is available Monday to Friday, 08:00 — 17:00 SAST.</p>
              </div>
            </div>
            <div data-button-row>
              <a href="/contact" data-btn-secondary>
                <Mail size={14} aria-hidden="true" /> Contact us
              </a>
              <a href="https://my.stayos.co.za/support" data-btn-primary>
                <MessageCircle size={14} aria-hidden="true" /> Open a support ticket
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────────────────────── */}
      <div data-cta-section>
        <div data-container>
          <h2 data-section-heading>Ready to get started?</h2>
          <p data-section-intro>
            Join thousands of guests, students, property owners and agencies who trust
            StayOS every day.
          </p>
          <div data-cta-actions>
            <a href="/search" data-btn-white>
              <Search size={16} aria-hidden="true" /> Search properties
            </a>
            <a href="/signup/property" data-btn-outline-white>
              <Building2 size={16} aria-hidden="true" /> List your property
            </a>
          </div>
        </div>
      </div>

      <PublicFooter />
    </>
  );
}
