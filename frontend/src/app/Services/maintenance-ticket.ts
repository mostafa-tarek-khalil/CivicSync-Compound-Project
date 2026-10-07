import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { IMaintenanceTicket, ICreateTicketDto } from '../Models/imaintenance-ticket';
import { IReview } from '../Models/ireviews';
import { IResidentDashboard } from '../Models/iresident-dashboard';
import { environment } from '../../environments/environment';

export interface ITicketsListResponse {
  count: number;
  tickets: IMaintenanceTicket[];
}

export interface ITicketDetailsResponse {
  ticket: IMaintenanceTicket;
  review?: IReview | null;
}

export interface ITicketActionResponse {
  message: string;
  ticket: IMaintenanceTicket;
}

export interface IResidentDashboardResponse {
  success: boolean;
  data: IResidentDashboard;
}

@Injectable({
  providedIn: 'root'
})
export class MaintenanceTicketService {
  private readonly apiUrl = `${environment.apiUrl}/resident`;

  constructor(private http: HttpClient) {}

  getDashboard(): Observable<IResidentDashboardResponse> {
    return this.http.get<IResidentDashboardResponse>(
      `${this.apiUrl}/dashboard`
    );
  }

  getResidentTickets(): Observable<ITicketsListResponse> {
    return this.http.get<ITicketsListResponse>(
      `${this.apiUrl}/tickets`
    );
  }

  getTicketDetails(id: string): Observable<ITicketDetailsResponse> {
    return this.http.get<ITicketDetailsResponse>(
      `${this.apiUrl}/tickets/${id}`
    );
  }

  createTicket(ticket: ICreateTicketDto): Observable<ITicketActionResponse> {
    return this.http.post<ITicketActionResponse>(
      `${this.apiUrl}/tickets`,
      ticket
    );
  }

  uploadAttachment(file: File): Observable<{
    success: boolean;
    data: { attachmentUrl: string };
  }> {
    const formData = new FormData();
    formData.append('image', file);

    return this.http.post<{
      success: boolean;
      data: { attachmentUrl: string };
    }>(`${environment.apiUrl}/uploads/ticket-attachment`, formData);
  }

  payInvoice(
    invoiceId: string,
    reference?: string
  ): Observable<{
    success: boolean;
    message: string;
    data: { _id: string; status: string };
  }> {
    return this.http.patch<{
      success: boolean;
      message: string;
      data: { _id: string; status: string };
    }>(`${this.apiUrl}/invoices/${invoiceId}/pay`, {
      reference: reference || null
    });
  }

  closeTicket(id: string): Observable<ITicketActionResponse> {
    return this.http.patch<ITicketActionResponse>(
      `${this.apiUrl}/tickets/${id}/close`,
      {}
    );
  }
}