import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterOutlet, RouterLinkActive } from '@angular/router';

import { ThemeService } from '../../services/theme.service';
import { AuthService } from '../../services/auth.service';
import { NotificationService } from '../../services/notification.service';
import { ChatSocket } from '../../services/chat-socket';
import { Topbar } from '../../../Components/VisitorAccess/layout/topbar/topbar';
import { NavItem, visibleNavItems } from './nav-items';
import { ROLE_LABEL, UserRole } from '../../models/status';

@Component({
  selector: 'app-authenticated-layout',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    Topbar
  ],
  templateUrl: './authenticated-layout.html',
  styleUrl: './authenticated-layout.css'
})
export class AuthenticatedLayoutComponent {

  readonly collapsed = signal(false);

  readonly mobileOpen = signal(false);

  constructor(
    public themeService: ThemeService,
    private authService: AuthService,
    private notificationService: NotificationService,
    private chatSocket: ChatSocket,
    private router: Router
  ) {}

  get navItems(): NavItem[] {
    return visibleNavItems(this.authService.userRole);
  }

  get roleLabel(): string {
    const role = this.authService.userRole;
    return role ? ROLE_LABEL[role as UserRole] ?? role : '';
  }

  get unreadNotifications(): number {
    return this.notificationService.unreadCount();
  }

  toggleNavigation(): void {
    if (this.isMobile()) {
      this.mobileOpen.update(value => !value);
      return;
    }

    this.collapsed.update(value => !value);
  }

  private isMobile(): boolean {
    return typeof window !== 'undefined' && window.innerWidth < 992;
  }

  closeMobile(): void {
    this.mobileOpen.set(false);
  }

  logout(): void {

    this.chatSocket.disconnect();
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}