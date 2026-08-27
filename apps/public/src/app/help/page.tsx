import React from 'react';
import {
  BookOpen, Search, CreditCard, User, Building2, Landmark,
  ArrowRight, ChevronDown, MessageCircle, Mail, HelpCircle,
  GraduationCap, ShieldCheck, Zap, Users, type LucideIcon,
} from 'lucide-react';
import { PublicHeader, PublicFooter } from '@/components/PublicLayout';

export const metadata = {
  title: 'Help Centre — StayOS',
  description: 'Find guides, FAQs and troubleshooting articles for guests, students, property owners and agencies on the StayOS platform.',
};

const CATEGORIES: { icon: LucideIcon; title: string; slug: string; desc: string; count: number }[] = [
  { icon: Search,       title: 'Getting Started',         slug: 'getting-started',  desc: 'Create an account, navigate the platform and take your first steps.',       count: 8  },
  { icon: BookOpen,     title: 'Bookings & Reservations', slug: 'bookings',          desc: 'How to book, modify, cancel and understand confirmation emails.',            count: 12 },
  { icon: CreditCard,   title: 'Payments & Billing',      slug: 'payments',          desc: 'Payment methods, invoices, refunds and failed transaction troubleshooting.', count: 10 },
  { icon: User,         title: 'Account & Profile',       slug: 'account',           desc: 'Update your profile, reset your password and manage communication prefs.',   count: 7  },
  { icon: GraduationCap,title: 'Student Accommodation',   slug: 'students',          desc: 'Applications, leases, billing and move-in processes for students.',          count: 9  },
  { icon: Building2,    title: 'Property Owners',         slug: 'property-owners',   desc: 'Onboarding, room setup, bookings management and operations guides.',          count: 14 },
  { icon: Landmark,     title: 'Agencies',                slug: 'agencies',          desc: 'Managing mandates, properties, staff and agency billing.',                   count: 6  },
  { icon: ShieldCheck,  title: 'Privacy & Security',      slug: 'privacy',           desc: 'How your data is stored, POPIA rights and account security.',                count: 5  },
];

const FEATURED: { category: string; title: string; slug: string }[] = [
  { category: 'Getting Started',         title: 'How to create a StayOS account',                    slug: 'getting-started/create-account'           },
  { category: 'Bookings & Reservations', title: 'How to make a booking',                              slug: 'bookings/how-to-book'                     },
  { category: 'Bookings & Reservations', title: 'Cancellation and refund policy',                     slug: 'bookings/cancellation-policy'             },
  { category: 'Payments & Billing',      title: 'Supported payment methods',                          slug: 'payments/supported-methods'               },
  { category: 'Payments & Billing',      title: 'Why was my payment declined?',                       slug: 'payments/payment-declined'                },
  { category: 'Account & Profile',       title: 'How to reset your password',                         slug: 'account/reset-password'                   },
  { category: 'Student Accommodation',   title: 'How to apply for student accommodation',             slug: 'students/how-to-apply'                    },
  { category: 'Property Owners',         title: 'Getting your property live on StayOS',              slug: 'property-owners/go-live'                  },
];

const FAQS = [
  { q: 'How do I book accommodation on StayOS?',                a: 'Browse properties at stayos.co.za, choose your dates, and complete your booking through the Customer Portal at my.stayos.co.za. You will receive a confirmation email once the booking is confirmed.' },
  { q: 'What payment methods does StayOS support?',             a: 'We support PayFast, Ozow and Stripe, covering credit and debit cards, EFT and instant EFT. All payments are processed securely.' },
  { q: 'How do I cancel a booking?',                            a: 'Log in to your Customer Portal, go to your booking, and select Cancel Booking. Refund eligibility depends on the property\'s cancellation policy shown at the time of booking.' },
  { q: 'How do students apply for accommodation?',              a: 'Browse student housing listings and submit an application directly from the property page. No account is required to apply, but you will need one to manage your application.' },
  { q: 'How do I list my property on StayOS?',                  a: 'Register at stayos.co.za/signup/property and complete our onboarding process. Our team will review and verify your listing before it goes live.' },
  { q: 'How does the Q Points loyalty programme work?',         a: 'Guests earn Q Points on every eligible stay and activity. Points can be redeemed for discounts and upgrades on future bookings through the Customer Portal.' },
  { q: 'How do I contact StayOS support?',                      a: 'Use the Support section in your Customer Portal to open a ticket, email us at hello@stayos.co.za, or use the contact form on our Contact page.' },
  { q: 'Is my personal data safe on StayOS?',                   a: 'Yes. All data is encrypted at rest and in transit. We are fully POPIA-compliant and we never sell or share your personal data with third parties without your consent.' },
];

