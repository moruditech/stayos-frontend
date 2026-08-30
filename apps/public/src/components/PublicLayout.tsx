'use client';
import React, { useEffect, useState } from 'react';
import {
  Home,
  Building2,
  Tag,
  Search,
  Info,
  Mail,
  Menu,
  X,
  User,
  Building,
  Briefcase,
  ArrowRight,
  Lock,
  MessageCircle,
  HelpCircle,
  Send,
  Facebook,
  Instagram,
  Linkedin,
  Youtube,
} from 'lucide-react';

const NAV_LINKS = [
  { label: 'Services', path: '/services', icon: Building2 },
  { label: 'Pricing',  path: '/pricing',  icon: Tag       },
  { label: 'Search',   path: '/search',   icon: Search    },
  { label: 'About',    path: '/about',    icon: Info      },
  { label: 'Contact',  path: '/contact',  icon: Mail      },
];

const PORTALS = [
  {
    id: 'customer',
    icon: User,
    label: 'Guest & Customer Portal',
    description: 'Book, manage and track your stays and loyalty.',
    href: 'https://my.stayos.co.za/login',
  },
  {
    id: 'property',
    icon: Building,
    label: 'Property Operations Portal',
    description: 'Manage bookings, staff, maintenance and more.',
    href: 'https://app.stayos.co.za/login',
  },
  {
    id: 'agency',
    icon: Briefcase,
    label: 'Agency Portal',
    description: 'Manage properties, mandates, staff and statements.',
    href: 'https://agency.stayos.co.za/login',
  },
];

interface PublicHeaderProps {
  activePage?: string;
}

export function PublicHeader({ activePage }: PublicHeaderProps): React.ReactElement {
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!menuOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    function onKeyDown(e: KeyboardEvent): void {
      if (e.key === 'Escape') setMenuOpen(false);
    }
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [menuOpen]);

  return (
    <header data-public-header>
      <a href="/" data-logo>
        <span data-logo-wordmark>
          Stay<span data-logo-accent>OS</span>
        </span>
        <span data-logo-tagline>Built for hospitality. Designed for people.</span>
      </a>

      <nav data-public-nav aria-label="Main navigation">
        {NAV_LINKS.map((link) => (
          <a
            key={link.path}
            href={link.path}
            data-active={activePage === link.path ? '' : undefined}
          >
            {link.label}
          </a>
        ))}
      </nav>

      <div data-public-header-actions>
        <a href="/login" data-btn-secondary data-header-login>Log in</a>
        <a href="/signup/property" data-btn-primary data-header-list>List your property</a>
        <button
          type="button"
          data-menu-toggle
          aria-label="Open menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen(true)}
        >
          <Menu size={22} aria-hidden="true" />
        </button>
      </div>

      {/* Mobile drawer */}
      <div
        data-mobile-menu-overlay
        data-open={menuOpen ? '' : undefined}
        onClick={() => setMenuOpen(false)}
      >
        <div
          data-mobile-menu-panel
          role="dialog"
          aria-modal="true"
          aria-label="Site menu"
          onClick={(e) => e.stopPropagation()}
        >
          <div data-mobile-menu-header>
            <span data-logo-wordmark>
              Stay<span data-logo-accent>OS</span>
            </span>
            <button
              type="button"
              aria-label="Close menu"
              data-menu-close
              onClick={() => setMenuOpen(false)}
            >
              <X size={22} aria-hidden="true" />
            </button>
          </div>

          <p data-mobile-menu-tagline>Built for hospitality. Designed for people.</p>

          <nav data-mobile-menu-nav aria-label="Main navigation">
            <a href="/" data-mobile-menu-link data-active={activePage === '/' ? '' : undefined}>
              <Home size={18} aria-hidden="true" /> Home
            </a>
            {NAV_LINKS.map((link) => (
              <a
                key={link.path}
                href={link.path}
                data-mobile-menu-link
                data-active={activePage === link.path ? '' : undefined}
              >
                <link.icon size={18} aria-hidden="true" /> {link.label}
              </a>
            ))}
          </nav>

          <span data-mobile-menu-label>Portals</span>
          <div data-mobile-menu-portals>
            {PORTALS.map((portal) => (
              <a key={portal.id} href={portal.href} data-mobile-menu-portal>
                <span data-mobile-menu-portal-icon aria-hidden="true">
                  <portal.icon size={18} />
                </span>
                <span data-mobile-menu-portal-text>
                  <strong>{portal.label}</strong>
                  <span>{portal.description}</span>
                </span>
                <ArrowRight size={16} aria-hidden="true" data-mobile-menu-portal-arrow />
              </a>
            ))}
          </div>

          <div data-mobile-menu-actions>
            <a href="/login" data-btn-primary data-btn-full>
              <Lock size={16} aria-hidden="true" /> Log in
            </a>
            <a href="/signup/property" data-btn-secondary data-btn-full>
              <Building2 size={16} aria-hidden="true" /> List your property
            </a>
          </div>

          <div data-mobile-menu-support>
            <a href="/contact" data-mobile-menu-support-link>
              <MessageCircle size={16} aria-hidden="true" /> Contact Support
              <ArrowRight size={14} aria-hidden="true" />
            </a>
            <a href="/help" data-mobile-menu-support-link>
              <HelpCircle size={16} aria-hidden="true" /> Help Centre
              <ArrowRight size={14} aria-hidden="true" />
            </a>
            <a href="/contact#email" data-mobile-menu-support-link>
              <Send size={16} aria-hidden="true" /> Send us an Email
              <ArrowRight size={14} aria-hidden="true" />
            </a>
          </div>

          <div data-mobile-menu-social>
            <a href="#" aria-label="Facebook"><Facebook size={16} aria-hidden="true" /></a>
            <a href="#" aria-label="Instagram"><Instagram size={16} aria-hidden="true" /></a>
            <a href="#" aria-label="LinkedIn"><Linkedin size={16} aria-hidden="true" /></a>
            <a href="#" aria-label="YouTube"><Youtube size={16} aria-hidden="true" /></a>
          </div>
        </div>
      </div>
    </header>
  );
}

