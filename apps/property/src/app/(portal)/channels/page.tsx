'use client';

/**
 * Channel Management — iCal sync.
 * TAD 11 §17: calendar-level synchronisation with external OTA channels.
 * Both consuming external calendars and publishing the property's own.
 * Per-room iCal export feeds are enabled per room in /rooms — this page
 * manages the external channel connections.
 */

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api } from '@stayos/api-client';
import type { ApiError } from '@stayos/api-client';
import { SkeletonLoader, EmptyState, StatusBadge, useToast, Modal, InlineError, ConfirmDialog } from '@stayos/ui';
import { channelKeys } from '@/lib/query-keys';

const connectSchema = z.object({
  name:     z.string().min(1, 'Channel name required'),
  feedUrl:  z.string().url('Must be a valid iCal feed URL'),
  roomId:   z.string().optional(),
  direction:z.enum(['import', 'export', 'both']).default('import'),
});
type ConnectInput = z.infer<typeof connectSchema>;

const OTA_PRESETS = [
  { name: 'Booking.com',  placeholder: 'https://ical.booking.com/...' },
  { name: 'Airbnb',       placeholder: 'https://www.airbnb.com/calendar/ical/...' },
  { name: 'Expedia',      placeholder: 'https://vacation.rentals.expedia.com/...' },
  { name: 'VRBO',         placeholder: 'https://www.vrbo.com/icalendar/...' },
  { name: 'Other',        placeholder: 'https://...' },
] as const;

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleString('en-ZA', { dateStyle: 'short', timeStyle: 'short' });
}

