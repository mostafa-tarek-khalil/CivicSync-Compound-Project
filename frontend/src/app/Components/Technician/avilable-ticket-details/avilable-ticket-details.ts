import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';

import { TechnicianService } from '../../../Services/techinican';
import {
  IMaintenanceTicket,
  normalizeTicketDetails,
} from '../../../Models/imaintenance-ticket';
import { IOffer } from '../../../Models/ioffers';
import { ModalService } from '../../../core/services/modal.service';
import { printElement } from '../../../core/utils/print';
import { InvoiceReceipt } from '../../../shared/invoice/invoice-receipt';
import { IInvoiceDetail } from '../../../shared/invoice/invoice.model';
import { resolveUploadUrl } from '../../../../environments/environment';

@Component({
  selector: 'app-technician-ticket-details',
  standalone: true,
  imports: [CommonModule, RouterModule, InvoiceReceipt],
  templateUrl: './avilable-ticket-details.html',
  styleUrls: ['./avilable-ticket-details.css', '../shared/tech-shared.css']
})
export class TechnicianTicketDetailsComponent implements OnInit, OnDestroy {

  ticket: IMaintenanceTicket | null = null;

  
  existingOffer: IOffer | null = null;

  
  invoice: IInvoiceDetail | null = null;

  
  mode: 'available' | 'assigned' = 'available';

  loading = false;
  errorMessage = '';
  isProcessing = false;

  
  private currentTicketId = '';

  
  get hasTicketId(): boolean {
    return !!this.currentTicketId;
  }

  private routeSubscription: Subscription | null = null;

  constructor(
    private technicianService: TechnicianService,
    private route: ActivatedRoute,
    private router: Router,
    private modalService: ModalService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.routeSubscription = this.route.paramMap.subscribe((params) => {
      this.mode =
        (this.route.snapshot.data['mode'] as 'available' | 'assigned') ||
        'available';

      const id = params.get('id');

      if (id) {
        this.currentTicketId = id;
        this.loadTicket(id);
      }
    });
  }

  ngOnDestroy(): void {
    this.routeSubscription?.unsubscribe();
  }

  loadTicket(id: string): void {
    this.loading = true;
    this.errorMessage = '';
    this.ticket = null;
    this.existingOffer = null;
    this.invoice = null;

    const request =
      this.mode === 'available'
        ? this.technicianService.getAvailableTicketDetails(id)
        : this.technicianService.getAssignedTicketDetails(id);

    request.subscribe({
      next: (res) => {

        this.ticket = normalizeTicketDetails(res);
        this.existingOffer = res.existingOffer ?? null;
        this.invoice = res.invoice ?? null;
        this.loading = false;


        if (!this.ticket) {
          this.errorMessage = 'Unable to load this job. Please try again.';
        }

        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Error loading ticket details:', err);
        this.errorMessage =
          err.error?.message || 'Unable to load ticket details.';
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  
  printInvoice(): void {
    printElement('.invoice-print-area');
  }

  
  retry(): void {
    if (this.currentTicketId) {
      this.loadTicket(this.currentTicketId);
      return;
    }

    this.goBack();
  }

  
  skipTicket(): void {
    if (!this.ticket || this.isProcessing) return;

    this.modalService
      .confirm({
        title: 'Skip request',
        message: 'Are you sure you want to skip this request?',
        confirmLabel: 'Skip'
      })
      .then((confirmed) => {
        if (!confirmed || !this.ticket) return;

        this.isProcessing = true;

        this.technicianService.skipTicket(this.ticket._id).subscribe({
          next: () => {
            this.isProcessing = false;
            this.router.navigate(['/technician/available-requests']);
          },
          error: (err) => {
            console.error('Error skipping ticket:', err);
            this.isProcessing = false;
            this.modalService.error(
              err.error?.message || 'Unable to skip this request.'
            );
          }
        });
      });
  }

  
  startTicket(): void {
    if (!this.ticket || this.isProcessing) return;

    this.modalService
      .confirm({
        title: 'Start job',
        message: 'Are you sure you want to start this job?',
        confirmLabel: 'Start'
      })
      .then((confirmed) => {
        if (!confirmed || !this.ticket) return;

        this.isProcessing = true;

        this.technicianService.startTicket(this.ticket._id).subscribe({
          next: (res) => {
            this.ticket = res.ticket;
            this.isProcessing = false;
          },
          error: (err) => {
            console.error('Error starting ticket:', err);
            this.isProcessing = false;
            this.modalService.error(
              err.error?.message || 'Unable to start this job.'
            );
          }
        });
      });
  }

  
  resolveTicket(): void {
    if (!this.ticket || this.isProcessing) return;

    this.modalService
      .confirm({
        title: 'Resolve job',
        message: 'Are you sure you want to mark this job as resolved?',
        confirmLabel: 'Resolve'
      })
      .then((confirmed) => {
        if (!confirmed || !this.ticket) return;

        this.isProcessing = true;

        this.technicianService.resolveTicket(this.ticket._id).subscribe({
          next: (res) => {
            this.ticket = res.ticket;
            this.isProcessing = false;
          },
          error: (err) => {
            console.error('Error resolving ticket:', err);
            this.isProcessing = false;
            this.modalService.error(
              err.error?.message || 'Unable to resolve this job.'
            );
          }
        });
      });
  }

  goBack(): void {
    this.router.navigate([
      this.mode === 'available'
        ? '/technician/available-requests'
        : '/technician/assigned-jobs'
    ]);
  }

  
  get attachmentUrl(): string {
    return resolveUploadUrl(this.ticket?.attachmentUrl);
  }

  
  private get resident(): { name?: string; phone?: string; email?: string } | null {
    const residentId = this.ticket?.residentId;

    if (!residentId || typeof residentId === 'string') {
      return null;
    }

    return residentId as { name?: string; phone?: string; email?: string };
  }

  get residentName(): string {
    return this.resident?.name || 'Resident';
  }

  get residentPhone(): string {
    return this.resident?.phone || '';
  }

  get residentEmail(): string {
    return this.resident?.email || '';
  }

  
  get locationLabel(): string {
    const location = this.ticket?.location;

    if (!location) {
      return 'Location not available';
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

    return parts.length > 0 ? parts.join(' · ') : 'Location not available';
  }

  getPriorityClass(priority: string): string {
    if (priority === 'URGENT') {
      return 'urgent';
    }

    if (priority === 'HIGH') {
      return 'high';
    }

    if (priority === 'MEDIUM') {
      return 'medium';
    }

    return 'low';
  }

  getCategoryIcon(category: string): string {
    if (category === 'PLUMBING') {
      return 'fa-faucet-drip';
    }

    if (category === 'ELECTRICITY') {
      return 'fa-bolt';
    }

    if (category === 'ELEVATOR') {
      return 'fa-elevator';
    }

    if (category === 'AC') {
      return 'fa-snowflake';
    }

    return 'fa-wrench';
  }

  
  getCategoryColor(category: string): string {
    if (category === 'PLUMBING') {
      return 'cat-plumbing';
    }

    if (category === 'ELECTRICITY') {
      return 'cat-electricity';
    }

    if (category === 'ELEVATOR') {
      return 'cat-elevator';
    }

    if (category === 'AC') {
      return 'cat-ac';
    }

    return 'cat-general';
  }
}