export function PublicFooter(): React.ReactElement {
  const year = new Date().getFullYear();

  return (
    <footer data-public-footer>
      <div data-footer-grid>
        {/* Brand */}
        <div data-footer-brand>
          <a href="/" data-logo>
            <span data-logo-wordmark>
              Stay<span data-logo-accent>OS</span>
            </span>
          </a>
          <p>Built for hospitality. Designed for people.</p>
          <div data-footer-social>
            <a href="#" aria-label="Facebook"><Facebook size={16} aria-hidden="true" /></a>
            <a href="#" aria-label="Instagram"><Instagram size={16} aria-hidden="true" /></a>
            <a href="#" aria-label="LinkedIn"><Linkedin size={16} aria-hidden="true" /></a>
            <a href="#" aria-label="YouTube"><Youtube size={16} aria-hidden="true" /></a>
          </div>
        </div>

        {/* Product */}
        <div data-footer-col>
          <strong>Product</strong>
          <a href="/services">Services</a>
          <a href="/pricing">Pricing</a>
          <a href="/search">Search properties</a>
        </div>

        {/* Company */}
        <div data-footer-col>
          <strong>Company</strong>
          <a href="/about">About us</a>
          <a href="/contact">Contact</a>
          <a href="/help">Help Centre</a>
        </div>

        {/* For Operators */}
        <div data-footer-col>
          <strong>For Operators</strong>
          <a href="/signup/property">List your property</a>
          <a href="https://app.stayos.co.za/login">Property login</a>
          <a href="https://agency.stayos.co.za/login">Agency login</a>
        </div>

        {/* Legal + Newsletter */}
        <div data-footer-col>
          <strong>Legal</strong>
          <a href="/legal/privacy">Privacy Policy</a>
          <a href="/legal/terms">Terms of Service</a>
          <a href="/legal/cookies">Cookie Policy</a>

          <div data-footer-newsletter>
            <strong>Stay in the loop</strong>
            <label htmlFor="newsletter-email">Get updates and industry insights.</label>
            <div data-footer-newsletter-form>
              <input
                id="newsletter-email"
                type="email"
                placeholder="Your email address"
                aria-label="Email address for newsletter"
              />
              <button type="button" data-btn-primary>Subscribe</button>
            </div>
          </div>
        </div>
      </div>

      <p data-footer-copyright>
        © {year} LekkerQ (Pty) Ltd. All rights reserved.
      </p>
    </footer>
  );
}
