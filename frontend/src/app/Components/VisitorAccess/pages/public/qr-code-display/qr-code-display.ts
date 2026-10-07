import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { VisitorFlow } from '../../../services/visitor-flow';
import { VisitService } from '../../../../../Services/visit-service';
import * as QRCode from 'qrcode';

@Component({
  selector: 'app-qr-code-display',
  standalone: true,
  imports: [
    CommonModule
  ],
  templateUrl: './qr-code-display.html',
  styleUrl: './qr-code-display.css'
})
export class QrCodeDisplay implements OnInit, OnDestroy {

  visitorName = '';
  visitorEmail = '';
  residentName = '';
  building = '';
  unit = '';
  visitDate = '';
  startTime = '';
  purpose = '';
  requestId = '';
  status = '';
  expiresAt = '';
  qrImage = '';
  qrToken = '';
  loading = false;
  errorMessage = '';

  notYetAvailable = false;
  availableFrom = '';

  private statusPoll?: ReturnType<typeof setInterval>;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private visitorFlow: VisitorFlow,
    private visitService: VisitService,
    private cdr: ChangeDetectorRef
  ) {
    const visit = this.visitorFlow.getVisit();

    const paramVisitId = this.route.snapshot.queryParamMap.get('visitId');
    const paramEmail = this.route.snapshot.queryParamMap.get('email');

    this.requestId = paramVisitId || visit.requestId;
    this.visitorEmail = paramEmail || visit.visitorEmail;

    this.visitorName = visit.visitorName;
    this.residentName = visit.residentName;
    this.building = visit.building;
    this.unit = visit.unit;
    this.visitDate = visit.visitDate;
    this.startTime = visit.startTime;
    this.purpose = visit.purpose;
    this.status = visit.status;
    this.expiresAt = this.formatExpiry(visit.qrExpiresAt);
  }

  ngOnInit(): void {
    this.loadVisitorQr();
    this.watchForCheckIn();
  }

  ngOnDestroy(): void {
    if (this.statusPoll) {
      clearInterval(this.statusPoll);
    }
  }

  private watchForCheckIn(): void {
    this.statusPoll = setInterval(() => {
      if (!this.requestId || !this.visitorEmail) {
        return;
      }

      this.visitService.getVisitorStatus(this.requestId, this.visitorEmail).subscribe({
        next: response => {
          if (response?.data?.status === 'CHECKED_IN') {
            this.visitorFlow.updateVisit({
              status: 'CHECKED_IN',
              checkInTime: response.data.checkedInAt || '',
              visitorChatToken:
                response.data.visitorChatToken || this.visitorFlow.getVisit().visitorChatToken
            });

            if (this.statusPoll) {
              clearInterval(this.statusPoll);
            }

            this.router.navigate(['/visit-in-progress']);
          }
        },
        error: () => {

        }
      });
    }, 8000);
  }

  private loadVisitorQr(): void {
    if (!this.requestId || !this.visitorEmail) {
      this.errorMessage =
        'Visitor request information is missing.';
      return;
    }

    this.loading = true;
    this.errorMessage = '';
    this.qrImage = '';
    this.qrToken = '';
    this.notYetAvailable = false;

    this.visitService
      .getVisitorQr(
        this.requestId,
        this.visitorEmail
      )
      .subscribe({
        next: response => {
          if (
            !response ||
            !response.success ||
            !response.data ||
            !response.data.qrToken
          ) {
            this.loading = false;
            this.errorMessage =
              'The visitor QR pass is not available.';
            this.cdr.markForCheck();
            return;
          }

          this.qrToken = response.data.qrToken;
          this.expiresAt = this.formatExpiry(response.data.expiresAt);
          this.status = 'QR_GENERATED';

          this.visitorFlow.updateVisit({
            status: 'QR_GENERATED',
            qrExpiresAt: response.data.expiresAt
          });

          QRCode.toDataURL(this.qrToken, {
            errorCorrectionLevel: 'M',
            margin: 2,
            width: 320
          })
            .then(image => {
              this.qrImage = image;
              this.loading = false;
              this.cdr.markForCheck();
            })
            .catch(() => {
              this.errorMessage =
                'Could not render the visitor pass.';
              this.loading = false;
              this.cdr.markForCheck();
            });
        },

        error: error => {
          const message =
            error?.error?.message ||
            error?.error?.error ||
            'The visitor QR pass is not available.';

          if (/1 hour prior/i.test(message)) {
            this.notYetAvailable = true;
            this.availableFrom =
              this.formatExpiry(error?.error?.availableFrom) ||
              this.notBeforeLabel;
          } else {
            this.errorMessage = message;
          }

          this.loading = false;
          this.cdr.markForCheck();
        }
      });
  }

  get notBeforeLabel(): string {
    if (!this.visitDate) {
      return '1 hour before your visit time';
    }

    const day = this.formatDisplayDate(this.visitDate);

    return this.startTime
      ? `1 hour before ${this.startTime} on ${day}`
      : `1 hour before your visit on ${day}`;
  }

  private formatDisplayDate(value: string): string {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }

  private formatExpiry(value?: string | null): string {
    if (!value) {
      return 'Not available';
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }
    const day = date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
    const time = date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
    return `${day} · ${time}`;
  }

  viewVisitStatus(): void {
    this.router.navigate([
      '/visitor-request-status'
    ]);
  }

  goBack(): void {

    if (window.history.length > 1) {
      window.history.back();
      return;
    }
    this.router.navigate(['/visitor-request-status']);
  }

  get initials(): string {
    return (this.visitorName || 'Visitor')
      .split(' ')
      .map(part => part.charAt(0))
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }
}