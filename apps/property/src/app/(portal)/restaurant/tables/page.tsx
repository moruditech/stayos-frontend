'use client';

import React, { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  DndContext,
  useDraggable,
  useSensor,
  useSensors,
  MouseSensor,
  TouchSensor,
  type DragEndEvent,
} from '@dnd-kit/core';
import { api } from '@stayos/api-client';
import type { ApiError, RestaurantTable } from '@stayos/api-client';
import { PERMISSIONS, PLAN_FEATURES, SOCKET_EVENTS } from '@stayos/constants';
import {
  RoleGate,
  PlanGate,
  Modal,
  SkeletonLoader,
  EmptyState,
  InlineError,
  useToast,
  applyServerErrors,
  useSocketEvent,
} from '@stayos/ui';
import { outletKeys, tableKeys } from '@/lib/query-keys';

const tableSchema = z.object({
  label: z.string().min(1, 'Label is required'),
  section: z.string().optional(),
  capacity: z.coerce.number().int().min(1, 'Must be at least 1'),
});
type TableFormValues = z.infer<typeof tableSchema>;

const STATUS_LABELS: Record<RestaurantTable['status'], string> = {
  available: 'Available',
  seated: 'Seated',
  ordered: 'Ordered',
  bill_requested: 'Bill requested',
  needs_cleaning: 'Needs cleaning',
};

export default function TableMapPage(): React.ReactElement {
  return (
    <RoleGate
      perm={PERMISSIONS.POS_TABLE_MANAGE}
      fallback={<EmptyState title="You don't have access to the table map" />}
    >
      <PlanGate feature={PLAN_FEATURES.RESTAURANT_MODULE}>
        <Suspense fallback={<></>}>
          <TableMapContent />
        </Suspense>
      </PlanGate>
    </RoleGate>
  );
}

function TableMapContent(): React.ReactElement {
  const { toast } = useToast();
  const router = useRouter();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const outletIdParam = searchParams.get('outletId');

  const [editingTable, setEditingTable] = useState<RestaurantTable | null>(null);
  const [showNewTable, setShowNewTable] = useState(false);

  const { data: outletsData, isLoading: outletsLoading } = useQuery({
    queryKey: outletKeys.list(),
    queryFn: () => api.restaurantOutlets.list({ isActive: true, limit: 100 }),
    staleTime: 60_000,
  });
  const outlets = outletsData?.data ?? [];
  const selectedOutletId = outletIdParam || outlets[0]?._id || '';

  const { data: tablesData, isLoading: tablesLoading } = useQuery({
    queryKey: tableKeys.list(selectedOutletId),
    queryFn: () => api.restaurantTables.list(selectedOutletId),
    enabled: !!selectedOutletId,
  });
  const tables = tablesData?.data ?? [];

  // Table status changes any time a tab opens, orders fire, or a tab settles —
  // all reachable only from the till app. This dashboard just reflects it.
  useSocketEvent(SOCKET_EVENTS.POS_TAB_UPDATED, () => {
    void queryClient.invalidateQueries({ queryKey: tableKeys.list(selectedOutletId) });
  });

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  );

  const positionMutation = useMutation({
    mutationFn: ({ id, position }: { id: string; position: { x: number; y: number } }) =>
      api.restaurantTables.update(id, { position }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: tableKeys.list(selectedOutletId) }),
    onError: (err: ApiError) => toast(err.message ?? 'Failed to move table.', 'error'),
  });

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, delta } = event;
    if (delta.x === 0 && delta.y === 0) return;
    const table = tables.find((t) => t._id === active.id);
    if (!table) return;
    positionMutation.mutate({
      id: table._id,
      position: { x: Math.round(table.position.x + delta.x), y: Math.round(table.position.y + delta.y) },
    });
  };

  const createForm = useForm<TableFormValues>({ resolver: zodResolver(tableSchema), defaultValues: { label: '', section: '', capacity: 2 } });
  const editForm = useForm<TableFormValues>({ resolver: zodResolver(tableSchema) });

  const createMutation = useMutation({
    mutationFn: (values: TableFormValues) =>
      api.restaurantTables.create({
        outletId: selectedOutletId,
        label: values.label,
        capacity: values.capacity,
        position: { x: 40 + (tables.length % 6) * 110, y: 40 + Math.floor(tables.length / 6) * 110 },
        ...(values.section ? { section: values.section } : {}),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: tableKeys.list(selectedOutletId) });
      setShowNewTable(false);
      createForm.reset({ label: '', section: '', capacity: 2 });
      toast('Table added.', 'success');
    },
    onError: (err: ApiError) => {
      if (err.code === 'VALIDATION_ERROR') applyServerErrors(createForm, err);
      else toast(err.message ?? 'Failed to add table.', 'error');
    },
  });

  const updateMutation = useMutation({
    mutationFn: (values: TableFormValues) =>
      api.restaurantTables.update(editingTable!._id, {
        label: values.label,
        capacity: values.capacity,
        ...(values.section ? { section: values.section } : {}),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: tableKeys.list(selectedOutletId) });
      setEditingTable(null);
      toast('Table updated.', 'success');
    },
    onError: (err: ApiError) => {
      if (err.code === 'VALIDATION_ERROR') applyServerErrors(editForm, err);
      else toast(err.message ?? 'Failed to update table.', 'error');
    },
  });

  const openEdit = (table: RestaurantTable) => {
    editForm.reset({ label: table.label, section: table.section ?? '', capacity: table.capacity });
    setEditingTable(table);
  };

  return (
    <div data-page="restaurant-tables">
      <div data-floor-plan-toolbar>
        <div>
          <h1>Table Map</h1>
        </div>
        {selectedOutletId && (
          <button type="button" data-btn-primary onClick={() => setShowNewTable(true)}>
            + New table
          </button>
        )}
      </div>

      {outletsLoading ? (
        <SkeletonLoader rows={1} />
      ) : outlets.length === 0 ? (
        <EmptyState title="No outlets yet" description="Create an outlet before laying out its floor plan." />
      ) : (
        <>
          <div data-form-group>
            <label>Outlet</label>
            <select value={selectedOutletId} onChange={(e) => router.push(`/restaurant/tables?outletId=${e.target.value}`)}>
              {outlets.map((outlet) => (
                <option key={outlet._id} value={outlet._id}>{outlet.name}</option>
              ))}
            </select>
          </div>

          {tablesLoading ? (
            <SkeletonLoader rows={4} />
          ) : (
            <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
              <div data-floor-plan-canvas>
                {tables.length === 0 && (
                  <div data-floor-plan-empty>No tables yet — add one to start laying out the floor plan.</div>
                )}
                {tables.map((table) => (
                  <TableToken key={table._id} table={table} onClick={() => openEdit(table)} />
                ))}
              </div>
            </DndContext>
          )}

          <div data-floor-plan-legend>
            {(Object.keys(STATUS_LABELS) as RestaurantTable['status'][]).map((status) => (
              <span key={status} data-floor-plan-legend-item>
                <span data-table-token-status-dot data-status={status} />
                {STATUS_LABELS[status]}
              </span>
            ))}
          </div>
        </>
      )}

      <Modal open={showNewTable} onClose={() => setShowNewTable(false)} title="New table">
        <TableForm form={createForm} onSubmit={(v) => createMutation.mutate(v)} onCancel={() => setShowNewTable(false)} pending={createMutation.isPending} submitLabel="Add table" />
      </Modal>

      <Modal open={!!editingTable} onClose={() => setEditingTable(null)} title={`Edit ${editingTable?.label ?? 'table'}`}>
        <TableForm form={editForm} onSubmit={(v) => updateMutation.mutate(v)} onCancel={() => setEditingTable(null)} pending={updateMutation.isPending} submitLabel="Save changes" />
      </Modal>
    </div>
  );
}

