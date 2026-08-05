// Support ticket domain types — shared across every portal (Document 09-14
// each have their own thin "my tickets" section; Document 14 §7 owns the
// full-queue management view). Verified against models/SupportTicket.model.js.

export type SupportTicketCategory = 'billing' | 'booking' | 'technical' | 'complaint' | 'account' | 'other';
export type SupportTicketPriority = 'low' | 'normal' | 'high' | 'urgent';
export type SupportTicketStatus = 'open' | 'in_progress' | 'pending_user' | 'resolved' | 'closed';

export interface SupportTicketMessage {
  sender: string;
  senderModel: 'PlatformUser' | 'Customer' | 'PropertyStaff' | 'AgencyStaff';
  body: string;
  isInternal: boolean;
  attachments?: { url: string; name: string }[];
  sentAt: string;
}

export interface SupportTicket {
  _id: string;
  raisedBy: string;
  raiserModel: 'Customer' | 'PropertyStaff' | 'AgencyStaff';
  tenantId?: string;
  agencyId?: string;
  complaintId?: string;
  ticketNumber: string;
  category: SupportTicketCategory;
  subject: string;
  description: string;
  attachments?: { url: string; name: string }[];
  priority: SupportTicketPriority;
  status: SupportTicketStatus;
  assignedTo?: { _id: string; firstName: string; lastName: string; email: string } | null;
  assignedAt?: string;
  slaTargetAt?: string;
  slaBreach: boolean;
  resolution?: string;
  resolvedAt?: string;
  closedAt?: string;
  messages: SupportTicketMessage[];
  satisfactionRating?: number;
  createdAt: string;
  updatedAt: string;
}
