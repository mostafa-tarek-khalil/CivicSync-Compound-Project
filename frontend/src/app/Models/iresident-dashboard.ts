import { IMaintenanceTicket } from './imaintenance-ticket';

export interface IDashboardTicketStats {
  total: number;
  open: number;
  assigned: number;
  inProgress: number;
  resolved: number;
  closed: number;
  completed: number;
}

export interface IDashboardInvoice {
  _id: string;
  amount: number;
  status:
    | 'PENDING'
    | 'PAYMENT_SUBMITTED'
    | 'PAID'
    | 'OVERDUE'
    | 'CANCELLED';
  dueDate: string;
  issueDate: string;
  paidAt: string | null;
  description?: string | null;
  ticketTitle: string | null;
}

export interface IResidentInvoice extends IDashboardInvoice {
  ticketId: string | null;
  ticketCategory: string | null;

  unitId?:
    | {
        unitNumber?: number | string | null;
        floor?: number | null;
        type?: string | null;
        buildingId?:
          | { name?: string | null; buildingNumber?: number | string | null }
          | string
          | null;
      }
    | string
    | null;
}

export interface IDashboardBilling {

  outstandingBalance: number;
  invoicesDue: number;
  maintenanceDue: number;

  paidBalance: number;

  paidMaintenance: number;
  paidInvoicesTotal: number;
  unpaidInvoicesCount: number;
  uninvoicedMaintenanceCount: number;

  closedMaintenanceValue: number;
  closedMaintenanceCount: number;
  latestInvoice: IDashboardInvoice | null;

  invoices: IResidentInvoice[];
}

export interface IDashboardVisitor {
  _id: string;
  visitorName: string;
  visitDate: string;
  visitStartTime: string;
  status: string;
  source: 'RESIDENT_INVITE' | 'VISITOR_REQUEST';
  purpose?: string | null;
  createdAt?: string;
}

export interface IDashboardVisitors {
  thisMonth: number;
  pendingRequests: number;
  recent: IDashboardVisitor[];
}

export interface IResidentDashboard {
  tickets: IDashboardTicketStats;
  recentTickets: (IMaintenanceTicket & { price: number | null })[];
  billing: IDashboardBilling;
  visitors: IDashboardVisitors;
}
