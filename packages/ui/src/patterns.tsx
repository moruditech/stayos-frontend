import React from 'react';
import * as Icons from './icons';
import type { LucideIcon } from './icons';

// ── Page header ─────────────────────────────────────────────────────────────

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string | undefined;
  actions?: React.ReactNode;
}): React.ReactElement {
  return (
    <div data-page-header>
      <div>
        <h1 data-page-title>{title}</h1>
        {subtitle ? <p data-page-subtitle>{subtitle}</p> : null}
      </div>
      {actions ? <div data-page-header-actions>{actions}</div> : null}
    </div>
  );
}

// ── Stat card ───────────────────────────────────────────────────────────────

export type StatTone = 'green' | 'amber' | 'purple' | 'teal' | 'blue' | 'rose';

export function StatCard({
  icon: IconCmp,
  tone = 'green',
  label,
  value,
  sublabel,
  trend,
  footer,
}: {
  icon: LucideIcon;
  tone?: StatTone;
  label: string;
  value: React.ReactNode;
  sublabel?: string | undefined;
  trend?: { direction: 'up' | 'down' | 'flat'; label: string };
  footer?: React.ReactNode;
}): React.ReactElement {
  return (
    <div data-stat-card>
      <div data-stat-icon data-tone={tone}>
        <IconCmp size={19} />
      </div>
      <div data-stat-value data-tabular-nums>{value}</div>
      <div data-stat-label>{label}</div>
      {sublabel ? <div data-stat-sublabel>{sublabel}</div> : null}
      {trend ? (
        <span data-stat-trend data-direction={trend.direction}>
          {trend.direction === 'up' ? <Icons.ArrowUp /> : trend.direction === 'down' ? <Icons.ArrowDown /> : <Icons.Minus />}
          {trend.label}
        </span>
      ) : null}
      {footer ? <div data-stat-footer-link>{footer}</div> : null}
    </div>
  );
}

// ── Panel ───────────────────────────────────────────────────────────────────

export function Panel({
  title,
  description,
  headerActions,
  children,
  padded = true,
  tightBody = false,
}: {
  title?: string | undefined;
  description?: string | undefined;
  headerActions?: React.ReactNode;
  children: React.ReactNode;
  padded?: boolean;
  tightBody?: boolean;
}): React.ReactElement {
  return (
    <section data-panel>
      {title ? (
        <div data-panel-header>
          <div data-panel-title-group>
            <h2 data-section-title>{title}</h2>
            {description ? <span data-panel-desc>{description}</span> : null}
          </div>
          {headerActions}
        </div>
      ) : null}
      <div data-panel-body={padded ? true : undefined} data-tight={tightBody ? 'true' : undefined}>
        {children}
      </div>
    </section>
  );
}

// ── Link-arrow (used as panel header actions / row footers) ──────────────────

export function LinkArrow({ children, onClick }: { children: React.ReactNode; onClick?: () => void }): React.ReactElement {
  return (
    <a href="#" data-link-arrow onClick={(e) => { e.preventDefault(); onClick?.(); }}>
      {children} <Icons.ArrowRight />
    </a>
  );
}

// ── Insight list (small icon + label + value rows) ────────────────────────

export function InsightList({
  items,
}: {
  items: { icon: LucideIcon; label: string; value: React.ReactNode }[];
}): React.ReactElement {
  return (
    <div data-insight-list>
      {items.map((item, i) => (
        <div key={i} data-insight-row>
          <div data-insight-icon>
            <item.icon size={15} />
          </div>
          <span data-insight-label>{item.label}</span>
          <span data-insight-value data-tabular-nums>{item.value}</span>
        </div>
      ))}
    </div>
  );
}

// ── Activity feed ───────────────────────────────────────────────────────────

export interface ActivityEntry {
  icon: LucideIcon;
  title: string;
  meta?: string | undefined;
  time: string;
}

export function ActivityFeed({ items, emptyLabel = 'No recent activity' }: { items: ActivityEntry[]; emptyLabel?: string }): React.ReactElement {
  if (items.length === 0) {
    return (
      <div data-empty-state>
        <div data-empty-state-description>{emptyLabel}</div>
      </div>
    );
  }
  return (
    <div data-activity-list>
      {items.map((item, i) => (
        <div key={i} data-activity-item>
          <div data-activity-icon>
            <item.icon size={15} />
          </div>
          <div data-activity-body>
            <div data-activity-title>{item.title}</div>
            {item.meta ? <div data-activity-meta>{item.meta}</div> : null}
          </div>
          <div data-activity-time>{item.time}</div>
        </div>
      ))}
    </div>
  );
}

