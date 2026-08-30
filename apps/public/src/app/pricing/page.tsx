import React from 'react';
import { Check, Minus, ArrowRight, ChevronDown } from 'lucide-react';
import { PublicHeader, PublicFooter } from '@/components/PublicLayout';
import PageBanner from '@/components/PageBanner';

export const metadata = {
  title: 'Pricing — StayOS',
  description: 'Fair, transparent pricing for hospitality operators and student housing providers in South Africa.',
};

type Plan = {
  name: string; slug: string; price: string;
  annual: string | null; sixMonth: string | null;
  desc: string; limit: string;
  onboarding?: string;
  features: string[]; cta: string; href: string; featured: boolean;
};

// ── Hospitality plans ─────────────────────────────────────────────────────────
const HOSPITALITY_PLANS: Plan[] = [
  {
    name: 'Starter', slug: 'starter',
    price: 'R499', annual: 'R399', sixMonth: 'R449',
    desc: 'Everything a single property needs to get started.',
    limit: '10 rooms · 3 staff',
    features: ['Direct bookings', 'Room management', 'Guest folios', 'Basic reporting', 'Email support', '14-day free trial'],
    cta: 'Start free trial', href: '/signup/property', featured: false,
  },
  {
    name: 'Growth', slug: 'growth',
    price: 'R1,099', annual: 'R879', sixMonth: 'R989',
    desc: 'For growing operators ready to add more properties.',
    limit: '30 rooms · 10 staff',
    features: ['Everything in Starter', 'Multiple properties', 'Housekeeping module', 'Staff management', 'Priority support', '14-day free trial'],
    cta: 'Start free trial', href: '/signup/property', featured: true,
  },
  {
    name: 'Pro', slug: 'pro',
    price: 'R2,199', annual: 'R1,759', sixMonth: 'R1,979',
    desc: 'Advanced tools for serious hospitality businesses.',
    limit: '100 rooms · 25 staff',
    features: ['Everything in Growth', 'AI pricing engine', 'Advanced reporting', 'Outbound webhooks', 'API access', '14-day free trial'],
    cta: 'Start free trial', href: '/signup/property', featured: false,
  },
  {
    name: 'Enterprise', slug: 'enterprise',
    price: 'Custom', annual: null, sixMonth: null,
    desc: 'Custom solutions for large portfolios and chains.',
    limit: 'Unlimited rooms & staff',
    features: ['Everything in Pro', 'White-label portal', 'Open API', 'Dedicated account manager', 'SLA guarantee', 'Custom onboarding'],
    cta: "Let's talk", href: '/contact', featured: false,
  },
];

const HOSPITALITY_ROWS: [string, ...string[]][] = [
  ['Rooms included',        '10',      '30',       '100',       'Unlimited'],
  ['Staff logins',          '3',       '10',        '25',       'Unlimited'],
  ['Direct bookings',       '✓',       '✓',         '✓',        '✓'        ],
  ['Multiple properties',   '—',       '✓',         '✓',        '✓'        ],
  ['Housekeeping module',   '—',       '✓',         '✓',        '✓'        ],
  ['Staff management',      '—',       '✓',         '✓',        '✓'        ],
  ['Advanced reporting',    '—',       '—',         '✓',        '✓'        ],
  ['AI pricing engine',     '—',       '—',         '✓',        '✓'        ],
  ['Outbound webhooks',     '—',       '—',         '✓',        '✓'        ],
  ['Open API',              '—',       '—',         '—',        '✓'        ],
  ['White-label portal',    '—',       '—',         '—',        '✓'        ],
  ['Bundle discounts',      '✓',       '✓',         '✓',        'Custom'   ],
  ['Support',               'Email',   'Priority',  'Priority', 'Dedicated'],
  ['Free trial',            '14 days', '14 days',   '14 days',  '—'        ],
];

