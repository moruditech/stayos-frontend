'use client';

import Link from 'next/link';

/**
 * Channel Management — iCal sync.
 * TAD 11 §17: calendar-level synchronisation with external OTA channels.
 * Every subscription imports ONE external calendar into ONE specific room
 * (src/models/IcalFeedSubscription.model.js) — there is no property-wide
 * "channel" or import/export "direction" concept on the backend. Exporting
 * a room's own availability out is a separate, per-room feature enabled on
 * the room itself in /rooms (see the info note below).
 */

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api } from '@stayos/api-client';
import type { ApiError } from '@stayos/api-client';
import { SkeletonLoader, EmptyState, StatusBadge, useToast, Modal, InlineError, ConfirmDialog, applyServerErrors, Icons } from '@stayos/ui';
import { channelKeys, roomKeys } from '@/lib/query-keys';

// Must match the backend exactly (src/modules/channels/ical.validation.js) —
// field names here are what applyServerErrors maps 422 responses onto.
const SOURCE_CHANNELS = ['airbnb', 'booking_com', 'agoda', 'lekkeslaap', 'safarinow', 'google_calendar', 'other'] as const;

const connectSchema = z.object({
  roomId:        z.string().min(1, 'Select a room'),
  label:         z.string().min(1, 'Label is required'),
  sourceChannel: z.enum(SOURCE_CHANNELS, { errorMap: () => ({ message: 'Select a channel' }) }),
  externalUrl:   z.string().url('Must be a valid iCal feed URL'),
});
type ConnectInput = z.infer<typeof connectSchema>;

const CHANNEL_LABELS: Record<(typeof SOURCE_CHANNELS)[number], string> = {
  airbnb: 'Airbnb', booking_com: 'Booking.com', agoda: 'Agoda',
  lekkeslaap: 'LekkeSlaap', safarinow: 'SafariNow', google_calendar: 'Google Calendar', other: 'Other',
};

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleString('en-ZA', { dateStyle: 'short', timeStyle: 'short' });
}

// isActive + lastFetchStatus + lastFetchedAt together decide the badge — the
// model has no single "status" field (see IcalFeedSubscription.model.js).
function statusOf(sub: { isActive: boolean; lastFetchedAt?: string | null; lastFetchStatus?: string | null }): string {
  if (!sub.isActive) return 'disconnected';
  if (!sub.lastFetchedAt) return 'pending first sync';
  return sub.lastFetchStatus ?? 'pending first sync';
}

