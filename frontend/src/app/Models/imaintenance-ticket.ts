import { IUserSummary } from './iuser-summary';
import { IOffer } from './ioffers';
import { IInvoiceDetail } from '../shared/invoice/invoice.model';

export type TTicketCategory =
  | 'PLUMBING'
  | 'ELECTRICITY'
  | 'ELEVATOR'
  | 'AC'
  | 'GENERAL';

export type TTicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export type TTicketStatus =
  | 'OPEN'
  | 'ASSIGNED'
  | 'IN_PROGRESS'
  | 'RESOLVED'
  | 'CLOSED';

export interface ITicketLocation {
  unitId: string;
  unitNumber: number;
  floor: number;
  type: string;
  status: string;
  buildingId: string;
  buildingName: string | null;
  buildingNumber: number | null;
}

export interface IMaintenanceTicket {
  _id: string;
  residentId: string | IUserSummary;
  title: string;
  category: TTicketCategory;
  description: string;
  attachmentUrl: string | null;
  priority: TTicketPriority;
  status: TTicketStatus;
  assignedTo: string | IUserSummary | null;
  resolvedAt?: string | null;
  skippedBy: string[] | IUserSummary[];
  createdAt: string;
  updatedAt: string;
  
  location?: ITicketLocation | null;
}

export interface ICreateTicketDto {
  title: string;
  category: TTicketCategory;
  description: string;
  attachmentUrl?: string | null;
  priority?: TTicketPriority;
}

export interface ITicketsResponse {
  count?: number;
  tickets: IMaintenanceTicket[];
}

export interface ITicketDetailsResponse {
  
  ticket?: IMaintenanceTicket;

  
  existingOffer?: IOffer | null;

  
  invoice?: IInvoiceDetail | null;

  
  location?: unknown;

  
  _id?: string;
  title?: string;
  category?: TTicketCategory;
  description?: string;
  attachmentUrl?: string | null;
  priority?: TTicketPriority;
  status?: TTicketStatus;
  residentId?: string | IUserSummary | null;
  assignedTo?: string | IUserSummary | null;
  skippedBy?: string[] | IUserSummary[];
  locationDetail?: ITicketLocation | null;
  createdAt?: string;
  updatedAt?: string;

  
  message?: string;
}


export function normalizeTicketDetails(
  response: ITicketDetailsResponse | null | undefined
): IMaintenanceTicket | null {
  if (!response) {
    return null;
  }

  if (response.ticket) {
    return response.ticket;
  }


  if (response._id && response.title) {
    return response as unknown as IMaintenanceTicket;
  }

  return null;
}

export interface ITicketActionResponse {
  message: string;
  ticket: IMaintenanceTicket;
}
