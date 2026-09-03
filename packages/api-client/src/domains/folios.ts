import { client } from '../client';

// Mirrors Folio.model.js's lineItemSchema — note isVoided, not "voided".
export interface FolioLineItem {
  _id: string;
  date: string;
  description: string;
  type: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  vatAmount: number;
  isVoided: boolean;
  voidedAt?: string;
  voidReason?: string;
}

// There's no "payments" array on the Folio document itself — payments are a
// separate collection linked by folioId. This shape is assembled by
// folios.service.js#getFolio, not stored as-is; see the Folio.payments note
// below.
export interface FolioPayment {
  _id: string;
  date: string;
  type: string; // payment gateway/method, e.g. 'cash', 'manual_eft', 'payfast'
  reference?: string;
  amount: number;
}

export interface Folio {
  _id: string;
  tenantId: string;
  bookingId: {
    _id: string;
    confirmationNumber: string;
    checkIn: string;
    checkOut: string;
  };
  customerId: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  status: 'open' | 'settled' | 'disputed';
  lineItems: FolioLineItem[];
  // Only present on the GET /folios/:id response (see foliosApi.get below) —
  // folios.service.js#getFolio attaches these from the Payment collection.
  // The postCharge/voidCharge/settle mutations return the raw folio document
  // and will NOT include this field or populated bookingId/customerId.
  payments: FolioPayment[];
  subTotal: number;
  taxTotal: number;
  grandTotal: number;
  paidAmount: number;
  balance: number;
  settledAt?: string;
  notes?: string;
  pdfUrl?: string;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface FolioBalance {
  grandTotal: number;
  paidAmount: number;
  balance: number;
  status: string;
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

  // GET /folios/:id/pdf — see folios.service.js#getPdfUrl, returns { pdfUrl }
  getPdfUrl: (id: string) => client.get<{ pdfUrl: string }>(`/folios/${id}/pdf`),

  // GET /checkout/bookings/:bookingId/invoices
  getBookingInvoices: (bookingId: string) =>
    client.get<Record<string, unknown>[]>(`/checkout/bookings/${bookingId}/invoices`),

  // GET /checkout/invoices/:invoiceNumber
  getInvoice: (invoiceNumber: string) =>
    client.get<Record<string, unknown>>(`/checkout/invoices/${invoiceNumber}`),
};