// ── Alert list ───────────────────────────────────────────────────────────────

export interface AlertEntry {
  tone: 'danger' | 'warning' | 'info';
  icon: LucideIcon;
  title: string;
  meta?: string | undefined;
  action?: React.ReactNode;
}

export function AlertList({ items, emptyLabel = 'Nothing needs your attention right now' }: { items: AlertEntry[]; emptyLabel?: string }): React.ReactElement {
  if (items.length === 0) {
    return (
      <div data-empty-state>
        <Icons.CheckCircle2 size={22} style={{ color: 'var(--color-success)' }} />
        <div data-empty-state-description>{emptyLabel}</div>
      </div>
    );
  }
  return (
    <div>
      {items.map((item, i) => (
        <div key={i} data-alert-row>
          <div data-alert-icon data-tone={item.tone}>
            <item.icon size={15} />
          </div>
          <div data-alert-body>
            <div data-alert-title>{item.title}</div>
            {item.meta ? <div data-alert-meta>{item.meta}</div> : null}
          </div>
          {item.action}
        </div>
      ))}
    </div>
  );
}

// ── Ranked list (top performers) ───────────────────────────────────────────

export interface RankEntry {
  title: string;
  meta?: string | undefined;
  thumbUrl?: string | undefined;
  barPercent?: number;
  value: React.ReactNode;
}

export function RankList({ items }: { items: RankEntry[] }): React.ReactElement {
  if (items.length === 0) {
    return (
      <div data-empty-state>
        <div data-empty-state-description>Nothing to rank yet</div>
      </div>
    );
  }
  return (
    <div>
      {items.map((item, i) => (
        <div key={i} data-rank-row>
          <span data-rank-num>{i + 1}</span>
          {item.thumbUrl ? <img data-rank-thumb src={item.thumbUrl} alt="" /> : null}
          <div data-rank-body>
            <div data-rank-title>{item.title}</div>
            {item.meta ? <div data-rank-meta>{item.meta}</div> : null}
          </div>
          {item.barPercent !== undefined ? (
            <div data-rank-bar-track>
              <div data-rank-bar-fill style={{ width: `${Math.min(100, item.barPercent)}%` }} />
            </div>
          ) : null}
          <span data-rank-value data-tabular-nums>{item.value}</span>
        </div>
      ))}
    </div>
  );
}

// ── Quick actions strip ─────────────────────────────────────────────────────

export interface QuickAction {
  icon: LucideIcon;
  title: string;
  description: string;
  onClick: () => void;
}

export function QuickActionsBar({ actions }: { actions: QuickAction[] }): React.ReactElement {
  return (
    <div data-quick-actions>
      {actions.map((action, i) => (
        <a
          key={i}
          href="#"
          data-quick-action
          onClick={(e) => {
            e.preventDefault();
            action.onClick();
          }}
        >
          <div data-quick-action-icon>
            <action.icon size={18} />
          </div>
          <div>
            <div data-quick-action-title>{action.title}</div>
            <div data-quick-action-desc>{action.description}</div>
          </div>
          <Icons.ArrowRight data-quick-action-arrow />
        </a>
      ))}
    </div>
  );
}

// StatusBadge already exists in primitives.tsx (status + data-status pill) —
// import it from '@stayos/ui' directly rather than redefining it here.

// ── Simple empty block for tables/lists with a call to action ─────────────

export function EmptyBlock({
  icon: IconCmp = Icons.Circle,
  title,
  description,
  action,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string | undefined;
  action?: React.ReactNode;
}): React.ReactElement {
  return (
    <div data-empty-state>
      <IconCmp size={26} />
      <div data-empty-state-title>{title}</div>
      {description ? <div data-empty-state-description>{description}</div> : null}
      {action ? <div data-empty-state-action>{action}</div> : null}
    </div>
  );
}

// ── Loading block ────────────────────────────────────────────────────────

export function LoadingBlock({ rows = 4 }: { rows?: number }): React.ReactElement {
  return (
    <div data-skeleton>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} data-skeleton-row />
      ))}
    </div>
  );
}
