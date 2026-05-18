import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export type FrontTicketType =
  | 'verification_appeal'
  | 'job_appeal'
  | 'settlement_dispute'
  | 'complaint_report'
  | 'manual_review';

export type FrontTicketStatus = 'open' | 'in_progress' | 'resolved' | 'rejected';
export type FrontTicketPriority = 'high' | 'medium' | 'low';

export interface FrontTicketRecord {
  id: number;
  title: string;
  description: string;
  type: FrontTicketType;
  sourceRole: 'student' | 'employer' | 'admin' | 'system';
  status: FrontTicketStatus;
  priority: FrontTicketPriority;
  resolutionNote?: string | null;
  resolvedAt?: string | null;
  createdAt: string;
  updatedAt?: string;
  relatedJob?: {
    id: number;
    title: string;
    status?: string;
    auditStatus?: string;
  };
  relatedVerification?: {
    id: number;
    companyName: string;
    status: string;
    userId?: number;
  };
  relatedSettlement?: {
    id: number;
    amount: number;
    salaryType: string;
    status: string;
    studentId?: number;
    employerId?: number;
  };
  assignee?: {
    id: number;
    username: string;
  };
}

@Injectable({
  providedIn: 'root'
})
export class TicketService {
  private readonly apiUrl = '/api/v1/tickets';

  constructor(private readonly http: HttpClient) {}

  getMyTickets(
    status?: FrontTicketStatus | '',
    type?: FrontTicketType | ''
  ): Observable<{ success: boolean; data: FrontTicketRecord[] }> {
    let params = new HttpParams();

    if (status) {
      params = params.set('status', status);
    }

    if (type) {
      params = params.set('type', type);
    }

    return this.http.get<{ success: boolean; data: FrontTicketRecord[] }>(`${this.apiUrl}/my`, { params });
  }

  createTicket(payload: {
    title: string;
    description: string;
    type: FrontTicketType;
    priority: FrontTicketPriority;
    relatedVerificationId?: number | null;
    relatedJobId?: number | null;
    relatedSettlementId?: number | null;
  }): Observable<{ success: boolean; message: string; data: FrontTicketRecord }> {
    return this.http.post<{ success: boolean; message: string; data: FrontTicketRecord }>(this.apiUrl, payload);
  }
}
