import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export type TicketType =
  | 'verification_appeal'
  | 'job_appeal'
  | 'settlement_dispute'
  | 'complaint_report'
  | 'manual_review';

export type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'rejected';
export type TicketPriority = 'high' | 'medium' | 'low';

export interface TicketUser {
  id: number;
  username: string;
  email?: string;
  phone?: string;
  role?: string;
}

export interface TicketJob {
  id: number;
  title: string;
  status?: string;
  auditStatus?: string;
  employerId?: number;
}

export interface TicketVerification {
  id: number;
  companyName: string;
  status: string;
  submittedAt?: string;
  reviewedAt?: string;
}

export interface TicketSettlement {
  id: number;
  amount: number;
  salaryType: string;
  status: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface TicketRecord {
  id: number;
  title: string;
  description: string;
  type: TicketType;
  sourceRole: 'student' | 'employer' | 'admin' | 'system';
  status: TicketStatus;
  priority: TicketPriority;
  resolutionNote?: string | null;
  resolvedAt?: string | null;
  createdAt: string;
  updatedAt?: string;
  submitter?: TicketUser;
  assignee?: TicketUser;
  relatedJob?: TicketJob;
  relatedVerification?: TicketVerification;
  relatedSettlement?: TicketSettlement;
}

export interface TicketSummary {
  total: number;
  open: number;
  inProgress: number;
  resolved: number;
  rejected: number;
  highPriority: number;
  disputes: number;
}

export interface TicketListResponse {
  success: boolean;
  data: {
    tickets: TicketRecord[];
    summary: TicketSummary;
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
export class TicketService {
  private readonly apiUrl = `${environment.apiBaseUrl}/tickets`;

  constructor(private readonly http: HttpClient) {}

  getAdminTickets(
    page: number = 1,
    limit: number = 10,
    status?: TicketStatus | '',
    type?: TicketType | '',
    priority?: TicketPriority | '',
    search?: string
  ): Observable<TicketListResponse> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());

    if (status) {
      params = params.set('status', status);
    }

    if (type) {
      params = params.set('type', type);
    }

    if (priority) {
      params = params.set('priority', priority);
    }

    if (search) {
      params = params.set('search', search);
    }

    return this.http.get<TicketListResponse>(`${this.apiUrl}/admin`, { params });
  }

  createTicket(payload: {
    title: string;
    description: string;
    type: TicketType;
    priority: TicketPriority;
    relatedVerificationId?: number | null;
    relatedJobId?: number | null;
    relatedSettlementId?: number | null;
  }): Observable<{ success: boolean; message: string; data: TicketRecord }> {
    return this.http.post<{ success: boolean; message: string; data: TicketRecord }>(this.apiUrl, payload);
  }

  updateTicketStatus(
    id: number,
    status: TicketStatus,
    resolutionNote?: string
  ): Observable<{ success: boolean; message: string; data: TicketRecord }> {
    return this.http.patch<{ success: boolean; message: string; data: TicketRecord }>(
      `${this.apiUrl}/${id}/status`,
      { status, resolutionNote: resolutionNote ?? null }
    );
  }
}
