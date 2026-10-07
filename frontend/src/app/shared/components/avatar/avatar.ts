import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

import { resolveUploadUrl } from '../../../../environments/environment';

@Component({
  selector: 'app-avatar',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="avatar" [class]="'avatar-' + size">
      <img
        *ngIf="imageUrl"
        [src]="imageUrl"
        [alt]="name || 'User avatar'"
        (error)="onImageError()" />

      <span *ngIf="!imageUrl" class="avatar-initials">{{ initials }}</span>
    </div>
  `,
  styles: [`
    .avatar {
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      border-radius: 50%;
      background: var(--cs-primary, #315b8f);
      color: #ffffff;
      font-weight: 700;
      flex-shrink: 0;
    }

    .avatar img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }

    .avatar-sm { width: 32px; height: 32px; font-size: 12px; }
    .avatar-md { width: 40px; height: 40px; font-size: 15px; }
    .avatar-lg { width: 56px; height: 56px; font-size: 20px; }
    .avatar-xl { width: 96px; height: 96px; font-size: 32px; }
  `]
})
export class AvatarComponent {
  @Input() profileImage: string | null | undefined = null;

  @Input() name = '';

  @Input() size: 'sm' | 'md' | 'lg' | 'xl' = 'md';

  private imageFailed = false;

  get imageUrl(): string {
    if (this.imageFailed) {
      return '';
    }

    return resolveUploadUrl(this.profileImage);
  }

  get initials(): string {
    const source = (this.name || '').trim();

    if (!source) {
      return 'U';
    }

    return source
      .split(/\s+/)
      .map(part => part.charAt(0))
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }

  onImageError(): void {
    this.imageFailed = true;
  }
}