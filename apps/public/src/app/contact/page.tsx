'use client';
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { PublicHeader, PublicFooter } from '@/components/PublicLayout';
import { contactSchema } from '@stayos/validators';
import type { ContactInput } from '@stayos/validators';
import { InlineError } from '@stayos/ui';
import {
  Mail, Headphones, Building2, Users, Phone, MessageSquare,
  BookOpen, MapPin, CheckCircle2, ChevronDown, ArrowRight,
  Zap, ShieldCheck,
  type LucideIcon,
} from 'lucide-react';

// NOTE: POST /public/contact backend route is not yet implemented.
// Form schema is ready; the api call is feature-flagged off until Phase 3.

const CATEGORIES: { id: string; icon: LucideIcon; label: string; desc: string }[] = [
  { id: 'sales',       icon: Mail,       label: 'General Enquiries',   desc: 'Questions about StayOS, our platform, or how we can help you.'        },
  { id: 'support',     icon: Headphones, label: 'Customer Support',    desc: 'Get help with bookings, accounts, payments and more.'                  },
  { id: 'partnership', icon: Building2,  label: 'For Property Owners', desc: 'Learn how StayOS can help grow and streamline your property business.' },
  { id: 'other',       icon: Users,      label: 'For Agencies',        desc: 'Partner with StayOS and manage multiple properties with ease.'         },
];

const CONTACT_METHODS: { icon: LucideIcon; label: string; value: string; sub: string }[] = [
  { icon: Phone,         label: 'Call Us',     value: '+27 10 123 4567',           sub: 'Mon – Fri, 08:00 – 17:00 SAST'      },
  { icon: Mail,          label: 'Email Us',    value: 'hello@stayos.co.za',        sub: 'We aim to respond within 1 business day' },
  { icon: MessageSquare, label: 'Live Chat',   value: 'Available on our website',  sub: 'Mon – Fri, 08:00 – 17:00 SAST'      },
  { icon: MessageSquare, label: 'WhatsApp',    value: '+27 82 123 4567',           sub: 'Quick support on the go'             },
];

const OFFICES = [
  {
    city: 'Cape Town',    type: 'Head Office',
    address: 'The Foundry, Level 3\n16 Ebenezer Road\nSalt River, Cape Town\n7925',
  },
  {
    city: 'Johannesburg', type: 'Regional Office',
    address: '6th Floor, Rosebank Towers\n19 Biermann Avenue\nRosebank, Johannesburg\n2196',
  },
  {
    city: 'Durban',       type: 'Support Centre',
    address: 'Suite 402, Umhlanga Ridge\n1 Ncondo Place\nUmhlanga, Durban\n4319',
  },
];

const FAQS = [
  { q: 'How do I book accommodation on StayOS?',      a: 'Browse properties at stayos.co.za, select dates, and complete your booking through the Customer Portal.'         },
  { q: 'Is StayOS available for student accommodation?', a: 'Yes — we work with universities and private student housing providers across South Africa.'                  },
  { q: 'Does StayOS integrate with OTAs?',            a: 'Yes, through iCal sync with Airbnb, Booking.com and other major OTA platforms.'                                 },
  { q: 'How can property owners get started?',        a: 'Register at stayos.co.za/signup/property and complete our onboarding process.'                                  },
  { q: 'How do agencies manage multiple properties?', a: 'Agencies get a dedicated portal at agency.stayos.co.za with mandate management and portfolio oversight.'        },
  { q: 'How does the loyalty program work?',          a: 'Guests earn Q Points on every stay, redeemable for discounts and upgrades.'                                      },
  { q: 'What payment methods are supported?',         a: 'PayFast, Ozow, Stripe — covering cards, EFT and instant EFT.'                                                   },
  { q: "How do I contact support if I'm a guest?",   a: 'Use the Support section in your Customer Portal, or email hello@stayos.co.za.'                                   },
  { q: 'Where can I find API documentation?',         a: 'API documentation is available for Pro and Enterprise plan subscribers at docs.stayos.co.za.'                   },
];

