'use client';
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from '@stayos/auth';
import { api } from '@stayos/api-client';
import { SkeletonLoader, EmptyState } from '@stayos/ui';
import { notificationKeys } from '@/lib/query-keys';

const ICONS: Record<string, string> = {
  booking:     '📅',
  payment:     '💳',
  application: '🎓',
  loyalty:     '⭐',
  system:      '🔔',
  support:     '🎧',
};

export default function NotificationsPage(): React.ReactElement {
  const session = useSession();
  const qc      = useQueryClient();
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const { data: notifications, isLoading } = useQuery({
    queryKey: notificationKeys.list(),
    queryFn:  () => api.notifications.list(),
    enabled:  !!session,
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => api.notifications.markRead(id),
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey: notificationKeys.list() });
      qc.invalidateQueries({ queryKey: notificationKeys.unreadCount() });
    },
  });

  const markAllMutation = useMutation({
    mutationFn: () => api.notifications.markAllRead(),
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey: notificationKeys.list() });
      qc.invalidateQueries({ queryKey: notificationKeys.unreadCount() });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.notifications.delete(id),
    onSuccess:  () => qc.invalidateQueries({ queryKey: notificationKeys.list() }),
  });

  const all    = (notifications as Record<string, unknown>[] | undefined) ?? [];
  const shown  = filter === 'unread' ? all.filter((n) => !(n['read'] as boolean)) : all;
  const unread = all.filter((n) => !(n['read'] as boolean)).length;

  return (
    <div data-page>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-2)', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
        <div>
          <h1 data-page-title>Notifications</h1>
          {unread > 0 && (
            <p data-page-subtitle>{unread} unread notification{unread !== 1 ? 's' : ''}</p>
          )}
        </div>
        {unread > 0 && (
          <button type="button" data-btn-ghost
            disabled={markAllMutation.isPending}
            onClick={() => markAllMutation.mutate()}>
            Mark all read
          </button>
        )}
      </div>

      <div data-filter-tabs style={{ marginBottom: 'var(--space-5)' }}>
        {(['all', 'unread'] as const).map((f) => (
          <button key={f} type="button" data-filter-tab
            data-active={filter === f ? '' : undefined}
            onClick={() => setFilter(f)}>
            {f === 'all' ? 'All' : `Unread${unread > 0 ? ` (${unread})` : ''}`}
          </button>
        ))}
      </div>

      {isLoading ? <SkeletonLoader rows={4} /> : shown.length === 0 ? (
        <EmptyState
          title={filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
          description="You'll see updates about your bookings, payments and applications here."
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          {shown.map((n) => {
            const notif   = n as Record<string, unknown>;
            const isRead  = notif['read'] as boolean;
            const type    = (notif['type'] as string) ?? 'system';
            const date    = new Date(notif['createdAt'] as string);
            const dateStr = date.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' });
            const timeStr = date.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' });
            return (
              <div key={notif['_id'] as string}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: 'var(--space-4)',
                  padding: 'var(--space-4)', background: isRead ? 'var(--color-surface)' : 'var(--color-primary-light)',
                  borderRadius: 'var(--radius-lg)', border: `1px solid ${isRead ? 'var(--color-border)' : 'var(--color-primary)'}`,
                  cursor: 'pointer', transition: 'background var(--transition-fast)',
                }}
                onClick={() => { if (!isRead) markReadMutation.mutate(notif['_id'] as string); }}
              >
                <div style={{ width: '40px', height: '40px', background: isRead ? 'var(--color-surface-muted)' : 'rgba(27,77,62,0.12)', borderRadius: 'var(--radius-full)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 'var(--text-lg)', flexShrink: 0 }}>
                  {ICONS[type] ?? '🔔'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 'var(--text-sm)', fontWeight: isRead ? 'var(--font-normal)' : 'var(--font-semibold)', marginBottom: '4px' }}>
                    {notif['title'] as string}
                  </div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', lineHeight: 'var(--leading-relaxed)' }}>
                    {notif['message'] as string}
                  </div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginTop: 'var(--space-1)' }}>
                    {dateStr} at {timeStr}
                  </div>
                </div>
                {!isRead && (
                  <div style={{ width: '8px', height: '8px', background: 'var(--color-primary)', borderRadius: '50%', flexShrink: 0, marginTop: '6px' }} />
                )}
                <button type="button"
                  style={{ color: 'var(--color-text-muted)', flexShrink: 0, padding: 'var(--space-1)', fontSize: 'var(--text-sm)' }}
                  onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(notif['_id'] as string); }}
                  aria-label="Delete notification">✕</button>
              </div>
            );
          })}
        </div>
      )}

      <a href="/notifications/settings" data-btn-ghost data-btn-full style={{ marginTop: 'var(--space-6)' }}>
        ⚙ Notification settings
      </a>
    </div>
  );
}
