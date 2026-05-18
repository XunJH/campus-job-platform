import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export type AdminNotificationType = 'system' | 'audit_result' | 'ticket_update' | 'settlement' | 'announcement';
export type AdminNotificationTargetRole = 'all' | 'student' | 'employer' | 'admin';

export interface AdminNotificationRecord {
  id: number;
  title: string;
  content: string;
  type: AdminNotificationType;
  targetRole: AdminNotificationTargetRole;
  targetUserId?: number | null;
  senderAdminId?: number | null;
  actionUrl?: string | null;
  isPinned: boolean;
  createdAt: string;
  senderAdmin?: {
    id: number;
    username: string;
    email?: string;
  };
}

export interface AdminNotificationListResponse {
  success: boolean;
  data: {
    notifications: AdminNotificationRecord[];
    meta: {
      unreadCount: number;
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private readonly apiUrl = `${environment.apiBaseUrl}/notifications`;

  constructor(private readonly http: HttpClient) {}

  getAdminNotifications(
    page: number = 1,
    limit: number = 10,
    type?: AdminNotificationType | '',
    targetRole?: AdminNotificationTargetRole | '',
    search?: string
  ): Observable<AdminNotificationListResponse> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());

    if (type) {
      params = params.set('type', type);
    }

    if (targetRole) {
      params = params.set('targetRole', targetRole);
    }

    if (search) {
      params = params.set('search', search);
    }

    return this.http.get<AdminNotificationListResponse>(`${this.apiUrl}/admin`, { params });
  }

  createAdminNotification(payload: {
    title: string;
    content: string;
    type: AdminNotificationType;
    targetRole: AdminNotificationTargetRole;
    targetUserId?: number | null;
    actionUrl?: string | null;
    isPinned?: boolean;
  }): Observable<{ success: boolean; message: string; data: AdminNotificationRecord }> {
    return this.http.post<{ success: boolean; message: string; data: AdminNotificationRecord }>(
      `${this.apiUrl}/admin`,
      payload
    );
  }

  markNotificationsRead(notificationIds: number[]): Observable<{ success: boolean; message: string }> {
    return this.http.post<{ success: boolean; message: string }>(`${this.apiUrl}/read`, { notificationIds });
  }
}