export default function ContactPage(): React.ReactElement {
  const [selectedCategory, setSelectedCategory] = useState<string>('sales');
  const [submitted, setSubmitted]               = useState(false);
  const [submitting, setSubmitting]             = useState(false);

  const form = useForm<ContactInput>({
    resolver: zodResolver(contactSchema),
    defaultValues: { name: '', email: '', phone: '', subject: 'sales', message: '' },
  });

  function selectCategory(id: string): void {
    setSelectedCategory(id);
    form.setValue('subject', id as ContactInput['subject']);
  }

  async function handleSubmit(values: ContactInput): Promise<void> {
    setSubmitting(true);
    try {
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

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section data-page-hero>
        <img
          data-page-hero-bg
          src="/images/public/contact-hero.jpg"
          alt="StayOS support team"
          loading="eager"
        />
        <div data-page-hero-overlay aria-hidden="true" />
        <div data-page-hero-content>
          <span data-page-hero-label>CONTACT US</span>
          <h1 data-page-hero-heading>
            We&apos;re here to help you succeed.
          </h1>
          <p data-page-hero-sub>
            Whether you&apos;re a guest, student, property owner or agency, our team is
            ready to assist. Reach out using any of the options below.
          </p>
          <div data-page-hero-trust>
            {[
              { icon: Zap,         title: 'Fast & Friendly Support', sub: 'We typically respond within one business day.'   },
              { icon: ShieldCheck, title: 'Trusted & Secure',        sub: 'Your data is protected and never shared.'        },
              { icon: Users,       title: 'Real People, Real Help',  sub: 'No bots. Just our dedicated team.'               },
            ].map((f) => (
              <div key={f.title} data-page-hero-trust-item>
                <f.icon size={18} aria-hidden="true" data-trust-icon />
                <div>
                  <span data-trust-title>{f.title}</span>
                  <span data-trust-sub>{f.sub}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Contact form section ──────────────────────────────────────────── */}
      <section data-section data-white>
        <div data-container>

          {/* Category tabs */}
          <div data-contact-tabs role="tablist" aria-label="Contact category">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                role="tab"
                data-contact-tab
                data-active={selectedCategory === cat.id ? '' : undefined}
                aria-selected={selectedCategory === cat.id}
                onClick={() => selectCategory(cat.id)}
              >
                <cat.icon size={15} aria-hidden="true" />
                {cat.label}
              </button>
            ))}
          </div>

          {/* 2-col: form + contact info */}
          <div data-contact-layout>

            {/* Form */}
            <div id="email">
              <div data-contact-form-meta>
                <h2>Send us a message</h2>
                <p>Fill in the form and we&apos;ll get back to you within one business day.</p>
              </div>

              {submitted ? (
                <div data-success-state>
                  <CheckCircle2 size={44} aria-hidden="true" data-success-icon />
                  <h3>Message sent!</h3>
                  <p>
                    Thank you for reaching out. We&apos;ll get back to you within one
                    business day.
                  </p>
                </div>
              ) : (
                <form
                  data-contact-form
                  onSubmit={form.handleSubmit((v) => void handleSubmit(v))}
                  noValidate
                >
                  <div data-form-group>
                    <label htmlFor="name">Full name *</label>
                    <input
                      id="name"
                      type="text"
                      placeholder="Your full name"
                      autoComplete="name"
                      {...form.register('name')}
                    />
                    <InlineError message={form.formState.errors.name?.message} />
                  </div>
                  <div data-form-group>
                    <label htmlFor="email">Email address *</label>
                    <input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      autoComplete="email"
                      {...form.register('email')}
                    />
                    <InlineError message={form.formState.errors.email?.message} />
                  </div>
                  <div data-form-group>
                    <label htmlFor="subject">Subject *</label>
                    <select
                      id="subject"
                      {...form.register('subject')}
                      onChange={(e) => selectCategory(e.target.value)}
                    >
                      <option value="sales">General Enquiries</option>
                      <option value="support">Customer Support</option>
                      <option value="partnership">For Property Owners / Agencies</option>
                      <option value="other">Other</option>
                    </select>
                    <InlineError message={form.formState.errors.subject?.message} />
                  </div>
                  <div data-form-group>
                    <label htmlFor="message">Message *</label>
                    <textarea
                      id="message"
                      rows={5}
                      placeholder="How can we help you?"
                      {...form.register('message')}
                    />
                    <InlineError message={form.formState.errors.message?.message} />
                  </div>
                  <p data-legal-note>
                    By submitting this form, you agree to our{' '}
                    <a href="/legal/privacy" data-link>Privacy Policy</a>.
                  </p>
                  <button type="submit" disabled={submitting} data-btn-primary data-btn-full>
                    {submitting ? 'Sending…' : (
                      <><Mail size={16} aria-hidden="true" /> Send message</>
                    )}
                  </button>
                </form>
              )}
            </div>

            {/* Contact info sidebar */}
            <aside data-contact-info>
              <h3 data-contact-info-heading>Other ways to reach us</h3>
              {CONTACT_METHODS.map((c) => (
                <div key={c.label} data-contact-info-item>
                  <div data-contact-info-icon aria-hidden="true">
                    <c.icon size={20} />
                  </div>
                  <div data-contact-info-text>
                    <strong>{c.label}</strong>
                    <span>{c.value}</span>
                    <small>{c.sub}</small>
                  </div>
                </div>
              ))}
            </aside>
          </div>
        </div>
      </section>

      {/* ── Help centre callout ───────────────────────────────────────────── */}
      <div data-container>
        <div data-support-callout>
          <div data-support-callout-text>
            <span data-support-callout-icon aria-hidden="true">
              <BookOpen size={20} />
            </span>
            <div>
              <strong>Looking for help fast?</strong>
              <p>Visit our Help Centre for guides, FAQs and troubleshooting.</p>
            </div>
          </div>
          <a href="/help" data-btn-secondary>
            Go to Help Centre <ArrowRight size={14} aria-hidden="true" />
          </a>
        </div>
      </div>

      {/* ── Offices ───────────────────────────────────────────────────────── */}
      <section data-section>
        <div data-container>
          <span data-section-label>OUR OFFICES</span>
          <h2 data-section-heading>Find us in person</h2>
          <div data-offices-grid>
            {OFFICES.map((o) => (
              <div key={o.city} data-office-item>
                <div data-office-city>{o.city}</div>
                <div data-office-type>{o.type}</div>
                <div data-office-address>{o.address}</div>
                <a
                  href={`https://maps.google.com/?q=${encodeURIComponent(o.address)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-office-map-link
                >
                  <MapPin size={14} aria-hidden="true" /> View on map
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ───────────────────────────────────────────────────────────── */}
      <section data-section data-white>
        <div data-container>
          <span data-section-label>FAQS</span>
          <h2 id="faq" data-section-heading>Frequently asked questions</h2>
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
          <a href="/help" data-section-link>
            View full Help Centre <ArrowRight size={14} aria-hidden="true" />
          </a>
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────────────────────── */}
      <div data-cta-section>
        <div data-container>
          <h2 data-section-heading>Still need help?</h2>
          <p data-section-intro>
            Our team is here for you. Let&apos;s find the best solution for your needs.
          </p>
          <div data-cta-actions>
            <a href="#email" data-btn-white>
              <Mail size={16} aria-hidden="true" /> Send us a message
            </a>
            <a href="/help" data-btn-outline-white>
              Visit Help Centre <ArrowRight size={14} aria-hidden="true" />
            </a>
          </div>
        </div>
      </div>

      <PublicFooter />
    </>
  );
}
