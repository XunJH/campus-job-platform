import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface AdminOperationLogRecord {
  id: number;
  adminId: number;
  actionType: string;
  targetType: string;
  targetId?: number | null;
  summary: string;
  detail?: string | null;
  metadata?: Record<string, unknown> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: string;
  admin?: {
    id: number;
    username: string;
    email?: string;
    role?: string;
  };
}

export interface AdminOperationLogResponse {
  success: boolean;
  data: {
    logs: AdminOperationLogRecord[];
    actionTypeSummary: Array<{ actionType: string; count: number | string }>;
    pagination: {
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
export class AdminOperationLogService {
  private readonly apiUrl = `${environment.apiBaseUrl}/admin-operation-logs`;

  constructor(private readonly http: HttpClient) {}

  getLogs(
    page: number = 1,
    limit: number = 10,
    actionType?: string,
    targetType?: string,
    adminId?: number,
    search?: string
  ): Observable<AdminOperationLogResponse> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());

    if (actionType) {
      params = params.set('actionType', actionType);
    }

    if (targetType) {
      params = params.set('targetType', targetType);
    }

    if (adminId) {
      params = params.set('adminId', adminId.toString());
    }

    if (search) {
      params = params.set('search', search);
    }

    return this.http.get<AdminOperationLogResponse>(this.apiUrl, { params });
  }
}
