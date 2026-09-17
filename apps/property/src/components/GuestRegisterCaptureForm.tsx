'use client';

import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { api } from '@stayos/api-client';
import type { ApiError } from '@stayos/api-client';
import { InlineError, FileUpload, useToast } from '@stayos/ui';

const RESIDENCE_STATUSES = [
  { value: 'citizen', label: 'SA citizen' },
  { value: 'permanent_resident', label: 'Permanent resident' },
  { value: 'visitor_visa', label: 'Visitor visa' },
  { value: 'work_visa', label: 'Work visa' },
  { value: 'study_visa', label: 'Study visa' },
  { value: 'asylum', label: 'Asylum seeker' },
  { value: 'other', label: 'Other' },
];

/**
 * Guest register capture form — the legal identity-document record required
 * before check-in (Immigration Act 13 of 2002 s.40 + Reg 36; see
 * GuestRegisterEntry.model.js and stayos-audit-report.md G-02).
 *
 * Extracted out of bookings/[id]/page.tsx so the check-in page's arrivals
 * flow can open the exact same capture step without a second, drifting copy
 * of this form. Both call sites use it inside a Modal.
 */
export function GuestRegisterCaptureForm({
  bookingId,
  defaultFullName,
  onCaptured,
}: {
  bookingId: string;
  /** Pre-fills the name field from the booking's guest record — still editable, since the register requires the name of whoever is physically checking in, which isn't always the paying/booking guest. */
  defaultFullName?: string;
  onCaptured: () => void;
}): React.ReactElement {
  const { toast } = useToast();
  const [fullName, setFullName] = useState(defaultFullName ?? '');
  const [idOrPassportNumber, setIdNumber] = useState('');
  const [documentType, setDocumentType] = useState<'sa_id' | 'passport' | 'other'>('sa_id');
  const [residenceStatus, setResidenceStatus] = useState('citizen');
  const [nationality, setNationality] = useState('');
  const [residentialAddress, setResidentialAddress] = useState('');
  const [idDocument, setIdDocument] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | undefined>();
  const [signatureAcknowledged, setSignatureAcknowledged] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const captureMutation = useMutation({
    mutationFn: () => {
      if (!idDocument) throw new Error('ID document image is required.');
      // A typed signature stands in for a captured signature pad image —
      // the backend stores whatever base64 payload is sent as signatureData.
      const signatureData = btoa(`${fullName}|${new Date().toISOString()}`);
      return api.guestregister.capture(bookingId, {
        fullName,
        idOrPassportNumber,
        documentType,
        residenceStatus,
        nationality,
        residentialAddress,
        signatureData,
        idDocument,
      });
    },
    onSuccess: () => {
      toast('Guest register entry captured.', 'success');
      onCaptured();
    },
    onError: (err: ApiError | Error) => {
      const message = 'message' in err ? err.message : 'Failed to capture guest register entry.';
      setError(message);
    },
  });

  return (
    <form
      data-form
      onSubmit={(e) => {
        e.preventDefault();
        setError(undefined);
        if (!idDocument) {
          setFileError('ID document photo is required.');
          return;
        }
        if (!signatureAcknowledged) {
          setError('Guest must acknowledge and sign before continuing.');
          return;
        }
        captureMutation.mutate();
      }}
    >
      <div data-form-group>
        <label htmlFor="gr-fullName">Full name</label>
        <input id="gr-fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
      </div>
      <div data-form-row>
        <div data-form-group>
          <label htmlFor="gr-docType">Document type</label>
          <select id="gr-docType" value={documentType} onChange={(e) => setDocumentType(e.target.value as typeof documentType)}>
            <option value="sa_id">SA ID</option>
            <option value="passport">Passport</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div data-form-group>
          <label htmlFor="gr-idNumber">ID / passport number</label>
          <input id="gr-idNumber" value={idOrPassportNumber} onChange={(e) => setIdNumber(e.target.value)} required />
        </div>
      </div>
      <div data-form-row>
        <div data-form-group>
          <label htmlFor="gr-residence">Residence status</label>
          <select id="gr-residence" value={residenceStatus} onChange={(e) => setResidenceStatus(e.target.value)}>
            {RESIDENCE_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
        <div data-form-group>
          <label htmlFor="gr-nationality">Nationality</label>
          <input id="gr-nationality" value={nationality} onChange={(e) => setNationality(e.target.value)} required />
        </div>
      </div>
      <div data-form-group>
        <label htmlFor="gr-address">Residential address</label>
        <input id="gr-address" value={residentialAddress} onChange={(e) => setResidentialAddress(e.target.value)} required />
      </div>
      <div data-form-group>
        <label htmlFor="gr-idDoc">ID document photo</label>
        <FileUpload
          accept="image/*"
          maxSizeMb={10}
          onFiles={(files) => {
            setFileError(undefined);
            setIdDocument(files[0] ?? null);
          }}
        />
        {idDocument && <p data-file-upload-selected>{idDocument.name}</p>}
        <InlineError message={fileError} />
      </div>
      <div data-form-group data-checkbox-group>
        <label htmlFor="gr-sign">
          <input
            id="gr-sign"
            type="checkbox"
            checked={signatureAcknowledged}
            onChange={(e) => setSignatureAcknowledged(e.target.checked)}
          />
          {' '}Guest confirms the details above are correct and consents to this record.
        </label>
      </div>

      <InlineError message={error} />

      <div data-form-actions>
        <button type="submit" data-btn-primary disabled={captureMutation.isPending}>
          {captureMutation.isPending ? 'Saving…' : 'Save and continue'}
        </button>
      </div>
    </form>
  );
}
