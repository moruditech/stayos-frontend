import React from 'react';
import {
  User,
  Building,
  Briefcase,
  Globe,
  Lock,
  Mail,
  MessageCircle,
  BookOpen,
  ArrowRight,
  type LucideIcon,
} from 'lucide-react';
import { PublicHeader, PublicFooter } from '@/components/PublicLayout';

export const metadata = {
  title: 'Log in — StayOS',
  description: 'Choose your portal to log in to StayOS.',
};

const PORTALS: {
  icon: LucideIcon;
  label: string;
  desc: string;
  cta: string;
  href: string;
  domain: string;
}[] = [
  {
    icon: User,
    label: 'Guest & Customer Portal',
    desc: 'Book and manage accommodation, track your stays, earn rewards and access support — all in one place.',
    cta: 'Log in as a guest',
    href: 'https://my.stayos.co.za/login',
    domain: 'my.stayos.co.za',
  },
  {
    icon: Building,
    label: 'Property Operations Portal',
    desc: 'Manage bookings, rooms, staff, maintenance, payments and reporting for your property or residence.',
    cta: 'Log in as an operator',
    href: 'https://app.stayos.co.za/login',
    domain: 'app.stayos.co.za',
  },
  {
    icon: Briefcase,
    label: 'Agency Portal',
    desc: 'Manage multiple properties, mandates, staff and owner statements from one agency dashboard.',
    cta: 'Log in as an agency',
    href: 'https://agency.stayos.co.za/login',
    domain: 'agency.stayos.co.za',
  },
];

const HELP_ITEMS: { icon: LucideIcon; title: string; body: string }[] = [
  {
    icon: Lock,
    title: 'Forgot your password?',
    body: 'Use the "Forgot password" link on your portal login page to reset it via email.',
  },
  {
    icon: User,
    title: 'Not registered yet?',
    body: 'Guests and students can sign up at my.stayos.co.za. Property owners start at stayos.co.za/signup/property.',
  },
  {
    icon: Globe,
    title: 'Not sure which portal to use?',
    body: 'Guests and students use the Customer Portal. Property teams use the Operations Portal. Agencies have their own dedicated portal.',
  },
  {
    icon: BookOpen,
    title: 'Need help?',
    body: 'Visit our Help Centre for step-by-step guides, or contact our support team on the Contact page.',
  },
];

const SUPPORT_LINKS: { icon: LucideIcon; label: string; href: string }[] = [
  { icon: MessageCircle, label: 'Visit Help Centre',  href: '/help'    },
  { icon: Mail,          label: 'Contact Support',    href: '/contact' },
  { icon: Building,      label: 'List Your Property', href: '/signup/property' },
];

export default function LoginPickerPage(): React.ReactElement {
  return (
    <div data-picker-page>
      <PublicHeader />

      {/* ── Picker hero ───────────────────────────────────────────────────── */}
      <div data-picker-hero>
        <h1>Welcome back to StayOS</h1>
        <p data-picker-subtitle>Choose your portal to continue</p>
        <p data-picker-description>
          StayOS has separate portals for guests, property operators and agencies.
          Select the one that applies to you.
        </p>
      </div>

      {/* ── Portal cards ──────────────────────────────────────────────────── */}
      <div data-portal-grid>
        {PORTALS.map((portal) => (
          <a key={portal.label} href={portal.href} data-portal-card>
            <div data-portal-icon aria-hidden="true">
              <portal.icon size={22} />
            </div>
            <div data-portal-label>{portal.label}</div>
            <p data-portal-desc>{portal.desc}</p>
            <span data-btn-primary data-portal-cta>
              {portal.cta} <ArrowRight size={14} aria-hidden="true" />
            </span>
            <div data-portal-domain>
              <Globe size={11} aria-hidden="true" />
              {portal.domain}
            </div>
          </a>
        ))}
      </div>

      {/* ── Contextual help ───────────────────────────────────────────────── */}
      <div data-picker-help>
        <div data-picker-help-inner>
          {HELP_ITEMS.map((item) => (
            <div key={item.title} data-picker-help-item>
              <div data-picker-help-item-icon aria-hidden="true">
                <item.icon size={20} />
              </div>
              <div>
                <h3>{item.title}</h3>
                <p>{item.body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Support links ─────────────────────────────────────────────────── */}
      <div data-picker-support>
        <h2>Need something else?</h2>
        <div data-support-links>
          {SUPPORT_LINKS.map((link) => (
            <a key={link.label} href={link.href} data-support-link>
              <link.icon size={16} aria-hidden="true" />
              {link.label}
              <ArrowRight size={13} aria-hidden="true" />
            </a>
          ))}
        </div>
      </div>

      <PublicFooter />
    </div>
  );
}