function TableToken({ table, onClick }: { table: RestaurantTable; onClick: () => void }): React.ReactElement {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: table._id });

  const style: React.CSSProperties = {
    left: table.position.x,
    top: table.position.y,
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      data-table-token
      data-status={table.status}
      data-dragging={isDragging ? 'true' : 'false'}
      onClick={() => { if (!isDragging) onClick(); }}
      {...listeners}
      {...attributes}
    >
      <span data-table-token-status-dot data-status={table.status} />
      <span data-table-token-label>{table.label}</span>
      <span data-table-token-capacity>{table.capacity} seats</span>
    </div>
  );
}

function TableForm({ form, onSubmit, onCancel, pending, submitLabel }: {
  form: ReturnType<typeof useForm<TableFormValues>>;
  onSubmit: (values: TableFormValues) => void;
  onCancel: () => void;
  pending: boolean;
  submitLabel: string;
}): React.ReactElement {
  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate data-form>
      <div data-form-group>
        <label>Label</label>
        <input type="text" placeholder="e.g. T1, Bar Seat 3" {...form.register('label')} />
        <InlineError message={form.formState.errors.label?.message} />
      </div>
      <div data-form-row>
        <div data-form-group>
          <label>Section</label>
          <input type="text" placeholder="e.g. Terrace" {...form.register('section')} />
        </div>
        <div data-form-group>
          <label>Capacity</label>
          <input type="number" min={1} {...form.register('capacity')} />
          <InlineError message={form.formState.errors.capacity?.message} />
        </div>
      </div>
      <div data-modal-actions>
        <button type="button" data-btn-ghost onClick={onCancel}>Cancel</button>
        <button type="submit" data-btn-primary disabled={pending}>{pending ? 'Saving…' : submitLabel}</button>
      </div>
    </form>
  );
}