// ── PBSA / Student housing plans ──────────────────────────────────────────────
const PBSA_PLANS: Plan[] = [
  {
    name: 'PBSA Starter', slug: 'pbsa-starter',
    price: 'R799', annual: 'R639', sixMonth: null,
    desc: 'For smaller student residences getting started.',
    limit: '50 beds · 5 staff',
    onboarding: 'R3,500 once-off onboarding fee',
    features: ['Student applications portal', 'Room & bed management', 'NSFAS & bursary support', 'Lease management', 'Basic reporting', '14-day free trial'],
    cta: 'Start free trial', href: '/signup/property', featured: false,
  },
  {
    name: 'PBSA Growth', slug: 'pbsa-growth',
    price: 'R1,499', annual: 'R1,199', sixMonth: null,
    desc: 'For mid-size residences that need deeper reporting.',
    limit: '150 beds · 10 staff',
    onboarding: 'R3,500 once-off onboarding fee',
    features: ['Everything in PBSA Starter', 'Advanced reporting', 'Multi-year lease support', 'Priority support', '14-day free trial'],
    cta: 'Start free trial', href: '/signup/property', featured: true,
  },
  {
    name: 'PBSA Pro', slug: 'pbsa-pro',
    price: 'R2,499', annual: 'R1,999', sixMonth: null,
    desc: 'For large residences and multi-campus operators.',
    limit: '500 beds · unlimited staff',
    onboarding: 'R3,500 once-off onboarding fee',
    features: ['Everything in PBSA Growth', 'Multiple properties', 'Open API', 'Outbound webhooks', 'Priority support', '14-day free trial'],
    cta: 'Start free trial', href: '/signup/property', featured: false,
  },
  {
    name: 'PBSA Enterprise', slug: 'pbsa-enterprise',
    price: 'Custom', annual: null, sixMonth: null,
    desc: 'For universities and large private providers.',
    limit: 'Unlimited beds & staff',
    onboarding: 'Onboarding fee waived',
    features: ['Everything in PBSA Pro', 'White-label portal', 'Custom integrations', 'Dedicated account manager', 'SLA guarantee'],
    cta: "Let's talk", href: '/contact', featured: false,
  },
];

const PBSA_ROWS: [string, ...string[]][] = [
  ['Beds included',          '50',      '150',       '500',       'Unlimited'],
  ['Staff logins',           '5',       '10',        'Unlimited', 'Unlimited'],
  ['Student applications',   '✓',       '✓',         '✓',        '✓'        ],
  ['NSFAS & bursary',        '✓',       '✓',         '✓',        '✓'        ],
  ['Lease management',       '✓',       '✓',         '✓',        '✓'        ],
  ['Advanced reporting',     '—',       '✓',         '✓',        '✓'        ],
  ['Multiple properties',    '—',       '—',         '✓',        '✓'        ],
  ['Open API',               '—',       '—',         '✓',        '✓'        ],
  ['Outbound webhooks',      '—',       '—',         '✓',        '✓'        ],
  ['White-label portal',     '—',       '—',         '—',        '✓'        ],
  ['Onboarding fee',         'R3,500',  'R3,500',    'R3,500',   'Waived'   ],
  ['Support',                'Email',   'Priority',  'Priority', 'Dedicated'],
  ['Free trial',             '14 days', '14 days',   '14 days',  '—'        ],
];

const FAQS = [
  { q: 'Is there a free trial?',
    a: 'Yes. All paid plans include a 14-day free trial. No credit card required. Enterprise plans are set up on a custom basis with no trial period.' },
  { q: 'What is the difference between hospitality and PBSA plans?',
    a: 'Hospitality plans are for hotels, guesthouses, and rentals. PBSA plans are purpose-built for student housing providers and include the university module — student applications, NSFAS billing, room allocations, and lease management.' },
  { q: 'Can I change plans later?',
    a: 'Yes. You can upgrade or downgrade at any time. Charges are prorated automatically.' },
  { q: 'What are the bundle discounts on hospitality plans?',
    a: 'Operators on Growth, Pro or Enterprise with 3 or more properties get a 10% discount. 5 or more properties qualify for 15% off.' },
  { q: 'What is the PBSA onboarding fee?',
    a: 'PBSA Starter, Growth and Pro plans include a once-off R3,500 onboarding fee that covers data import, system configuration and staff training. This fee is waived for PBSA Enterprise.' },
  { q: 'What happens if I exceed my room or bed limit?',
    a: "We'll notify you and give you 30 days to upgrade before new bookings or applications are paused." },
  { q: 'Are there setup fees on hospitality plans?',
    a: 'No setup fees on any hospitality plan. You pay only the monthly or annual subscription.' },
  { q: 'What payment methods do you accept?',
    a: 'Credit/debit card, EFT and debit orders. All prices are in ZAR and exclude VAT.' },
];

function renderCell(v: string): React.ReactElement {
  if (v === '✓') return <Check size={16} aria-label="Included" data-check />;
  if (v === '—') return <Minus size={14} aria-label="Not included" data-minus />;
  return <>{v}</>;
}

