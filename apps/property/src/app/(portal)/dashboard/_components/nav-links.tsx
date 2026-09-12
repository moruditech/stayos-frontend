'use client';

import React from 'react';
import Link from 'next/link';
import { Icons } from '@stayos/ui';
import type { LucideIcon } from '@stayos/ui';

// Local, next/link-based equivalents of @stayos/ui's LinkArrow and
// QuickActionsBar.
//
// Those shared components render their own `<a href="#" onClick={...}>` —
// @stayos/ui is also consumed by the Vite/React Router agency and admin
// apps, which have no next/link to depend on, so the shared versions can't
// use it. This page needs real, crawlable, right-click-able navigation, so
// these local versions swap in an actual <Link href> while keeping the
// exact same data-* attributes, so the existing design-system CSS applies
// unchanged.

export function LinkArrowTo({ href, children }: { href: string; children: React.ReactNode }): React.ReactElement {
  return (
    <Link href={href} data-link-arrow>
      {children} <Icons.ArrowRight />
    </Link>
  );
}

export interface QuickActionLinkItem {
  icon: LucideIcon;
  title: string;
  description: string;
  href: string;
}

export function QuickActionsBarLinks({ actions }: { actions: QuickActionLinkItem[] }): React.ReactElement {
  return (
    <div data-quick-actions>
      {actions.map((action) => (
        <Link key={action.href} href={action.href} data-quick-action>
          <div data-quick-action-icon>
            <action.icon size={18} />
          </div>
          <div>
            <div data-quick-action-title>{action.title}</div>
            <div data-quick-action-desc>{action.description}</div>
          </div>
          <Icons.ArrowRight data-quick-action-arrow />
        </Link>
      ))}
    </div>
  );
}
