import { CommonModule } from '@angular/common';
import { Component, HostListener } from '@angular/core';

import { ModalService } from '../../../core/services/modal.service';

@Component({
  selector: 'app-dialog',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dialog.html',
  styleUrl: './dialog.css'
})
export class DialogComponent {
  constructor(public modalService: ModalService) { }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.modalService.activeRequest()) {
      this.modalService.resolve(false);
    }
  }

  onBackdropClick(): void {
    this.modalService.resolve(false);
  }
}