'use client';
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { PublicHeader, PublicFooter } from '@/components/PublicLayout';
import { contactSchema } from '@stayos/validators';
import type { ContactInput } from '@stayos/validators';
import { InlineError } from '@stayos/ui';
// NOTE: POST /public/contact and ContactInquiry backend model do not yet exist.
// The form schema is ready; the api call is feature-flagged off until the
// backend route is built (confirmed absent — see Phase 3 implementation plan).

const CATEGORIES = [
  { id: 'sales',       icon: '✉️', label: 'General Enquiries',    desc: 'Questions about StayOS, our platform, or how we can help you.' },
  { id: 'support',     icon: '🎧', label: 'Customer Support',     desc: 'Get help with bookings, accounts, payments and more.' },
  { id: 'partnership', icon: '🏢', label: 'For Property Owners',  desc: 'Learn how StayOS can help grow and streamline your property business.' },
  { id: 'other',       icon: '👥', label: 'For Agencies',         desc: 'Partner with StayOS and manage multiple properties with ease.' },
];

const OFFICES = [
  {
    city: 'Cape Town',   type: 'Head Office',
    address: 'The Foundry, Level 3\n16 Ebenezer Road\nSalt River, Cape Town\n7925',
    image: '/images/public/office-cape-town.jpg',
  },
  {
    city: 'Johannesburg', type: 'Regional Office',
    address: '6th Floor, Rosebank Towers\n19 Biermann Avenue\nRosebank, Johannesburg\n2196',
    image: '/images/public/office-johannesburg.jpg',
  },
  {
    city: 'Durban',      type: 'Support Centre',
    address: 'Suite 402, Umhlanga Ridge\n1 Ncondo Place\nUmhlanga, Durban\n4319',
    image: '/images/public/office-durban.jpg',
  },
];

const FAQS = [
  { q: 'How do I book accommodation on StayOS?', a: 'Browse properties at stayos.co.za, select dates, and complete your booking through the Customer Portal.' },
  { q: 'Is StayOS available for student accommodation?', a: 'Yes — we work with universities and private student housing providers across South Africa.' },
  { q: 'Does StayOS integrate with OTAs?', a: 'Yes, through iCal sync with Airbnb, Booking.com and other major OTA platforms.' },
  { q: 'How can property owners get started?', a: 'Register at stayos.co.za/signup/property and complete our onboarding process.' },
  { q: 'How do agencies manage multiple properties?', a: 'Agencies get a dedicated portal at agency.stayos.co.za with mandate management and portfolio oversight.' },
  { q: 'How does the loyalty program work?', a: 'Guests earn Q Points on every stay, redeemable for discounts and upgrades.' },
  { q: 'What payment methods are supported?', a: 'PayFast, Ozow, Stripe — covering cards, EFT and instant EFT.' },
  { q: 'How do I contact support if I\'m a guest?', a: 'Use the Support section in your Customer Portal, or email hello@stayos.co.za.' },
  { q: 'Where can I find API documentation?', a: 'API documentation is available for Pro and Enterprise plan subscribers at docs.stayos.co.za.' },
];

