import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

import {
  IInvoiceDetail,
  NormalisedInvoice,
  describeInvoice,
  formatEgp
} from './invoice.model';

@Component({
  selector: 'app-invoice-receipt',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './invoice-receipt.html',
  styleUrl: './invoice-receipt.css'
})
export class InvoiceReceipt {

  @Input({ required: true })
  set invoice(value: IInvoiceDetail) {
    this.view = describeInvoice(value);
  }

  @Input() viewerRole = '';

  @Input() showActions = true;

  @Output() openTicket = new EventEmitter<string>();

  view!: NormalisedInvoice;

  formatEgp = formatEgp;

  print(): void {
    window.print();
  }

  goToTicket(): void {
    if (this.view?.ticketId) {
      this.openTicket.emit(this.view.ticketId);
    }
  }

  barcodeFor(number: string): number[] {
    const source = number || 'INV';
    const bars: number[] = [];

    for (let index = 0; index < source.length; index += 1) {
      const code = source.charCodeAt(index);

      bars.push((code % 4) + 1);
      bars.push(((code >> 2) % 4) + 1);
      bars.push(1);
    }

    return bars;
  }
}