export default function HelpCentrePage(): React.ReactElement {
  return (
    <>
      <PublicHeader activePage="/help" />

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section style={{ background: 'var(--color-primary)', color: 'white', padding: 'var(--space-16) var(--page-padding-x)', textAlign: 'center' }}>
        <span style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--font-bold)', letterSpacing: '0.1em', textTransform: 'uppercase', opacity: 0.7, display: 'block', marginBottom: 'var(--space-4)' }}>
          HELP CENTRE
        </span>
        <h1 style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 'var(--font-bold)', lineHeight: 'var(--leading-tight)', marginBottom: 'var(--space-4)', maxWidth: '560px', margin: '0 auto var(--space-4)' }}>
          How can we help you?
        </h1>
        <p style={{ fontSize: 'var(--text-base)', opacity: 0.85, maxWidth: '480px', margin: '0 auto var(--space-8)', lineHeight: 'var(--leading-relaxed)' }}>
          Guides, FAQs and troubleshooting articles for guests, students, property owners and agencies.
        </p>
        <div style={{ display: 'flex', gap: 'var(--space-6)', justifyContent: 'center', flexWrap: 'wrap' }}>
          {[
            { icon: Zap,            label: 'Fast answers',      sub: 'Browse by category below' },
            { icon: Users,          label: 'All user types',    sub: 'Guests, students, operators' },
            { icon: MessageCircle,  label: 'Still stuck?',      sub: 'Open a support ticket' },
          ].map((f) => (
            <div key={f.label} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
              <span style={{ opacity: 0.8 }}><f.icon size={20} aria-hidden="true" /></span>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-semibold)' }}>{f.label}</div>
                <div style={{ fontSize: 'var(--text-xs)', opacity: 0.75 }}>{f.sub}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Categories ────────────────────────────────────────────────────── */}
      <section data-section>
        <div data-container>
          <span data-section-label>BROWSE BY TOPIC</span>
          <h2 data-section-heading>What do you need help with?</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 'var(--space-5)', marginTop: 'var(--space-8)' }}>
            {CATEGORIES.map((cat) => (
              <a
                key={cat.slug}
                href={`/help/${cat.slug}`}
                style={{ textDecoration: 'none', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', padding: 'var(--space-6)', borderRadius: 'var(--radius-lg)', border: '1.5px solid var(--color-border)', background: 'var(--color-surface)', transition: 'border-color var(--transition-fast), box-shadow var(--transition-fast)', cursor: 'pointer' }}
              >
                <div style={{ color: 'var(--color-primary)', width: '44px', height: '44px', background: 'var(--color-primary-light)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <cat.icon size={22} aria-hidden="true" />
                </div>
                <div>
                  <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-bold)', color: 'var(--color-text-primary)', marginBottom: 'var(--space-1)' }}>{cat.title}</div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', lineHeight: 'var(--leading-relaxed)' }}>{cat.desc}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto', paddingTop: 'var(--space-2)' }}>
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>{cat.count} articles</span>
                  <ArrowRight size={14} aria-hidden="true" style={{ color: 'var(--color-primary)' }} />
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* ── Featured articles ─────────────────────────────────────────────── */}
      <section data-section style={{ background: 'var(--color-surface)' }}>
        <div data-container>
          <span data-section-label>POPULAR ARTICLES</span>
          <h2 data-section-heading>Most read guides</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 'var(--space-4)', marginTop: 'var(--space-8)' }}>
            {FEATURED.map((article) => (
              <a
                key={article.slug}
                href={`/help/${article.slug}`}
                style={{ textDecoration: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--space-4)', padding: 'var(--space-4) var(--space-5)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)', background: 'white', transition: 'border-color var(--transition-fast)' }}
              >
                <div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginBottom: '4px' }}>{article.category}</div>
                  <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-medium)', color: 'var(--color-text-primary)', lineHeight: 'var(--leading-snug)' }}>{article.title}</div>
                </div>
                <ArrowRight size={14} aria-hidden="true" style={{ color: 'var(--color-primary)', flexShrink: 0 }} />
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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 'var(--space-4)', marginTop: 'var(--space-8)' }}>
            {FAQS.map((faq) => (
              <details key={faq.q} data-card-padded style={{ cursor: 'pointer' }}>
                <summary style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-medium)', listStyle: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--space-2)' }}>
                  {faq.q} <ChevronDown size={16} aria-hidden="true" style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
                </summary>
                <p style={{ marginTop: 'var(--space-3)', fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', lineHeight: 'var(--leading-relaxed)' }}>
                  {faq.a}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── Still need help callout ───────────────────────────────────────── */}
      <section data-section style={{ background: 'var(--color-surface)' }}>
        <div data-container>
          <div data-support-callout>
            <div data-support-callout-text>
              <span data-support-callout-icon aria-hidden="true"><HelpCircle size={20} /></span>
              <div>
                <strong>Still need help?</strong>
                <p>Our support team is available Monday to Friday, 08:00 — 17:00 SAST.</p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
              <a href="/contact" data-btn-secondary style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <Mail size={14} aria-hidden="true" /> Contact us
              </a>
              <a href="https://my.stayos.co.za/support" data-btn-primary style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <MessageCircle size={14} aria-hidden="true" /> Open a support ticket
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────────────────────── */}
      <div style={{ background: 'var(--color-primary)', color: 'white', padding: 'var(--space-12) var(--page-padding-x)', textAlign: 'center' }}>
        <h2 style={{ fontSize: 'var(--text-2xl)', fontWeight: 'var(--font-bold)', marginBottom: 'var(--space-2)' }}>
          Ready to get started?
        </h2>
        <p style={{ opacity: 0.85, marginBottom: 'var(--space-6)', fontSize: 'var(--text-base)' }}>
          Join thousands of guests, students, property owners and agencies who trust StayOS every day.
        </p>
        <div style={{ display: 'flex', gap: 'var(--space-4)', justifyContent: 'center', flexWrap: 'wrap' }}>
          <a href="/search" style={{ padding: 'var(--space-3) var(--space-6)', background: 'white', color: 'var(--color-primary)', borderRadius: 'var(--radius-md)', fontWeight: 'var(--font-semibold)', fontSize: 'var(--text-sm)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <Search size={16} aria-hidden="true" /> Search properties
          </a>
          <a href="/signup/property" style={{ padding: 'var(--space-3) var(--space-6)', background: 'rgba(255,255,255,0.15)', color: 'white', border: '1.5px solid rgba(255,255,255,0.4)', borderRadius: 'var(--radius-md)', fontWeight: 'var(--font-semibold)', fontSize: 'var(--text-sm)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <Building2 size={16} aria-hidden="true" /> List your property
          </a>
        </div>
      </div>

      <PublicFooter />
    </>
  );
}
