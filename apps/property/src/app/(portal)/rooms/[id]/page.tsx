'use client';

/**
 * Room detail & edit — Rooms & Availability.
 *
 * This route didn't exist before: every room-number link on the status
 * board (rooms/page.tsx) pointed at /rooms/[id] and 404'd, and
 * rooms/new/page.tsx's success handler had a comment explaining it reset
 * the form instead of redirecting here because "no /rooms/[id] detail page
 * exists yet". Both are fixed by this file existing.
 *
 * Field names/enums mirror rooms/new/page.tsx exactly (same backend
 * updateRoomSchema — createRoomSchema.partial(), so every create field is
 * also a valid update field). Image upload/delete/reorder call endpoints
 * that were already fully implemented in rooms.service.js but had no UI
 * anywhere until now.
 *
 * Deliberately does NOT show current guest / check-out here — that's
 * operational status-board information (rooms/page.tsx,
 * rooms.service.js#getStatusBoard), not room configuration. This page is
 * the room's own details and photos; occupancy lives on the list.
 */

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@stayos/api-client';
import type { ApiError, Room } from '@stayos/api-client';
import {
  SkeletonLoader,
  EmptyState,
  StatusBadge,
  InlineError,
  applyServerErrors,
  useToast,
  ConfirmDialog,
  RoleGate,
  TagInput,
  ImageLightbox,
  Icons,
} from '@stayos/ui';
import { PERMISSIONS } from '@stayos/constants';
import { roomKeys } from '@/lib/query-keys';

const ROOM_TYPES = [
  'single', 'double', 'twin', 'triple', 'suite', 'dormitory', 'apartment', 'studio',
] as const;

const RATE_UNITS = ['per_night', 'per_week', 'per_month', 'per_semester'] as const;

const schema = z.object({
  roomNumber:    z.string().min(1, 'Room number is required').max(20),
  name:          z.string().max(200).optional(),
  type:          z.enum(ROOM_TYPES, { errorMap: () => ({ message: 'Room type is required' }) }),
  floor:         z.string().max(20).optional(),
  capacity:      z.coerce.number().int().min(1, 'Capacity must be at least 1').max(100),
  adultCapacity: z.coerce.number().int().min(0).optional(),
  childCapacity: z.coerce.number().int().min(0).optional(),
  bedCount:      z.coerce.number().int().min(1).default(1),
  // Was a single comma-separated string (matching how the backend's own
  // amenities: string[] got typed into one text field) — now a real array,
  // matching TagInput's value type and the backend field directly, with no
  // comma-splitting/joining needed on either side of the request.
  amenities:     z.array(z.string()).default([]),
  description:   z.string().max(2000).optional(),
  baseRate:      z.coerce.number().positive('Base rate must be a positive number'),
  rateUnit:      z.enum(RATE_UNITS).default('per_night'),
  // See rooms/new/page.tsx's identical comment: '' has to become undefined
  // before z.coerce.number() runs, or an untouched field fails .positive()
  // against Number('') === 0 instead of being treated as not-provided.
  weekendRate: z.preprocess(
    (val) => (val === '' ? undefined : val),
    z.coerce.number().positive('Weekend rate must be a positive number').optional()
  ),
});
type FormInput = z.infer<typeof schema>;

function roomToFormInput(room: Room): FormInput {
  return {
    roomNumber:    room.roomNumber,
    name:          room.name ?? '',
    type:          room.type as FormInput['type'],
    floor:         room.floor ?? '',
    capacity:      room.capacity,
    adultCapacity: room.adultCapacity,
    childCapacity: room.childCapacity,
    bedCount:      room.bedCount,
    amenities:     room.amenities ?? [],
    description:   room.description ?? '',
    baseRate:      room.baseRate,
    rateUnit:      room.rateUnit as FormInput['rateUnit'],
    weekendRate:   room.weekendRate,
  };
}

