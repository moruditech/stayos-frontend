import React from 'react';

interface PageBannerProps {
  label: string;
  heading: string;
  sub: string;
  children?: React.ReactNode;
}

export default function PageBanner({ label, heading, sub, children }: PageBannerProps): React.ReactElement {
  return (
    <div data-banner>
      <div data-banner-overlay aria-hidden="true" />
      <div data-banner-inner>
        <span data-banner-label>{label}</span>
        <h1 data-banner-heading>{heading}</h1>
        <p data-banner-sub>{sub}</p>
        {children && <div data-banner-extra>{children}</div>}
      </div>
    </div>
  );
}
