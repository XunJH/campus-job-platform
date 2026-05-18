import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export type FrontNotificationType =
  | 'system'
  | 'audit_result'
  | 'ticket_update'
  | 'settlement'
  | 'announcement';

export interface FrontNotificationRecord {
  id: number;
  title: string;
  content: string;
  type: FrontNotificationType;
  targetRole: 'all' | 'student' | 'employer' | 'admin';
  targetUserId?: number | null;
  senderAdminId?: number | null;
  actionUrl?: string | null;
  isPinned: boolean;
  createdAt: string;
  isRead: boolean;
  senderAdmin?: {
    id: number;
    username: string;
    email?: string;
  };
}

export interface FrontNotificationResponse {
  success: boolean;
  data: {
    notifications: FrontNotificationRecord[];
    unreadCount: number;
  };
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private readonly apiUrl = '/api/v1/notifications';

  constructor(private readonly http: HttpClient) {}

  getMyNotifications(
    type?: FrontNotificationType | '',
    onlyUnread: boolean = false
  ): Observable<FrontNotificationResponse> {
    let params = new HttpParams();

    if (type) {
      params = params.set('type', type);
    }

    if (onlyUnread) {
      params = params.set('onlyUnread', 'true');
    }

    return this.http.get<FrontNotificationResponse>(`${this.apiUrl}/my`, { params });
  }

  markNotificationsRead(notificationIds: number[]): Observable<{ success: boolean; message: string }> {
    return this.http.post<{ success: boolean; message: string }>(`${this.apiUrl}/read`, { notificationIds });
  }
}
