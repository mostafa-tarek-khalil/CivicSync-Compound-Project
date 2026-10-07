

export enum UserRole {
  RESIDENT = 'RESIDENT',
  TECHNICIAN = 'TECHNICIAN',
  SECURITY = 'SECURITY',
  ADMIN = 'ADMIN'
}

export enum UserStatus {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  REJECTED = 'REJECTED'
}

export enum TicketStatus {
  OPEN = 'OPEN',
  ASSIGNED = 'ASSIGNED',
  IN_PROGRESS = 'IN_PROGRESS',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED'
}

export enum TicketPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT'
}

export enum TicketCategory {
  PLUMBING = 'PLUMBING',
  ELECTRICITY = 'ELECTRICITY',
  ELEVATOR = 'ELEVATOR',
  AC = 'AC',
  GENERAL = 'GENERAL'
}

export enum OfferStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
  WITHDRAWN = 'WITHDRAWN'
}

export enum VisitStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  QR_GENERATED = 'QR_GENERATED',
  QR_SCANNED = 'QR_SCANNED',
  CHECKED_IN = 'CHECKED_IN',
  CHECKED_OUT = 'CHECKED_OUT',
  EXPIRED = 'EXPIRED'
}

export enum InvoiceStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  OVERDUE = 'OVERDUE',
  CANCELLED = 'CANCELLED'
}

export enum NotificationType {
  VISITOR_REQUEST = 'VISITOR_REQUEST',
  VISITOR_APPROVED = 'VISITOR_APPROVED',
  VISITOR_REJECTED = 'VISITOR_REJECTED',
  VISITOR_CHECKED_IN = 'VISITOR_CHECKED_IN',
  VISITOR_CHECKED_OUT = 'VISITOR_CHECKED_OUT',
  MAINTENANCE_CREATED = 'MAINTENANCE_CREATED',
  NEW_OFFER = 'NEW_OFFER',
  NEW_NEGOTIATION = 'NEW_NEGOTIATION',
  OFFER_ACCEPTED = 'OFFER_ACCEPTED',
  OFFER_REJECTED = 'OFFER_REJECTED',
  TICKET_ASSIGNED = 'TICKET_ASSIGNED',
  TICKET_STATUS_CHANGED = 'TICKET_STATUS_CHANGED',
  NEW_MESSAGE = 'NEW_MESSAGE',
  ACCOUNT_APPROVED = 'ACCOUNT_APPROVED',
  ACCOUNT_REJECTED = 'ACCOUNT_REJECTED',
  INVOICE_CREATED = 'INVOICE_CREATED',
  INVOICE_DUE = 'INVOICE_DUE',

  INVOICE_PAID = 'INVOICE_PAID',
  INVOICE_PAYMENT_SUBMITTED = 'INVOICE_PAYMENT_SUBMITTED',
  INVOICE_UPDATED = 'INVOICE_UPDATED'
}



const STATUS_SLUGS: Record<string, string> = {
  [TicketStatus.OPEN]: 'open',
  [TicketStatus.ASSIGNED]: 'assigned',
  [TicketStatus.IN_PROGRESS]: 'in-progress',
  [TicketStatus.RESOLVED]: 'resolved',
  [TicketStatus.CLOSED]: 'closed',
  [OfferStatus.ACCEPTED]: 'accepted',
  [OfferStatus.WITHDRAWN]: 'withdrawn',
  [VisitStatus.QR_GENERATED]: 'qr-generated',
  [VisitStatus.QR_SCANNED]: 'qr-scanned',
  [VisitStatus.CHECKED_IN]: 'checked-in',
  [VisitStatus.CHECKED_OUT]: 'checked-out',
  [VisitStatus.EXPIRED]: 'expired',
  [InvoiceStatus.PAID]: 'paid',
  [InvoiceStatus.OVERDUE]: 'overdue',
  [InvoiceStatus.CANCELLED]: 'cancelled'
};


const SHARED_STATUS_SLUGS: Record<string, string> = {
  PENDING: 'pending',
  REJECTED: 'rejected',
  APPROVED: 'approved'
};


export function statusSlug(status?: string | null): string {
  if (!status) {
    return 'unknown';
  }

  return STATUS_SLUGS[status] ?? SHARED_STATUS_SLUGS[status] ?? status.toLowerCase().replace(/_/g, '-');
}


export function statusLabel(status?: string | null): string {
  if (!status) {
    return 'Unknown';
  }

  return status
    .toLowerCase()
    .split('_')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}


export const TICKET_TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
  [TicketStatus.OPEN]: [TicketStatus.ASSIGNED],
  [TicketStatus.ASSIGNED]: [TicketStatus.IN_PROGRESS, TicketStatus.OPEN],
  [TicketStatus.IN_PROGRESS]: [TicketStatus.RESOLVED],
  [TicketStatus.RESOLVED]: [TicketStatus.CLOSED],
  [TicketStatus.CLOSED]: []
};

export function canTransitionTicket(
  from: TicketStatus,
  to: TicketStatus
): boolean {
  return (TICKET_TRANSITIONS[from] ?? []).includes(to);
}


export const VISIT_CHAT_ALLOWED_STATUSES: VisitStatus[] = [
  VisitStatus.APPROVED,
  VisitStatus.QR_GENERATED,
  VisitStatus.QR_SCANNED,
  VisitStatus.CHECKED_IN
];

export function isVisitChatOpen(status?: string | null): boolean {
  return VISIT_CHAT_ALLOWED_STATUSES.includes(status as VisitStatus);
}


export const ROLE_HOME: Record<UserRole, string> = {
  [UserRole.RESIDENT]: '/resident/dashboard',
  [UserRole.TECHNICIAN]: '/technician/dashboard',
  [UserRole.SECURITY]: '/security/visitors',
  [UserRole.ADMIN]: '/admin/dashboard'
};

export const ROLE_LABEL: Record<UserRole, string> = {
  [UserRole.RESIDENT]: 'Resident',
  [UserRole.TECHNICIAN]: 'Technician',
  [UserRole.SECURITY]: 'Security',
  [UserRole.ADMIN]: 'Administrator'
};

export function roleHome(role?: string | null): string {
  return ROLE_HOME[role as UserRole] ?? '/';
}
