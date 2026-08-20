'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api } from '@stayos/api-client';
import type { ApiError } from '@stayos/api-client';
import { SkeletonLoader, EmptyState, useToast, Modal, InlineError } from '@stayos/ui';
import { accessKeys } from '@/lib/query-keys';

const visitorSchema = z.object({
  name:      z.string().min(1, 'Name is required'),
  host:      z.string().optional(),
  purpose:   z.string().optional(),
  idNumber:  z.string().optional(),
  vehicleReg:z.string().optional(),
});
type VisitorInput = z.infer<typeof visitorSchema>;

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleString('en-ZA', { dateStyle: 'short', timeStyle: 'short' });
}

export default function VisitorsPage(): React.ReactElement {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showNew, setShowNew] = useState(false);

  const { data: visitors, isLoading } = useQuery({
    queryKey: accessKeys.visitors(),
    queryFn: () => api.access.listVisitors(),
    staleTime: 30_000,
  });

  const form = useForm<VisitorInput>({ resolver: zodResolver(visitorSchema) });

  const checkInMutation = useMutation({
    mutationFn: (input: VisitorInput) => api.access.checkInVisitor(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: accessKeys.visitors() });
      setShowNew(false); form.reset();
      toast('Visitor checked in.', 'success');
    },
    onError: (err: ApiError) => {
      if (err.code === 'VALIDATION_ERROR') {
        for (const f of err.fields ?? []) form.setError(f.field as keyof VisitorInput, { message: f.message });
      } else toast(err.message ?? 'Failed.', 'error');
    },
  });

  const checkOutMutation = useMutation({
    mutationFn: (id: string) => api.access.checkOutVisitor(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: accessKeys.visitors() });
      toast('Visitor checked out.', 'success');
    },
    onError: (err: ApiError) => toast(err.message ?? 'Failed.', 'error'),
  });

  const activeVisitors = (visitors ?? []).filter((v) => !(v as Record<string,unknown>)['checkOutTime']);
  const recentVisitors = (visitors ?? []).filter((v) => !!(v as Record<string,unknown>)['checkOutTime']).slice(0, 20);

  return (
    <div data-page="visitors">
      <div data-page-header>
        <h1>Access Control</h1>
        <p data-page-subtitle>Visitor log</p>
        <button type="button" data-btn-primary onClick={() => setShowNew(true)}>
          + Check in visitor
        </button>
      </div>

      <section data-access-section>
        <h2>Currently on site ({activeVisitors.length})</h2>
        {isLoading ? <SkeletonLoader rows={3} /> : !activeVisitors.length ? (
          <p data-empty-note>No visitors currently on site.</p>
        ) : (
          <table data-table>
            <thead>
              <tr><th>Name</th><th>Host</th><th>Purpose</th><th>Arrived</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {activeVisitors.map((v) => {
                const vis = v as unknown as Record<string, unknown>;
                const id = String(vis['_id']);
                return (
                  <tr key={id}>
                    <td>{String(vis['name'] ?? '—')}</td>
                    <td>{String(vis['host'] ?? '—')}</td>
                    <td>{String(vis['purpose'] ?? '—')}</td>
                    <td>{vis['checkInTime'] ? fmtTime(String(vis['checkInTime'])) : '—'}</td>
                    <td>
                      <button type="button" data-btn-ghost data-btn-sm
                        disabled={checkOutMutation.isPending}
                        onClick={() => checkOutMutation.mutate(id)}>
                        Check out
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>

      {recentVisitors.length > 0 && (
        <section data-access-section>
          <h2>Recent departures</h2>
          <table data-table>
            <thead>
              <tr><th>Name</th><th>Host</th><th>Arrived</th><th>Departed</th></tr>
            </thead>
            <tbody>
              {recentVisitors.map((v) => {
                const vis = v as unknown as Record<string, unknown>;
                return (
                  <tr key={String(vis['_id'])}>
                    <td>{String(vis['name'] ?? '—')}</td>
                    <td>{String(vis['host'] ?? '—')}</td>
                    <td>{vis['checkInTime'] ? fmtTime(String(vis['checkInTime'])) : '—'}</td>
                    <td>{vis['checkOutTime'] ? fmtTime(String(vis['checkOutTime'])) : '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      )}

      <Modal open={showNew} onClose={() => setShowNew(false)} title="Check in visitor">
        <form onSubmit={form.handleSubmit((v) => checkInMutation.mutate(v))} noValidate data-form>
          <div data-form-group>
            <label htmlFor="vis-name">Visitor name</label>
            <input id="vis-name" type="text" {...form.register('name')} />
            <InlineError message={form.formState.errors.name?.message} />
          </div>
          <div data-form-group>
            <label htmlFor="vis-host">Visiting <span data-optional>(guest / staff member)</span></label>
            <input id="vis-host" type="text" {...form.register('host')} />
          </div>
          <div data-form-group>
            <label htmlFor="vis-purpose">Purpose <span data-optional>(optional)</span></label>
            <input id="vis-purpose" type="text" {...form.register('purpose')} />
          </div>
          <div data-form-row>
            <div data-form-group>
              <label htmlFor="vis-id">ID number <span data-optional>(optional)</span></label>
              <input id="vis-id" type="text" {...form.register('idNumber')} />
            </div>
            <div data-form-group>
              <label htmlFor="vis-vehicle">Vehicle reg <span data-optional>(optional)</span></label>
              <input id="vis-vehicle" type="text" {...form.register('vehicleReg')} />
            </div>
          </div>
          <div data-modal-actions>
            <button type="button" data-btn-ghost onClick={() => setShowNew(false)}>Cancel</button>
            <button type="submit" data-btn-primary disabled={checkInMutation.isPending}>
              {checkInMutation.isPending ? 'Checking in…' : 'Check in'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