export default function ContactPage(): React.ReactElement {
  const [selectedCategory, setSelectedCategory] = useState<string>('sales');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const form = useForm<ContactInput>({
    resolver: zodResolver(contactSchema),
    defaultValues: { name: '', email: '', phone: '', subject: 'sales', message: '' },
  });

  // Sync selected category into the form's subject field
  function selectCategory(id: string): void {
    setSelectedCategory(id);
    form.setValue('subject', id as ContactInput['subject']);
  }

  async function handleSubmit(values: ContactInput): Promise<void> {
    setSubmitting(true);
    try {
      // POST /public/contact is not yet implemented on the backend.
      // Simulating success for UI purposes; wire api.contact.submit(values)
      // once the endpoint is built.
      await new Promise((r) => setTimeout(r, 800));
      console.log('Contact form values (endpoint pending):', values);
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <PublicHeader activePage="/contact" />

      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <section style={{ position: 'relative', overflow: 'hidden', minHeight: '360px', display: 'flex', alignItems: 'center' }}>
        {/* Image: /images/public/contact-hero.jpg — StayOS reception */}
        <img src="/images/public/contact-hero.jpg" alt="StayOS support"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 0 }}
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1 }} />
        <div data-container style={{ position: 'relative', zIndex: 2, color: 'white', padding: 'var(--space-16) var(--page-padding-x)' }}>
          <span style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--font-bold)', letterSpacing: '0.1em', textTransform: 'uppercase', opacity: 0.7, display: 'block', marginBottom: 'var(--space-4)' }}>
            CONTACT US
          </span>
          <h1 style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 'var(--font-bold)', lineHeight: 'var(--leading-tight)', marginBottom: 'var(--space-4)', maxWidth: '480px' }}>
            We&apos;re here to help you <span style={{ color: 'var(--color-accent)' }}>succeed.</span>
          </h1>
          <p style={{ fontSize: 'var(--text-base)', opacity: 0.9, maxWidth: '460px', lineHeight: 'var(--leading-relaxed)', marginBottom: 'var(--space-8)' }}>
            Whether you&apos;re a guest, student, property owner, or agency, our team is ready to assist you. Reach out using any of the options below.
          </p>
          <div style={{ display: 'flex', gap: 'var(--space-8)', flexWrap: 'wrap' }}>
            {[
              { icon: '⚡', label: 'Fast & Friendly Support', sub: 'We typically respond within one business day.' },
              { icon: '🛡', label: 'Trusted & Secure', sub: 'Your data is protected and never shared.' },
              { icon: '👥', label: 'Real People, Real Help', sub: 'No bots. Just our dedicated team.' },
            ].map((f) => (
              <div key={f.label} style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-3)' }}>
                <span style={{ fontSize: 'var(--text-lg)', marginTop: '2px' }}>{f.icon}</span>
                <div>
                  <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-semibold)', marginBottom: '2px' }}>{f.label}</div>
                  <div style={{ fontSize: 'var(--text-xs)', opacity: 0.8 }}>{f.sub}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Main content grid ────────────────────────────────────────────── */}
      <section data-section>
        <div data-container>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr 1fr', gap: 'var(--space-12)', alignItems: 'flex-start' }}>

            {/* Category selector */}
            <div>
              <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--font-bold)', marginBottom: 'var(--space-6)' }}>
                Choose how you want to get in touch
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => selectCategory(cat.id)}
                    style={{
                      display: 'flex', alignItems: 'flex-start', gap: 'var(--space-4)',
                      padding: 'var(--space-4)', borderRadius: 'var(--radius-lg)',
                      border: `1.5px solid ${selectedCategory === cat.id ? 'var(--color-primary)' : 'var(--color-border)'}`,
                      background: selectedCategory === cat.id ? 'var(--color-primary-light)' : 'var(--color-surface)',
                      cursor: 'pointer', textAlign: 'left', transition: 'all var(--transition-fast)',
                    }}
                  >
                    <span style={{ fontSize: 'var(--text-xl)', flexShrink: 0, width: '40px', height: '40px', background: 'var(--color-surface-muted)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{cat.icon}</span>
                    <div>
                      <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-semibold)', color: 'var(--color-text-primary)', marginBottom: '4px' }}>{cat.label}</div>
                      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', lineHeight: 'var(--leading-relaxed)' }}>{cat.desc}</div>
                    </div>
                    <span style={{ marginLeft: 'auto', color: 'var(--color-text-muted)', flexShrink: 0 }}>›</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Contact form */}
            <div>
              <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--font-bold)', marginBottom: 'var(--space-2)' }}>Send us a message</h2>
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-6)' }}>Fill in the form and we&apos;ll get back to you.</p>

              {submitted ? (
                <div data-card-padded style={{ textAlign: 'center', padding: 'var(--space-12)' }}>
                  <div style={{ fontSize: 'var(--text-4xl)', marginBottom: 'var(--space-4)' }}>✅</div>
                  <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--font-bold)', marginBottom: 'var(--space-2)' }}>Message sent!</h3>
                  <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>
                    Thank you for reaching out. We&apos;ll get back to you within one business day.
                  </p>
                </div>
              ) : (
                <form onSubmit={form.handleSubmit((v) => void handleSubmit(v))} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
                  <div data-form-group>
                    <label htmlFor="name">Full name *</label>
                    <input id="name" type="text" placeholder="Your full name" autoComplete="name" {...form.register('name')} />
                    <InlineError message={form.formState.errors.name?.message} />
                  </div>
                  <div data-form-group>
                    <label htmlFor="email">Email address *</label>
                    <input id="email" type="email" placeholder="you@example.com" autoComplete="email" {...form.register('email')} />
                    <InlineError message={form.formState.errors.email?.message} />
                  </div>
                  <div data-form-group>
                    <label htmlFor="subject">Subject *</label>
                    <select id="subject" {...form.register('subject')} onChange={(e) => selectCategory(e.target.value)}>
                      <option value="sales">General Enquiries</option>
                      <option value="support">Customer Support</option>
                      <option value="partnership">For Property Owners / Agencies</option>
                      <option value="other">Other</option>
                    </select>
                    <InlineError message={form.formState.errors.subject?.message} />
                  </div>
                  <div data-form-group>
                    <label htmlFor="message">Message *</label>
                    <textarea id="message" rows={5} placeholder="How can we help you?" {...form.register('message')} style={{ resize: 'vertical' }} />
                    <InlineError message={form.formState.errors.message?.message} />
                  </div>
                  <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                    By submitting this form, you agree to our <a href="/legal/privacy" data-link>Privacy Policy</a>.
                  </p>
                  <button type="submit" disabled={submitting} data-btn-primary data-btn-full>
                    {submitting ? 'Sending…' : 'Send message ✉️'}
                  </button>
                </form>
              )}
            </div>

            {/* Other ways to reach us */}
            <div>
              <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--font-bold)', marginBottom: 'var(--space-6)' }}>Other ways to reach us</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
                {[
                  { icon: '📞', label: 'Call Us', value: '+27 10 123 4567', sub: 'Mon – Fri, 08:00 – 17:00 SAST' },
                  { icon: '✉️', label: 'Email Us', value: 'hello@stayos.co.za', sub: 'We aim to respond within 1 business day' },
                  { icon: '💬', label: 'Live Chat', value: 'Available on our website', sub: 'Mon – Fri, 08:00 – 17:00 SAST' },
                  { icon: '💬', label: 'WhatsApp', value: '+27 82 123 4567', sub: 'Quick support on the go' },
                ].map((c) => (
                  <div key={c.label} style={{ display: 'flex', gap: 'var(--space-4)', alignItems: 'flex-start' }}>
                    <span style={{ fontSize: 'var(--text-xl)', width: '40px', height: '40px', background: 'var(--color-primary-light)', borderRadius: 'var(--radius-full)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{c.icon}</span>
                    <div>
                      <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-semibold)', color: 'var(--color-primary)' }}>{c.label}</div>
                      <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-bold)', margin: '2px 0' }}>{c.value}</div>
                      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>{c.sub}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Help centre callout ──────────────────────────────────────────── */}
      <div data-container>
        <div data-support-callout>
          <div data-support-callout-text>
            <span data-support-callout-icon aria-hidden="true">📖</span>
            <div>
              <strong>Looking for help fast?</strong>
              <p>Visit our Help Centre for guides, FAQs and troubleshooting.</p>
            </div>
          </div>
          <a href="/help" data-btn-secondary>Go to Help Centre →</a>
        </div>
      </div>

      {/* ── Offices ──────────────────────────────────────────────────────── */}
      <section data-section>
        <div data-container>
          <h2 data-section-heading>Our offices</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 'var(--space-6)', marginTop: 'var(--space-8)' }}>
            {OFFICES.map((o) => (
              <div key={o.city} data-card>
                <div style={{ aspectRatio: '16/9', background: 'var(--color-surface-muted)', overflow: 'hidden' }}>
                  {/* Image path: o.image — e.g. /images/public/office-cape-town.jpg */}
                  <img src={o.image} alt={o.city}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    loading="lazy"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                </div>
                <div style={{ padding: 'var(--space-5)' }}>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-1)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{o.type}</div>
                  <div style={{ fontSize: 'var(--text-base)', fontWeight: 'var(--font-bold)', marginBottom: 'var(--space-2)', color: 'var(--color-text-primary)' }}>{o.city}, South Africa</div>
                  <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', whiteSpace: 'pre-line', lineHeight: 'var(--leading-relaxed)', marginBottom: 'var(--space-4)' }}>{o.address}</div>
                  <a href={`https://maps.google.com/?q=${encodeURIComponent(o.address)}`} target="_blank" rel="noopener noreferrer"
                    style={{ fontSize: 'var(--text-sm)', color: 'var(--color-primary)', fontWeight: 'var(--font-medium)', display: 'flex', alignItems: 'center', gap: 'var(--space-1)', textDecoration: 'none' }}>
                    📍 View on map
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ accordion ────────────────────────────────────────────────── */}
      <section data-section style={{ background: 'var(--color-surface)', paddingTop: 'var(--space-10)', paddingBottom: 'var(--space-16)' }}>
        <div data-container>
          <h2 data-section-heading style={{ marginBottom: 'var(--space-8)' }}>Frequently asked questions</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 'var(--space-3)' }}>
            {FAQS.map((faq, i) => (
              <div key={i} data-card-padded onClick={() => setOpenFaq(openFaq === i ? null : i)} style={{ cursor: 'pointer' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--space-2)' }}>
                  <span style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-medium)' }}>{faq.q}</span>
                  <span style={{ color: 'var(--color-text-muted)', flexShrink: 0, transition: 'transform 200ms', transform: openFaq === i ? 'rotate(90deg)' : 'none' }}>›</span>
                </div>
                {openFaq === i && (
                  <p style={{ marginTop: 'var(--space-3)', fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', lineHeight: 'var(--leading-relaxed)' }}>
                    {faq.a}
                  </p>
                )}
              </div>
            ))}
          </div>
          <div style={{ textAlign: 'center', marginTop: 'var(--space-8)' }}>
            <a href="/help/faqs" data-section-link>View all FAQs →</a>
          </div>
        </div>
      </section>

      {/* ── Final CTA ────────────────────────────────────────────────────── */}
      <div style={{ background: 'var(--color-primary)', color: 'white', padding: 'var(--space-12) var(--page-padding-x)', textAlign: 'center' }}>
        <div style={{ fontSize: 'var(--text-3xl)', marginBottom: 'var(--space-4)' }}>✉️</div>
        <h2 style={{ fontSize: 'var(--text-2xl)', fontWeight: 'var(--font-bold)', marginBottom: 'var(--space-2)' }}>Still need help?</h2>
        <p style={{ opacity: 0.85, marginBottom: 'var(--space-6)', fontSize: 'var(--text-base)' }}>
          Our team is here for you. Let&apos;s find the best solution for your needs.
        </p>
        <button type="button" style={{ padding: 'var(--space-3) var(--space-8)', background: 'white', color: 'var(--color-primary)', borderRadius: 'var(--radius-md)', fontWeight: 'var(--font-semibold)', fontSize: 'var(--text-sm)', cursor: 'pointer', border: 'none' }}>
          Contact our team →
        </button>
      </div>

      <PublicFooter />
    </>
  );
}
