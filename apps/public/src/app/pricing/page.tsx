import React from 'react';
import { Check, Minus, ArrowRight, ChevronDown } from 'lucide-react';
import { PublicHeader, PublicFooter } from '@/components/PublicLayout';
import PageBanner from '@/components/PageBanner';

export const metadata = {
  title: 'Pricing — StayOS',
  description: 'Fair, transparent pricing for every hospitality and student housing business in South Africa.',
};

const PLANS = [
  {
    name: 'Starter',      price: 'R349',   billing: 'per month, billed annually',
    desc: 'Get started with the essentials.',
    features: ['Up to 5 rooms', 'Direct bookings', 'Basic reports', 'Email support', 'iCal sync (1 channel)'],
    cta: 'Start free trial', featured: false,
  },
  {
    name: 'Professional', price: 'R799',   billing: 'per month, billed annually',
    desc: 'Everything you need to grow.',
    features: ['Up to 30 rooms', 'All Starter features', 'Advanced reports', 'Priority support', 'iCal sync (5 channels)', 'Housekeeping module', 'Loyalty programme', 'Staff management'],
    cta: 'Start free trial', featured: true,
  },
  {
    name: 'Business',     price: 'R1,499', billing: 'per month, billed annually',
    desc: 'Powerful features for serious operators.',
    features: ['Up to 100 rooms', 'All Professional features', 'AI pricing', 'Procurement module', 'HR module', 'Webhooks & API access', 'White-label owner portal', 'Multiple properties'],
    cta: 'Start free trial', featured: false,
  },
  {
    name: 'Enterprise',   price: 'Custom', billing: 'Custom pricing',
    desc: 'Custom solutions for large portfolios.',
    features: ['Unlimited rooms', 'All Business features', 'Dedicated account manager', 'Custom integrations', 'SLA guarantee', 'On-site training', 'Custom reporting'],
    cta: "Let's talk", featured: false,
  },
];

const COMPARISON_ROWS: [string, ...string[]][] = [
  ['Rooms included',       '5',       '30',       '100',      'Unlimited'],
  ['Direct bookings',      '✓',       '✓',        '✓',        '✓'        ],
  ['Channel sync (iCal)',  '1',       '5',        'Unlimited', 'Unlimited'],
  ['Housekeeping module',  '—',       '✓',        '✓',        '✓'        ],
  ['Maintenance module',   '—',       '✓',        '✓',        '✓'        ],
  ['Staff management',     '—',       '✓',        '✓',        '✓'        ],
  ['Advanced reports',     '—',       '✓',        '✓',        '✓'        ],
  ['Loyalty programme',    '—',       '✓',        '✓',        '✓'        ],
  ['AI pricing',           '—',       '—',        '✓',        '✓'        ],
  ['University module',    '—',       '—',        '✓',        '✓'        ],
  ['API & webhooks',       '—',       '—',        '✓',        '✓'        ],
  ['Multiple properties',  '—',       '—',        '✓',        '✓'        ],
  ['Dedicated manager',    '—',       '—',        '—',        '✓'        ],
  ['Custom integrations',  '—',       '—',        '—',        '✓'        ],
  ['Support',              'Email',   'Priority', 'Priority', 'Dedicated'],
];

const FAQS = [
  { q: 'Is there a free trial?',                            a: 'Yes. All paid plans include a 14-day free trial. No credit card required.'                               },
  { q: 'Can I change plans later?',                         a: 'Yes. You can upgrade or downgrade at any time. Charges are prorated automatically.'                      },
  { q: 'What happens if I exceed my room limit?',           a: "We'll notify you and give you 30 days to upgrade before bookings are paused."                           },
  { q: 'Is the student housing module included?',           a: 'The university module is available on Business and Enterprise plans, or as an add-on.'                  },
  { q: 'Are there setup fees?',                             a: 'No setup fees on any plan. You only pay the monthly or annual subscription.'                             },
  { q: 'What payment methods do you accept?',               a: 'Credit/debit card, EFT and debit orders. All prices exclude VAT.'                                       },
];

function renderCell(v: string): React.ReactElement {
  if (v === '✓') return <Check size={16} aria-label="Included" data-check />;
  if (v === '—') return <Minus size={14} aria-label="Not included" data-minus />;
  return <>{v}</>;
}

export default function PricingPage(): React.ReactElement {
  return (
    <>
      <PublicHeader activePage="/pricing" />

      <PageBanner
        label="Pricing"
        heading="Plans that grow with your business."
        sub="Choose the plan that fits you today, with the flexibility to scale tomorrow. All prices in ZAR, excl. VAT."
      />

      {/* ── Plan cards ────────────────────────────────────────────────────── */}
      <section data-section>
        <div data-container>
          <div data-pricing-grid>
            {PLANS.map((plan) => (
              <div
                key={plan.name}
                data-pricing-card
                data-featured={plan.featured ? '' : undefined}
              >
                {plan.featured && <span data-pricing-badge>Most popular</span>}
                <div data-plan-name>{plan.name}</div>
                <div data-plan-desc>{plan.desc}</div>
                <div data-plan-price-label>From</div>
                <div data-plan-price>
                  {plan.price}
                  {plan.price !== 'Custom' && <span data-price-unit>/mo</span>}
                </div>
                <div data-plan-billing>{plan.billing}</div>
                <ul data-plan-features>
                  {plan.features.map((f) => (
                    <li key={f} data-plan-feature>
                      <Check size={15} aria-hidden="true" />
                      {f}
                    </li>
                  ))}
                </ul>
                <a
                  href={plan.name === 'Enterprise' ? '/contact' : '/signup/property'}
                  data-btn-primary={plan.featured ? '' : undefined}
                  data-btn-secondary={!plan.featured ? '' : undefined}
                  data-plan-cta
                >
                  {plan.cta}
                </a>
              </div>
            ))}
          </div>

          <div data-info-banner>
            All plans include a <strong>14-day free trial</strong> — no credit card required.
            {' '}Questions?{' '}
            <a href="/contact" data-link>
              Talk to our team <ArrowRight size={12} aria-hidden="true" />
            </a>
          </div>

          <h2 data-section-heading>Full feature comparison</h2>
          <div data-comparison-table-wrap>
            <table data-comparison-table>
              <thead>
                <tr>
                  <th>Feature</th>
                  {PLANS.map((p) => (
                    <th key={p.name} data-featured={p.featured ? '' : undefined}>{p.name}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {COMPARISON_ROWS.map(([feat, ...vals]) => (
                  <tr key={feat}>
                    <td>{feat}</td>
                    {vals.map((v, i) => <td key={i}>{renderCell(v)}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ── FAQ ───────────────────────────────────────────────────────────── */}
      <section data-section data-white>
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

      {/* ── CTA ───────────────────────────────────────────────────────────── */}
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
