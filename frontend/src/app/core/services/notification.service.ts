import { Injectable, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

import { NotificationType } from '../models/status';
import { environment } from '../../../environments/environment';

const API_URL = `${environment.apiUrl}/notifications`;


export interface NotificationItem {
  _id: string;
  userId: string;
  type: NotificationType | string;
  title: string;
  message: string;
  relatedId?: string | null;
  isRead: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationsResponse {
  success: boolean;
  count: number;
  data: NotificationItem[];
}


@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly unreadSignal = signal(0);

  
  readonly unreadCount = this.unreadSignal.asReadonly();

  constructor(private http: HttpClient) {}

  getNotifications(unreadOnly = false): Observable<NotificationsResponse> {
    const params = unreadOnly
      ? new HttpParams().set('unread', 'true')
      : undefined;

    return this.http
      .get<NotificationsResponse>(API_URL, { params })
      .pipe(
        tap(response => {
          if (unreadOnly) {
            this.unreadSignal.set(response.data?.length ?? 0);
          }
        })
      );
  }

  
  refreshUnreadCount(): Observable<NotificationsResponse> {
    return this.getNotifications(true);
  }

  markAsRead(id: string): Observable<{ success: boolean; data: NotificationItem }> {
    return this.http
      .patch<{ success: boolean; data: NotificationItem }>(
        `${API_URL}/${id}/read`,
        {}
      )
      .pipe(
        tap(() => {
          this.unreadSignal.update(count => Math.max(0, count - 1));
        })
      );
  }

  markAllAsRead(): Observable<{ success: boolean; modifiedCount: number }> {
    return this.http
      .patch<{ success: boolean; modifiedCount: number }>(
        `${API_URL}/read-all`,
        {}
      )
      .pipe(tap(() => this.unreadSignal.set(0)));
  }

  deleteNotification(id: string): Observable<{ success: boolean; message: string }> {
    return this.http.delete<{ success: boolean; message: string }>(
      `${API_URL}/${id}`
    );
  }

  
  incrementUnread(): void {
    this.unreadSignal.update(count => count + 1);
  }
}