export default function ChannelsPage(): React.ReactElement {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showConnect, setShowConnect] = useState(false);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [disconnectId, setDisconnectId] = useState<string | null>(null);
  const [selectedPreset, setSelectedPreset] = useState<string>('');

  const { data: channels, isLoading } = useQuery({
    queryKey: channelKeys.ical(),
    queryFn: () => api.channels.list(),
    staleTime: 120_000,
  });

  const form = useForm<ConnectInput>({
    resolver: zodResolver(connectSchema),
    defaultValues: { direction: 'import' },
  });

  const connectMutation = useMutation({
    mutationFn: (input: ConnectInput) => api.channels.connect(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: channelKeys.ical() });
      setShowConnect(false); form.reset(); setSelectedPreset('');
      toast('Channel connected. First sync will run shortly.', 'success');
    },
    onError: (err: ApiError) => {
      if (err.code === 'VALIDATION_ERROR') {
        for (const f of err.fields ?? []) form.setError(f.field as keyof ConnectInput, { message: f.message });
      } else toast(err.message ?? 'Failed to connect channel.', 'error');
    },
  });

  const syncMutation = useMutation({
    mutationFn: (id: string) => api.channels.sync(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: channelKeys.ical() });
      setSyncingId(null);
      toast('Sync triggered. Updates will appear within a few minutes.', 'success');
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
          <a href="/settings/property" data-breadcrumb>← Settings</a>
          <h1>Channel management</h1>
          <p data-page-subtitle>Sync bookings with external OTA calendars via iCal</p>
        </div>
        <button type="button" data-btn-primary onClick={() => setShowConnect(true)}>
          + Connect channel
        </button>
      </div>

      <div data-channels-info>
        <p>
          Connect your OTA channel calendars to automatically import external bookings
          and export your availability. Syncs run automatically every hour. You can
          also trigger a manual sync at any time.
        </p>
        <p data-info-note>
          To export a per-room iCal feed to your OTA, go to <a href="/rooms" data-link>Rooms</a> and
          enable the iCal export feed on the individual room.
        </p>
      </div>

      {isLoading ? <SkeletonLoader rows={3} /> : !channels?.length ? (
        <EmptyState
          title="No channels connected"
          description="Connect your OTA channels to automatically sync bookings."
          action={
            <button type="button" data-btn-primary onClick={() => setShowConnect(true)}>
              Connect first channel
            </button>
          }
        />
      ) : (
        <div data-channel-list>
          {channels.map((channel) => {
            const ch = channel as unknown as Record<string, unknown>;
            const id = String(ch['_id']);
            const status = String(ch['status'] ?? 'active');
            const lastSync = ch['lastSyncAt'] ? fmtDate(String(ch['lastSyncAt'])) : 'Never';
            const importCount = Number(ch['importedBookings'] ?? 0);

            return (
              <div key={id} data-channel-card>
                <div data-channel-header>
                  <div>
                    <h2 data-channel-name>{String(ch['name'] ?? '—')}</h2>
                    <p data-channel-direction>
                      {String(ch['direction'] ?? 'import')} · Last sync: {lastSync}
                    </p>
                    {importCount > 0 && (
                      <p data-channel-count>{importCount} bookings imported</p>
                    )}
                  </div>
                  <StatusBadge status={status} />
                </div>

                <div data-channel-url>
                  <code data-truncated-url>
                    {String(ch['feedUrl'] ?? '').slice(0, 60)}
                    {String(ch['feedUrl'] ?? '').length > 60 ? '…' : ''}
                  </code>
                </div>

                {Boolean(ch['lastSyncError']) && (
                  <div role="alert" data-sync-error>
                    Last sync error: {String(ch['lastSyncError'])}
                  </div>
                )}

                <div data-channel-actions>
                  <button
                    type="button"
                    data-btn-ghost data-btn-sm
                    disabled={syncMutation.isPending && syncingId === id}
                    onClick={() => { setSyncingId(id); syncMutation.mutate(id); }}
                  >
                    {syncMutation.isPending && syncingId === id ? 'Syncing…' : 'Sync now'}
                  </button>
                  <button
                    type="button"
                    data-btn-ghost data-btn-sm data-destructive
                    onClick={() => setDisconnectId(id)}
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
      <Modal open={showConnect} onClose={() => { setShowConnect(false); setSelectedPreset(''); form.reset(); }} title="Connect a channel">
        <form onSubmit={form.handleSubmit((v) => connectMutation.mutate(v))} noValidate data-form>

          {/* OTA quick-select */}
          <div data-form-group>
            <label>Select OTA</label>
            <div data-ota-presets>
              {OTA_PRESETS.map((ota) => (
                <button
                  key={ota.name}
                  type="button"
                  data-ota-preset
                  data-active={selectedPreset === ota.name || undefined}
                  onClick={() => {
                    setSelectedPreset(ota.name);
                    if (ota.name !== 'Other') form.setValue('name', ota.name);
                  }}
                >
                  {ota.name}
                </button>
              ))}
            </div>
          </div>

          <div data-form-group>
            <label htmlFor="ch-name">Channel name</label>
            <input id="ch-name" type="text"
              placeholder={selectedPreset || 'e.g. Booking.com'}
              {...form.register('name')} />
            <InlineError message={form.formState.errors.name?.message} />
          </div>

          <div data-form-group>
            <label htmlFor="ch-url">iCal feed URL</label>
            <input
              id="ch-url"
              type="url"
              placeholder={OTA_PRESETS.find((o) => o.name === selectedPreset)?.placeholder ?? 'https://...'}
              {...form.register('feedUrl')}
            />
            <p data-field-hint>
              Find this URL in your OTA&apos;s calendar / connectivity settings.
            </p>
            <InlineError message={form.formState.errors.feedUrl?.message} />
          </div>

          <div data-form-group>
            <label htmlFor="ch-direction">Sync direction</label>
            <select id="ch-direction" {...form.register('direction')}>
              <option value="import">Import only — pull external bookings in</option>
              <option value="export">Export only — push your availability out</option>
              <option value="both">Two-way sync</option>
            </select>
          </div>

          <div data-modal-actions>
            <button type="button" data-btn-ghost
              onClick={() => { setShowConnect(false); setSelectedPreset(''); form.reset(); }}>
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
