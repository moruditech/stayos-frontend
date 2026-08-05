'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api } from '@stayos/api-client';
import type { ApiError } from '@stayos/api-client';
import {
  SkeletonLoader,
  EmptyState,
  StatusBadge,
  InlineError,
  applyServerErrors,
  useToast,
} from '@stayos/ui';

const supportKeys = {
  tickets: () => ['support', 'tickets'] as const,
  ticket: (id: string) => ['support', 'ticket', id] as const,
};

const newTicketSchema = z.object({
  subject:  z.string().min(1, 'Subject is required'),
  message:  z.string().min(10, 'Please describe the issue in more detail'),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
});
type NewTicketInput = z.infer<typeof newTicketSchema>;

export default function SupportPage(): React.ReactElement {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showNewForm, setShowNewForm] = useState(false);

  const { data: tickets, isLoading } = useQuery({
    queryKey: supportKeys.tickets(),
    queryFn: () => api.support.listMine(),
  });

  const form = useForm<NewTicketInput>({
    resolver: zodResolver(newTicketSchema),
    defaultValues: { subject: '', message: '', priority: 'medium' },
  });

  const createMutation = useMutation({
    mutationFn: (input: NewTicketInput) => api.support.create(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: supportKeys.tickets() });
      form.reset();
      setShowNewForm(false);
      toast('Support ticket created.', 'success');
    },
    onError: (err: ApiError) => {
      if (err.code === 'VALIDATION_ERROR') applyServerErrors(form, err);
      else toast(err.message ?? 'Failed to create ticket.', 'error');
    },
  });

  if (isLoading) return <SkeletonLoader rows={3} />;

  return (
    <div data-page="support">
      <div data-page-header>
        <h1>Support</h1>
        <button
          type="button"
          data-btn-primary
          onClick={() => setShowNewForm(true)}
        >
          + New ticket
        </button>
      </div>

      {showNewForm && (
        <div data-form-container data-form-panel>
          <h2>New support ticket</h2>
          <form
            onSubmit={form.handleSubmit((v) => createMutation.mutate(v))}
            noValidate
            data-form
          >
            <div data-form-group>
              <label htmlFor="subject">Subject</label>
              <input id="subject" type="text" {...form.register('subject')} />
              <InlineError message={form.formState.errors.subject?.message} />
            </div>

            <div data-form-group>
              <label htmlFor="priority">Priority</label>
              <select id="priority" {...form.register('priority')}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>

            <div data-form-group>
              <label htmlFor="message">Description</label>
              <textarea id="message" rows={5} {...form.register('message')} />
              <InlineError message={form.formState.errors.message?.message} />
            </div>

            <div data-form-actions>
              <button
                type="button"
                data-btn-ghost
                onClick={() => setShowNewForm(false)}
              >
                Cancel
              </button>
              <button
                type="submit"
                data-btn-primary
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? 'Submitting…' : 'Submit ticket'}
              </button>
            </div>
          </form>
        </div>
      )}

      {!tickets?.length ? (
        <EmptyState
          title="No support tickets"
          description="Submit a ticket if you need help with your account or properties."
        />
      ) : (
        <div data-ticket-list>
          {tickets.map((ticket) => {
            const t = ticket as Record<string, unknown>;
            return (
              <div key={String(t['_id'])} data-ticket-row>
                <div data-ticket-info>
                  <span data-ticket-subject>{String(t['subject'] ?? '—')}</span>
                  <span data-ticket-date>
                    {t['createdAt']
                      ? new Date(String(t['createdAt'])).toLocaleDateString('en-ZA')
                      : '—'}
                  </span>
                </div>
                <div data-ticket-meta>
                  <StatusBadge status={String(t['status'] ?? 'open')} />
                  <a href={`/support/${String(t['_id'])}`} data-btn-ghost data-btn-sm>
                    View
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
