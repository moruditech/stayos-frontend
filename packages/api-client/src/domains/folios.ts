import { client } from '../client';

export interface FolioLineItem {
  _id: string;
  date: string;
  description: string;
  type: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  voided: boolean;
  voidedAt?: string;
}

export interface FolioPayment {
  _id: string;
  date: string;
  type: string;
  reference?: string;
  last4?: string;
  amount: number;
}

export interface Folio {
  _id: string;
  tenantId: string;
  bookingId: string;
  folioNumber: string;
  status: string;
  lineItems: FolioLineItem[];
  payments: FolioPayment[];
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  totalCharges: number;
  totalPayments: number;
  balanceDue: number;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface FolioBalance {
  balanceDue: number;
  totalCharges: number;
  totalPayments: number;
}

export const foliosApi = {
  // GET /folios/:id
  get: (id: string) => client.get<Folio>(`/folios/${id}`),

  // GET /folios/:id/balance
  getBalance: (id: string) => client.get<FolioBalance>(`/folios/${id}/balance`),

  // POST /folios/:id/charge
  postCharge: (id: string, input: {
    description: string;
    type: string;
    quantity: number;
    unitPrice: number;
    date?: string;
    vatRate?: number;
  }) => client.post<Folio>(`/folios/${id}/charge`, input),

  // POST /folios/:id/void/:lineItemId
  voidCharge: (id: string, lineItemId: string) =>
    client.post<Folio>(`/folios/${id}/void/${lineItemId}`),

  // POST /folios/:id/settle
  settle: (id: string, input: {
    paymentMethod: string;
    reference?: string;
    last4?: string;
    amount?: number;
    note?: string;
  }) => client.post<Folio>(`/folios/${id}/settle`, input),

  // GET /folios/:id/pdf
  getPdfUrl: (id: string) => client.get<{ url: string }>(`/folios/${id}/pdf`),

  // GET /checkout/bookings/:bookingId/invoices
  getBookingInvoices: (bookingId: string) =>
    client.get<Record<string, unknown>[]>(`/checkout/bookings/${bookingId}/invoices`),

  // GET /checkout/invoices/:invoiceNumber
  getInvoice: (invoiceNumber: string) =>
    client.get<Record<string, unknown>>(`/checkout/invoices/${invoiceNumber}`),
};
