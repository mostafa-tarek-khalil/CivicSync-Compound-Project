import { Component, OnInit, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

import { MaintenanceTicketService } from '../../../Services/maintenance-ticket';
import { ChatSocket } from '../../../core/services/chat-socket';
import { ModalService } from '../../../core/services/modal.service';
import { IResidentInvoice } from '../../../Models/iresident-dashboard';
import { InvoiceReceipt } from '../../../shared/invoice/invoice-receipt';
import { IInvoiceDetail } from '../../../shared/invoice/invoice.model';

interface InvoiceRow extends IResidentInvoice {
  statusLabel: string;
  isOverdue: boolean;

  paying?: boolean;
}

@Component({
  selector: 'app-resident-invoices',
  standalone: true,
  imports: [CommonModule, InvoiceReceipt],
  templateUrl: './resident-invoices.html',
  styleUrl: './resident-invoices.css'
})
export class ResidentInvoices implements OnInit, OnDestroy {

  invoices: InvoiceRow[] = [];
  loading = false;
  errorMessage = '';

  outstandingBalance = 0;
  invoicesDue = 0;
  maintenanceDue = 0;
  uninvoicedMaintenanceCount = 0;

  receiptOpen = false;
  receiptInvoice: IInvoiceDetail | null = null;

  openReceipt(invoice: InvoiceRow): void {

    this.receiptInvoice = invoice as unknown as IInvoiceDetail;
    this.receiptOpen = true;
    this.cdr.detectChanges();
  }

  closeReceipt(): void {
    this.receiptOpen = false;
    this.receiptInvoice = null;
    this.cdr.detectChanges();
  }

  private readonly REALTIME_TYPES = [
    'INVOICE_CREATED',
    'INVOICE_DUE',
    'INVOICE_PAID',
    'INVOICE_PAYMENT_SUBMITTED',
    'INVOICE_UPDATED'
  ];

  private readonly REALTIME_CHANNEL = 'notification:new';

  private debounceTimer?: ReturnType<typeof setTimeout>;

  private onRealtimeEvent = (notification: { type?: string }) => {
    if (notification?.type && !this.REALTIME_TYPES.includes(notification.type)) {
      return;
    }

    this.scheduleReload();
  };

  constructor(
    private ticketService: MaintenanceTicketService,
    private chatSocket: ChatSocket,
    private router: Router,
    private modalService: ModalService,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    this.load();

    this.chatSocket.connect();
    this.chatSocket.on(this.REALTIME_CHANNEL, this.onRealtimeEvent);
  }

  ngOnDestroy(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.chatSocket.off(this.REALTIME_CHANNEL, this.onRealtimeEvent);
  }

  private scheduleReload(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(() => this.load(true), 400);
  }

  load(silent = false): void {
    if (!silent) {
      this.loading = true;
    }

    this.errorMessage = '';

    this.ticketService.getDashboard().subscribe({
      next: response => {
        const billing = response.data?.billing;
        this.invoices = (billing?.invoices || []).map((invoice: IResidentInvoice) =>
          this.toRow(invoice)
        );

        this.invoicesDue = billing?.invoicesDue ?? 0;
        this.maintenanceDue = billing?.maintenanceDue ?? 0;
        this.uninvoicedMaintenanceCount = billing?.uninvoicedMaintenanceCount ?? 0;

        this.outstandingBalance = this.computeOutstanding(this.invoices);

        this.loading = false;
        this.cdr.detectChanges();
      },
      error: error => {
        this.loading = false;
        this.errorMessage =
          error?.error?.message || 'Could not load your invoices.';
        this.cdr.detectChanges();
      }
    });
  }

  private computeOutstanding(invoices: InvoiceRow[]): number {
    const invoicesTotal = invoices
      .filter(i => i.status !== 'CANCELLED')
      .reduce((sum, i) => sum + (Number(i.amount) || 0), 0);

    return invoicesTotal + (Number(this.maintenanceDue) || 0);
  }

  private toRow(invoice: IResidentInvoice): InvoiceRow {
    const due = new Date(invoice.dueDate);
    const isOverdue =
      invoice.status !== 'PAID' &&
      invoice.status !== 'CANCELLED' &&
      invoice.status !== 'PAYMENT_SUBMITTED' &&
      !Number.isNaN(due.getTime()) &&
      due.getTime() < Date.now();

    return {
      ...invoice,
      isOverdue,
      statusLabel: isOverdue ? 'OVERDUE' : invoice.status
    };
  }

  canPay(invoice: InvoiceRow): boolean {
    return invoice.status === 'PENDING' || invoice.status === 'OVERDUE';
  }

  payInvoice(invoice: InvoiceRow): void {
    if (invoice.paying) {
      return;
    }

    this.modalService
      .confirm({
        title: 'Confirm payment',
        message:
          `Confirm that you have paid ${this.formatAmount(invoice.amount)} ` +
          `for invoice INV-${invoice._id.slice(-6).toUpperCase()}? ` +
          'An admin will verify and confirm it.',
        confirmLabel: 'Yes, I paid'
      })
      .then((confirmed) => {
        if (!confirmed) {
          return;
        }

        invoice.paying = true;
        this.errorMessage = '';
        this.cdr.detectChanges();

        this.ticketService.payInvoice(invoice._id).subscribe({
          next: (response) => {
            invoice.paying = false;
            invoice.status = 'PAYMENT_SUBMITTED';
            invoice.statusLabel = 'PAYMENT_SUBMITTED';
            invoice.isOverdue = false;

            this.modalService.success(
              response?.message ||
                'Payment submitted. An admin will confirm it shortly.'
            );

            this.load(true);
            this.cdr.detectChanges();
          },
          error: (error) => {
            invoice.paying = false;
            this.errorMessage =
              error?.error?.message || 'Could not submit the payment.';
            this.cdr.detectChanges();
          }
        });
      });
  }

  private formatAmount(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(amount || 0);
  }

  get hasInvoices(): boolean {
    return this.invoices.length > 0;
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'PAID':
        return 'status-paid';
      case 'PAYMENT_SUBMITTED':
        return 'status-submitted';
      case 'OVERDUE':
        return 'status-overdue';
      case 'CANCELLED':
        return 'status-cancelled';
      default:
        return 'status-pending';
    }
  }

  statusLabel(status: string): string {
    switch (status) {
      case 'PAYMENT_SUBMITTED':
        return 'Awaiting approval';
      case 'PAID':
        return 'Paid';
      case 'OVERDUE':
        return 'Overdue';
      case 'CANCELLED':
        return 'Cancelled';
      default:
        return 'Payment due';
    }
  }

  goToMaintenance(): void {
    this.router.navigate(['/resident/maintenance-view']);
  }

  formatDate(value?: string | null): string {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }
}
