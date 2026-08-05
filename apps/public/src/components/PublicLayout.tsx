import React from 'react';

// ── Public Header ─────────────────────────────────────────────────────────────

interface PublicHeaderProps {
  activePage?: string;
}

export function PublicHeader({ activePage }: PublicHeaderProps): React.ReactElement {
  const navLinks = [
    { label: 'Services', path: '/services' },
    { label: 'Pricing',  path: '/pricing' },
    { label: 'Search',   path: '/search' },
    { label: 'About',    path: '/about' },
    { label: 'Contact',  path: '/contact' },
  ];

  return (
    <header data-public-header>
      <a href="/" data-logo>
        <span data-logo-wordmark>
          Stay<span data-logo-accent>OS</span>
        </span>
        <span data-logo-tagline>Built for hospitality. Designed for people.</span>
      </a>

      <nav data-public-nav aria-label="Main navigation">
        {navLinks.map((link) => (
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
        <a href="/login" data-btn-secondary>Log in</a>
        <a href="/signup/property" data-btn-primary>List your property</a>
      </div>
    </header>
  );
}

// ── Public Footer ─────────────────────────────────────────────────────────────

export function PublicFooter(): React.ReactElement {
  const year = new Date().getFullYear();

  return (
    <footer data-public-footer>
      <div data-footer-grid>
        {/* Brand */}
        <div data-footer-brand>
          <a href="/" data-logo>
            <span data-logo-wordmark style={{ fontSize: 'var(--text-xl)', fontWeight: 'var(--font-bold)' }}>
              Stay<span data-logo-accent>OS</span>
            </span>
          </a>
          <p>Built for hospitality. Designed for people.</p>
          <div data-footer-social>
            <a href="#" aria-label="Facebook">f</a>
            <a href="#" aria-label="Instagram">ig</a>
            <a href="#" aria-label="LinkedIn">in</a>
            <a href="#" aria-label="YouTube">yt</a>
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
        </div>

        {/* For Operators */}
        <div data-footer-col>
          <strong>For Operators</strong>
          <a href="/signup/property">List your property</a>
          <a href="https://app.stayos.co.za/login">Property login</a>
          <a href="https://agency.stayos.co.za/login">Agency login</a>
        </div>

        {/* Legal + newsletter */}
        <div data-footer-col>
          <strong>Legal</strong>
          <a href="/legal/privacy">Privacy Policy</a>
          <a href="/legal/terms">Terms of Service</a>
          <a href="/legal/cookies">Cookie Policy</a>

          <div data-footer-newsletter style={{ marginTop: 'var(--space-6)' }}>
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
