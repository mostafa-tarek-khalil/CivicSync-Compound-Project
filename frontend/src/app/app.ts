import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';

import { NotificationToastComponent } from './Components/shared/notification-toast/notification-toast';
import { DialogComponent } from './shared/components/dialog/dialog';

import { AuthService } from './core/services/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    NotificationToastComponent,
    DialogComponent
  ],
  templateUrl: './app.html'
})
export class App {

  constructor(public authService: AuthService) {}
}