function PlanGrid({ plans }: { plans: Plan[] }): React.ReactElement {
  return (
    <div data-pricing-grid>
      {plans.map((plan) => (
        <div key={plan.slug} data-pricing-card data-featured={plan.featured ? '' : undefined}>
          {plan.featured && <span data-pricing-badge>Most popular</span>}
          <div data-plan-name>{plan.name}</div>
          <div data-plan-desc>{plan.desc}</div>
          <div data-plan-limit>{plan.limit}</div>
          <div data-plan-price-label>From</div>
          <div data-plan-price>
            {plan.price}
            {plan.price !== 'Custom' && <span data-price-unit>/mo</span>}
          </div>
          {plan.annual && (
            <div data-plan-billing>R{plan.annual}/mo billed annually</div>
          )}
          {plan.onboarding && (
            <div data-plan-onboarding>{plan.onboarding}</div>
          )}
          <ul data-plan-features>
            {plan.features.map((f) => (
              <li key={f} data-plan-feature>
                <Check size={15} aria-hidden="true" />
                {f}
              </li>
            ))}
          </ul>
          <a
            href={plan.href}
            data-btn-primary={plan.featured ? '' : undefined}
            data-btn-secondary={!plan.featured ? '' : undefined}
            data-plan-cta
          >
            {plan.cta}
          </a>
        </div>
      ))}
    </div>
  );
}

function ComparisonTable({ plans, rows }: { plans: Plan[]; rows: [string, ...string[]][] }): React.ReactElement {
  return (
    <div data-comparison-table-wrap>
      <table data-comparison-table>
        <thead>
          <tr>
            <th>Feature</th>
            {plans.map((p) => (
              <th key={p.slug} data-featured={p.featured ? '' : undefined}>{p.name}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(([feat, ...vals]) => (
            <tr key={feat}>
              <td>{feat}</td>
              {vals.map((v, i) => <td key={i}>{renderCell(v)}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function PricingPage(): React.ReactElement {
  return (
    <>
      <PublicHeader activePage="/pricing" />

      <PageBanner
        label="Pricing"
        heading="Plans that grow with your business."
        sub="Separate plans for hospitality operators and student housing providers. All prices in ZAR, excl. VAT."
      />

      {/* ── Hospitality plans ───────────────────────────────────────────────── */}
      <section data-section>
        <div data-container>
          <span data-section-label>HOSPITALITY</span>
          <h2 data-section-heading>Hotels, guesthouses &amp; rentals</h2>
          <p data-section-intro>
            For hotels, guesthouses and rental operators. All hospitality plans
            include a 14-day free trial and no setup fees.
          </p>

          <PlanGrid plans={HOSPITALITY_PLANS} />

          <div data-info-banner>
            <strong>Bundle discount:</strong> 3+ properties get 10% off. 5+ properties get 15% off.
            {' '}
            <a href="/contact" data-link>
              Talk to our team <ArrowRight size={12} aria-hidden="true" />
            </a>
          </div>

          <h3 data-section-subheading>Full feature comparison</h3>
          <ComparisonTable plans={HOSPITALITY_PLANS} rows={HOSPITALITY_ROWS} />
        </div>
      </section>

      {/* ── PBSA plans ──────────────────────────────────────────────────────── */}
      <section data-section data-white>
        <div data-container>
          <span data-section-label>STUDENT HOUSING</span>
          <h2 data-section-heading>PBSA &amp; student residences</h2>
          <p data-section-intro>
            Purpose-built for student housing providers. Every PBSA plan includes
            the full university module — applications, NSFAS billing, room
            allocations and lease management.
          </p>

          <PlanGrid plans={PBSA_PLANS} />

          <div data-info-banner>
            PBSA plans include a once-off <strong>R3,500 onboarding fee</strong> (waived on Enterprise)
            covering data import, configuration and staff training.
            {' '}
            <a href="/contact" data-link>
              Talk to our team <ArrowRight size={12} aria-hidden="true" />
            </a>
          </div>

          <h3 data-section-subheading>Full feature comparison</h3>
          <ComparisonTable plans={PBSA_PLANS} rows={PBSA_ROWS} />
        </div>
      </section>

      {/* ── FAQ ─────────────────────────────────────────────────────────────── */}
      <section data-section>
        <div data-container>
          <span data-section-label>FAQS</span>
          <h2 data-section-heading>Frequently asked questions</h2>
          <div data-accordion>
            {FAQS.map((f) => (
              <details key={f.q}>
                <summary>
                  {f.q}
                  <ChevronDown size={16} aria-hidden="true" data-chevron />
                </summary>
                <p data-answer>{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────────────────────── */}
      <div data-cta-section>
        <div data-container>
          <h2 data-section-heading>Ready to get started?</h2>
          <p data-section-intro>Start your 14-day free trial — no credit card required.</p>
          <div data-cta-actions>
            <a href="/signup/property" data-btn-white>
              Start free trial <ArrowRight size={16} aria-hidden="true" />
            </a>
            <a href="/contact" data-btn-outline-white>Talk to sales</a>
          </div>
        </div>
      </div>

      <PublicFooter />
    </>
  );
}