export default function RoomDetailPage(): React.ReactElement {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  // Selected-but-not-yet-uploaded photos — see the "Upload images" section
  // below. Kept as parallel arrays (File + object URL) rather than
  // re-deriving the preview URL on every render, so each preview doesn't
  // get revoked and recreated on unrelated state changes.
  const [stagedFiles, setStagedFiles] = useState<{ file: File; previewUrl: string }[]>([]);

  const { data: room, isLoading } = useQuery({
    queryKey: roomKeys.detail(id),
    queryFn: () => api.rooms.get(id),
  });

  const form = useForm<FormInput>({ resolver: zodResolver(schema) });

  // Populate the form once the room loads — it isn't available yet on the
  // first render that creates the form above.
  useEffect(() => {
    if (room) form.reset(roomToFormInput(room));
  }, [room]);

  // Staged photo previews are blob: URLs (URL.createObjectURL) — revoke
  // any still-staged ones if the user navigates away without uploading,
  // rather than leaking them for the life of the tab.
  useEffect(() => {
    return () => stagedFiles.forEach((f) => URL.revokeObjectURL(f.previewUrl));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateMutation = useMutation({
    mutationFn: (input: FormInput) => api.rooms.update(id, input as unknown as Partial<Room>),
    onSuccess: (updated) => {
      queryClient.setQueryData(roomKeys.detail(id), updated);
      void queryClient.invalidateQueries({ queryKey: roomKeys.all });
      toast('Room updated.', 'success');
    },
    onError: (err: ApiError) => {
      if (err.code === 'VALIDATION_ERROR') applyServerErrors(form, err);
      else toast(err.message ?? 'Failed to update room.', 'error');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.rooms.delete(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: roomKeys.all });
      toast('Room deleted.', 'success');
      router.push('/rooms');
    },
    onError: (err: ApiError) => {
      setConfirmDelete(false);
      toast(err.message ?? 'Failed to delete room.', 'error');
    },
  });

  const uploadMutation = useMutation({
    mutationFn: (files: File[]) => {
      const formData = new FormData();
      // Field name 'images' matches multer's upload.array('images', 10) on
      // the backend (rooms.routes.js) — a different key here would arrive
      // as req.files === undefined and 400 with "At least one image file
      // is required" regardless of what was actually attached.
      files.forEach((file) => formData.append('images', file));
      return api.rooms.uploadImage(id, formData);
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(roomKeys.detail(id), updated);
      stagedFiles.forEach((f) => URL.revokeObjectURL(f.previewUrl));
      setStagedFiles([]);
      toast('Image(s) uploaded.', 'success');
    },
    onError: (err: ApiError) => toast(err.message ?? 'Failed to upload image.', 'error'),
  });

  const deleteImageMutation = useMutation({
    mutationFn: (imageId: string) => api.rooms.deleteImage(id, imageId),
    onSuccess: (updated) => {
      queryClient.setQueryData(roomKeys.detail(id), updated);
      toast('Image removed.', 'success');
    },
    onError: (err: ApiError) => toast(err.message ?? 'Failed to remove image.', 'error'),
  });

  const reorderMutation = useMutation({
    mutationFn: (orderedIds: string[]) => api.rooms.reorderImages(id, orderedIds),
    onSuccess: (updated) => queryClient.setQueryData(roomKeys.detail(id), updated),
    onError: (err: ApiError) => toast(err.message ?? 'Failed to reorder images.', 'error'),
  });

  if (isLoading) return <SkeletonLoader rows={8} />;
  if (!room) {
    return (
      <EmptyState
        title="Room not found"
        description="It may have been deleted."
        action={<Link href="/rooms" data-btn-primary>Back to rooms</Link>}
      />
    );
  }

  // Rooms created before photo upload shipped have no `images` key at all
  // in the stored document (Mongoose's [] default only applies to documents
  // created after the schema had this field) — guard the same way
  // roomToFormInput above already guards amenities/name/floor/description.
  const sortedImages = [...(room.images ?? [])].sort((a, b) => a.order - b.order);

  function moveImage(index: number, direction: -1 | 1): void {
    const target = index + direction;
    if (target < 0 || target >= sortedImages.length) return;
    const reordered = [...sortedImages];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(target, 0, moved as (typeof sortedImages)[number]);
    reorderMutation.mutate(reordered.map((img) => img._id));
  }

  return (
    <div data-page="room-detail">
      <div data-page-header>
        <div>
          <Link href="/rooms" data-breadcrumb>
            <Icons.ChevronLeft data-breadcrumb-icon aria-hidden="true" /> Rooms
          </Link>
          <h1>Room {room.roomNumber}{room.name ? ` — ${room.name}` : ''}</h1>
        </div>
        <StatusBadge status={room.status} />
      </div>

      <section data-detail-section>
        <h2>Photos</h2>

        {sortedImages.length === 0 ? (
          <p data-empty-cell>No photos yet.</p>
        ) : (
          <div data-room-image-grid>
            {sortedImages.map((img, index) => (
              <div key={img._id} data-room-image-card>
                <img
                  src={img.url}
                  alt={img.caption || `${room.roomNumber} photo ${index + 1}`}
                  onClick={() => setLightboxIndex(index)}
                />
                <RoleGate perm={PERMISSIONS.ROOM_MANAGE}>
                  <div data-room-image-actions>
                    <button
                      type="button" data-btn-ghost data-btn-sm
                      onClick={() => moveImage(index, -1)}
                      disabled={index === 0 || reorderMutation.isPending}
                      aria-label="Move image earlier"
                    >
                      <Icons.ArrowUp size={14} aria-hidden="true" />
                    </button>
                    <button
                      type="button" data-btn-ghost data-btn-sm
                      onClick={() => moveImage(index, 1)}
                      disabled={index === sortedImages.length - 1 || reorderMutation.isPending}
                      aria-label="Move image later"
                    >
                      <Icons.ArrowDown size={14} aria-hidden="true" />
                    </button>
                    <button
                      type="button" data-btn-danger data-btn-sm
                      onClick={() => deleteImageMutation.mutate(img._id)}
                      disabled={deleteImageMutation.isPending}
                      aria-label="Delete image"
                    >
                      <Icons.Trash2 size={14} aria-hidden="true" />
                    </button>
                  </div>
                </RoleGate>
              </div>
            ))}
          </div>
        )}

        <RoleGate perm={PERMISSIONS.ROOM_MANAGE}>
          <div data-form-group>
            <label htmlFor="room-images">Upload images <span data-optional>(JPEG, PNG, or WebP)</span></label>
            {/* Selecting files only stages them below — nothing is sent
                until "Upload" is clicked, so a wrong pick can be removed
                first instead of already being on its way to the server. */}
            <input
              id="room-images"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              disabled={uploadMutation.isPending}
              onChange={(e) => {
                const files = Array.from(e.target.files ?? []);
                if (files.length > 0) {
                  setStagedFiles((prev) => [
                    ...prev,
                    ...files.map((file) => ({ file, previewUrl: URL.createObjectURL(file) })),
                  ]);
                }
                e.target.value = '';
              }}
            />

            {stagedFiles.length > 0 && (
              <>
                <div data-upload-staging>
                  {stagedFiles.map((staged, i) => (
                    <div key={staged.previewUrl} data-upload-staging-item>
                      <img src={staged.previewUrl} alt={staged.file.name} />
                      <button
                        type="button"
                        data-upload-staging-remove
                        disabled={uploadMutation.isPending}
                        onClick={() => {
                          URL.revokeObjectURL(staged.previewUrl);
                          setStagedFiles((prev) => prev.filter((_, idx) => idx !== i));
                        }}
                        aria-label={`Remove ${staged.file.name}`}
                      >
                        <Icons.X aria-hidden="true" />
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  data-btn-primary
                  data-btn-sm
                  disabled={uploadMutation.isPending}
                  onClick={() => uploadMutation.mutate(stagedFiles.map((s) => s.file))}
                >
                  <Icons.Upload size={14} aria-hidden="true" />
                  {uploadMutation.isPending
                    ? 'Uploading…'
                    : `Upload ${stagedFiles.length} photo${stagedFiles.length === 1 ? '' : 's'}`}
                </button>
              </>
            )}
          </div>
        </RoleGate>
      </section>

      {lightboxIndex !== null && (
        <ImageLightbox
          images={sortedImages.map((img) => ({ url: img.url, caption: img.caption }))}
          startIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}

      <RoleGate
        perm={PERMISSIONS.ROOM_MANAGE}
        fallback={<p data-notice>You don&apos;t have permission to edit this room.</p>}
      >
        <div data-form-container>
          <form onSubmit={form.handleSubmit((v) => updateMutation.mutate(v))} noValidate data-form>
            <div data-form-row>
              <div data-form-group>
                <label htmlFor="roomNumber">Room number</label>
                <input id="roomNumber" type="text" {...form.register('roomNumber')} />
                <InlineError message={form.formState.errors.roomNumber?.message} />
              </div>
              <div data-form-group>
                <label htmlFor="name">Display name <span data-optional>(optional)</span></label>
                <input id="name" type="text" placeholder="e.g. Garden Suite" {...form.register('name')} />
              </div>
            </div>

            <div data-form-row>
              <div data-form-group>
                <label htmlFor="type">Room type</label>
                <select id="type" {...form.register('type')}>
                  {ROOM_TYPES.map((t) => (
                    <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                  ))}
                </select>
                <InlineError message={form.formState.errors.type?.message} />
              </div>
              <div data-form-group>
                <label htmlFor="floor">Floor <span data-optional>(optional)</span></label>
                <input id="floor" type="text" {...form.register('floor')} />
              </div>
            </div>

            <div data-form-row>
              <div data-form-group>
                <label htmlFor="capacity">Capacity</label>
                <input id="capacity" type="number" min={1} max={100} {...form.register('capacity')} />
                <InlineError message={form.formState.errors.capacity?.message} />
              </div>
              <div data-form-group>
                <label htmlFor="adultCapacity">Adult capacity <span data-optional>(optional)</span></label>
                <input id="adultCapacity" type="number" min={0} {...form.register('adultCapacity')} />
              </div>
              <div data-form-group>
                <label htmlFor="childCapacity">Child capacity <span data-optional>(optional)</span></label>
                <input id="childCapacity" type="number" min={0} {...form.register('childCapacity')} />
              </div>
            </div>

            <div data-form-group>
              <label htmlFor="bedCount">Bed count</label>
              <input id="bedCount" type="number" min={1} {...form.register('bedCount')} />
            </div>

            <div data-form-group>
              <label htmlFor="amenities">Amenities <span data-optional>(optional)</span></label>
              <Controller
                control={form.control}
                name="amenities"
                render={({ field }) => (
                  <TagInput
                    id="amenities"
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="e.g. Wi-Fi, then press Enter or +"
                  />
                )}
              />
            </div>

            <div data-form-group>
              <label htmlFor="description">Description <span data-optional>(optional)</span></label>
              <textarea id="description" rows={3} {...form.register('description')} />
            </div>

            <div data-form-row>
              <div data-form-group>
                <label htmlFor="baseRate">Base rate (ZAR)</label>
                <input id="baseRate" type="number" min={0} step="0.01" {...form.register('baseRate')} />
                <InlineError message={form.formState.errors.baseRate?.message} />
              </div>
              <div data-form-group>
                <label htmlFor="rateUnit">Rate unit</label>
                <select id="rateUnit" {...form.register('rateUnit')}>
                  <option value="per_night">Per night</option>
                  <option value="per_week">Per week</option>
                  <option value="per_month">Per month</option>
                  <option value="per_semester">Per semester</option>
                </select>
              </div>
              <div data-form-group>
                <label htmlFor="weekendRate">Weekend rate <span data-optional>(optional)</span></label>
                <input id="weekendRate" type="number" min={0} step="0.01" {...form.register('weekendRate')} />
              </div>
            </div>

            <div data-form-actions>
              <button
                type="button" data-btn-danger
                onClick={() => setConfirmDelete(true)}
              >
                <Icons.Trash2 size={15} aria-hidden="true" />
                Delete room
              </button>
              <button type="submit" data-btn-primary disabled={updateMutation.isPending}>
                {updateMutation.isPending ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </form>
        </div>
      </RoleGate>

      <ConfirmDialog
        open={confirmDelete}
        title="Delete this room?"
        message={`This removes room ${room.roomNumber} from your property. Rooms with active or upcoming bookings can't be deleted.`}
        confirmLabel={deleteMutation.isPending ? 'Deleting…' : 'Delete room'}
        destructive
        onConfirm={() => deleteMutation.mutate()}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  );
}
