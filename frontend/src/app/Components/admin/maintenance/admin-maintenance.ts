import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  AdminService,
  AdminMaintenanceTicket,
  AdminTicketDetails
} from '../../../Services/admin-service';
import { buildFilters } from '../../../core/utils/filters';
import { RealtimeRefresh } from '../../../core/utils/realtime-refresh';
import { ModalService } from '../../../core/services/modal.service';
import { ChatSocket } from '../../../core/services/chat-socket';
import { resolveUploadUrl } from '../../../../environments/environment';

@Component({
  selector: 'app-admin-maintenance',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-maintenance.html',
  styleUrl: '../shared/admin-shared.css'
})
export class AdminMaintenance implements OnInit, OnDestroy {

  tickets: AdminMaintenanceTicket[] = [];
  loading = false;
  errorMessage = '';

  statusFilter = '';
  categoryFilter = '';

  readonly statuses = ['', 'OPEN', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];
  readonly categories = ['', 'PLUMBING', 'ELECTRICITY', 'ELEVATOR', 'AC', 'GENERAL'];

  private readonly realtime: RealtimeRefresh;

  constructor(
    private adminService: AdminService,
    private modalService: ModalService,
    private chatSocket: ChatSocket,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {
    this.realtime = new RealtimeRefresh(
      this.chatSocket,
      [
        'MAINTENANCE_CREATED',
        'TICKET_ASSIGNED',
        'TICKET_STATUS_CHANGED',

        'INVOICE_CREATED',
        'INVOICE_UPDATED'
      ],
      () => {
        this.load();
        this.refreshOpenTicket();
      }
    );
  }

  ngOnInit(): void {
    this.load();
    this.realtime.start();
  }

  ngOnDestroy(): void {
    this.realtime.stop();
  }

  load(): void {
    this.loading = true;
    this.errorMessage = '';

    this.adminService
      .getMaintenanceTickets(
        buildFilters({
          status: this.statusFilter,
          category: this.categoryFilter
        })
      )
      .subscribe({
        next: response => {
          this.tickets = response.data || [];
          this.loading = false;
          this.cdr.detectChanges();
        },
        error: error => {
          this.loading = false;
          this.errorMessage = error?.error?.message || 'Could not load maintenance tickets.';
          this.cdr.detectChanges();
        }
      });
  }

  applyFilters(): void {
    this.load();
  }

  countBy(status: string): number {
    return this.tickets.filter(ticket => ticket.status === status).length;
  }

  ticketModalOpen = false;
  detailsLoading = false;
  detailsError = '';
  details: AdminTicketDetails | null = null;

  openTicket(ticket: AdminMaintenanceTicket): void {
    this.ticketModalOpen = true;
    this.detailsLoading = true;
    this.detailsError = '';

    this.details = null;
    this.activeTicketId = ticket._id;
    this.cdr.detectChanges();

    this.adminService.getMaintenanceTicket(ticket._id).subscribe({
      next: response => {
        this.details = response.data;
        this.detailsLoading = false;
        this.cdr.detectChanges();
      },
      error: error => {
        this.details = null;
        this.detailsLoading = false;
        this.detailsError =
          error?.error?.message || 'Could not load the ticket details.';
        this.cdr.detectChanges();
      }
    });
  }

  private refreshOpenTicket(): void {
    if (!this.ticketModalOpen || !this.activeTicketId) {
      return;
    }

    this.adminService.getMaintenanceTicket(this.activeTicketId).subscribe({
      next: response => {

        if (this.ticketModalOpen && this.activeTicketId === response.data?.ticket?._id) {
          this.details = response.data;
          this.cdr.detectChanges();
        }
      },
      error: () => {

      }
    });
  }

  closeTicketModal(): void {
    this.ticketModalOpen = false;
    this.details = null;
    this.detailsError = '';
    this.activeTicketId = '';
  }

  activeTicketId = '';

  openInvoice(invoiceId: string): void {
    if (!invoiceId) {
      return;
    }

    this.closeTicketModal();
    this.router.navigate(['/admin/invoices', invoiceId]);
  }

  get detailResidentContact(): string {
    const resident = this.details?.ticket.residentId;

    if (!resident || typeof resident === 'string') {
      return '';
    }

    return [resident.email, resident.phone].filter(Boolean).join(' · ');
  }

  get technicianName(): string {
    const technician = this.details?.ticket.assignedTo;

    if (!technician || typeof technician === 'string') {
      return 'Not assigned yet';
    }

    return technician.name || 'Technician';
  }

  get technicianMeta(): string {
    const technician = this.details?.ticket.assignedTo;

    if (!technician || typeof technician === 'string') {
      return '';
    }

    const parts: string[] = [];

    if (technician.specializations?.length) {
      parts.push(technician.specializations.join(', '));
    }

    if (technician.rating != null) {
      parts.push(
        `★ ${Number(technician.rating).toFixed(1)} (${technician.totalReviews ?? 0})`
      );
    }

    return parts.join(' · ');
  }

  get locationLabel(): string {
    const location = this.details?.location;

    if (!location) {
      return 'Not available';
    }

    const parts: string[] = [];

    if (location.buildingName) {
      parts.push(location.buildingName);
    } else if (location.buildingNumber != null) {
      parts.push(`Building ${location.buildingNumber}`);
    }

    if (location.unitNumber != null) {
      parts.push(`Unit ${location.unitNumber}`);
    }

    if (location.floor != null) {
      parts.push(`Floor ${location.floor}`);
    }

    return parts.length ? parts.join(' · ') : 'Not available';
  }

  get attachmentUrl(): string {
    return resolveUploadUrl(this.details?.ticket.attachmentUrl);
  }

  starsFor(rating: number): number[] {
    return Array.from({ length: Math.max(0, Math.min(5, Math.round(rating))) });
  }

  emptyStarsFor(rating: number): number[] {
    return Array.from({ length: Math.max(0, 5 - Math.round(rating)) });
  }

  formatDateTime(value: string): string {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  personLabel(value: unknown): string {
    if (!value) return '—';
    if (typeof value === 'object' && value !== null) {
      const person = value as { name?: string };
      return person.name || '—';
    }
    return '—';
  }

  statusClass(status: string): string {
    return 'status-' + String(status).toLowerCase();
  }

  formatDate(value: string): string {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }
}
