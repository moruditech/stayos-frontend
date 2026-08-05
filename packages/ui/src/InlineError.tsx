'use client';

import React from 'react';

interface InlineErrorProps {
  /** Error message string — typically from React Hook Form's formState.errors */
  message?: string | undefined;
  className?: string;
}

/**
 * Renders a single field- or section-level error message.
 * Consumed by form components via React Hook Form's formState.errors,
 * which is populated by applyServerErrors() in the api-client layer
 * using the ApiFieldError[] array shape from VALIDATION_ERROR responses.
 * See Document 06 §3 / Document 01 §2.1.
 */
export function InlineError({
  message,
  className,
}: InlineErrorProps): React.ReactElement | null {
  if (!message) return null;
  return (
    <span role="alert" data-inline-error className={className}>
      {message}
    </span>
  );
}

// ── applyServerErrors helper (exported for use in every form) ─────────────────
// Not a component — a function that maps a VALIDATION_ERROR ApiError's
// fields[] array onto React Hook Form via setError(). Lives here so it
// isn't reimplemented per form component (Document 06 §3).
import type { FieldValues, Path, UseFormReturn } from 'react-hook-form';
import type { ApiError } from '@stayos/api-client';

export function applyServerErrors<T extends FieldValues>(
  form: UseFormReturn<T>,
  err: ApiError
): void {
  if (err.code !== 'VALIDATION_ERROR' || !err.fields?.length) return;
  for (const { field, message } of err.fields) {
    // setError on a non-existent field path does nothing visible — a schema
    // field named differently from the backend's `field` value drops the
    // error silently. Verify field name alignment for every new schema.
    // See Document 06 §3.
    form.setError(field as Path<T>, { type: 'server', message });
  }
}