export default function ChannelsPage(): React.ReactElement {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showConnect, setShowConnect] = useState(false);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [disconnectId, setDisconnectId] = useState<string | null>(null);
  const [selectedChannel, setSelectedChannel] = useState<(typeof SOURCE_CHANNELS)[number] | ''>('');

  const { data: channels, isLoading } = useQuery({
    queryKey: channelKeys.ical(),
    queryFn: () => api.channels.list(),
    staleTime: 120_000,
  });

  const { data: rooms, isLoading: roomsLoading } = useQuery({
    queryKey: roomKeys.list({ limit: 100 }),
    queryFn: () => api.rooms.list({ limit: 100 }),
    staleTime: 60_000,
  });

  const form = useForm<ConnectInput>({ resolver: zodResolver(connectSchema) });

  function resetModal(): void {
    form.reset();
    setSelectedChannel('');
  }

  const connectMutation = useMutation({
    mutationFn: (input: ConnectInput) => api.channels.connect(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: channelKeys.ical() });
      setShowConnect(false);
      resetModal();
      toast('Channel connected. Use "Sync now" to pull in bookings immediately.', 'success');
    },
    onError: (err: ApiError) => {
      if (err.code === 'VALIDATION_ERROR') {
        applyServerErrors(form, err);
        const hasUnattachedError = err.fields?.some((f) => !f.field);
        if (hasUnattachedError || !err.fields?.length) toast(err.message, 'error');
      } else {
        toast(err.message ?? 'Failed to connect channel.', 'error');
      }
    },
  });

  const syncMutation = useMutation({
    mutationFn: (id: string) => api.channels.sync(id),
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: channelKeys.ical() });
      setSyncingId(null);
      toast(
        result.status === 'suspicious'
          ? 'Sync paused — an unusually large number of cancellations was detected and skipped for safety. Check the feed.'
          : `Synced — ${result.created} new, ${result.cancelled} cancelled, ${result.modified} modified.`,
        result.status === 'suspicious' ? 'error' : 'success'
      );
    },
    onError: (err: ApiError) => { setSyncingId(null); toast(err.message ?? 'Sync failed.', 'error'); },
  });

  const disconnectMutation = useMutation({
    mutationFn: (id: string) => api.channels.disconnect(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: channelKeys.ical() });
      setDisconnectId(null);
      toast('Channel disconnected.', 'success');
    },
    onError: (err: ApiError) => { setDisconnectId(null); toast(err.message ?? 'Failed.', 'error'); },
  });

  return (
    <div data-page="channels">
      <div data-page-header>
        <div>
          <Link href="/settings/property" data-breadcrumb><Icons.ChevronLeft data-breadcrumb-icon aria-hidden="true" /> Settings</Link>
          <h1>Channel management</h1>
          <p data-page-subtitle>Import external OTA bookings into a room via its iCal feed</p>
        </div>
        <button type="button" data-btn-primary onClick={() => setShowConnect(true)}>
          + Connect channel
        </button>
      </div>

      <div data-channels-info>
        <p>
          Each connection imports one external calendar into one room. A room can have
          more than one connection (e.g. Airbnb and a personal Google Calendar). Syncs
          run automatically roughly every 45 minutes — you can also trigger one manually.
        </p>
        <p data-info-note>
          To export a room&apos;s own availability to an OTA, go to <Link href="/rooms" data-link>Rooms</Link> and
          enable the iCal export feed on that room — that&apos;s a separate, per-room setting.
        </p>
      </div>

      {isLoading ? <SkeletonLoader rows={3} /> : !channels?.length ? (
        <EmptyState
          title="No channels connected"
          description="Connect an external calendar to automatically import its bookings into a room."
          action={
            <button type="button" data-btn-primary onClick={() => setShowConnect(true)}>
              Connect first channel
            </button>
          }
        />
      ) : (
        <div data-channel-list>
          {channels.map((sub) => {
            const roomLabel = sub.roomId && typeof sub.roomId === 'object' ? `Room ${sub.roomId.roomNumber}` : '—';
            const status = statusOf(sub);
            return (
              <div key={sub._id} data-channel-card>
                <div data-channel-header>
                  <div>
                    <h2 data-channel-name>{sub.label}</h2>
                    <p data-channel-direction>
                      {CHANNEL_LABELS[sub.sourceChannel] ?? sub.sourceChannel} · {roomLabel} · Last sync: {sub.lastFetchedAt ? fmtDate(sub.lastFetchedAt) : 'Never'}
                    </p>
                    {sub.isActive && sub.lastFetchedAt && (
                      <p data-channel-count>{sub.lastKnownUidCount} event(s) in last sync</p>
                    )}
                  </div>
                  <StatusBadge status={status} />
                </div>

                {!!sub.lastFetchError && (
                  <div role="alert" data-sync-error>
                    Last sync error: {sub.lastFetchError}
                    {sub.consecutiveFailures > 1 && ` (${sub.consecutiveFailures} consecutive failures)`}
                  </div>
                )}

                <div data-channel-actions>
                  <button
                    type="button"
                    data-btn-ghost data-btn-sm
                    disabled={syncMutation.isPending && syncingId === sub._id}
                    onClick={() => { setSyncingId(sub._id); syncMutation.mutate(sub._id); }}
                  >
                    {syncMutation.isPending && syncingId === sub._id ? 'Syncing…' : 'Sync now'}
                  </button>
                  <button
                    type="button"
                    data-btn-ghost data-btn-sm data-destructive
                    onClick={() => setDisconnectId(sub._id)}
                  >
                    Disconnect
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Connect channel modal */}
      <Modal open={showConnect} onClose={() => { setShowConnect(false); resetModal(); }} title="Connect a channel">
        <form onSubmit={form.handleSubmit((v) => connectMutation.mutate(v))} noValidate data-form>

          <div data-form-group>
            <label>Channel</label>
            <div data-ota-presets>
              {SOURCE_CHANNELS.map((c) => (
                <button
                  key={c}
                  type="button"
                  data-ota-preset
                  data-active={selectedChannel === c || undefined}
                  onClick={() => {
                    setSelectedChannel(c);
                    form.setValue('sourceChannel', c, { shouldValidate: true });
                    if (!form.getValues('label')) form.setValue('label', CHANNEL_LABELS[c]);
                  }}
                >
                  {CHANNEL_LABELS[c]}
                </button>
              ))}
            </div>
            <InlineError message={form.formState.errors.sourceChannel?.message} />
          </div>

          <div data-form-group>
            <label htmlFor="ch-room">Room</label>
            <select id="ch-room" defaultValue="" {...form.register('roomId')}>
              <option value="" disabled>{roomsLoading ? 'Loading rooms…' : 'Select a room…'}</option>
              {(rooms ?? []).map((room) => (
                <option key={room._id} value={room._id}>Room {room.roomNumber}</option>
              ))}
            </select>
            <InlineError message={form.formState.errors.roomId?.message} />
          </div>

          <div data-form-group>
            <label htmlFor="ch-label">Label</label>
            <input id="ch-label" type="text"
              placeholder="e.g. Airbnb — Ocean View Room"
              {...form.register('label')} />
            <InlineError message={form.formState.errors.label?.message} />
          </div>

          <div data-form-group>
            <label htmlFor="ch-url">iCal feed URL</label>
            <input
              id="ch-url"
              type="url"
              placeholder="https://..."
              {...form.register('externalUrl')}
            />
            <p data-field-hint>
              Find this URL in your OTA&apos;s calendar / connectivity settings.
            </p>
            <InlineError message={form.formState.errors.externalUrl?.message} />
          </div>

          <div data-modal-actions>
            <button type="button" data-btn-ghost
              onClick={() => { setShowConnect(false); resetModal(); }}>
              Cancel
            </button>
            <button type="submit" data-btn-primary disabled={connectMutation.isPending}>
              {connectMutation.isPending ? 'Connecting…' : 'Connect channel'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!disconnectId}
        title="Disconnect this channel?"
        message="Future syncs will stop. Bookings already imported will not be removed."
        confirmLabel="Disconnect"
        cancelLabel="Cancel"
        destructive
        onConfirm={() => { if (disconnectId) disconnectMutation.mutate(disconnectId); }}
        onCancel={() => setDisconnectId(null)}
      />
    </div>
  );
}
