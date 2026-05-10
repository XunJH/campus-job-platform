import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export type SettlementStatus = 'pending' | 'paid' | 'disputed';

export interface SettlementRecord {
  id: number;
  amount: number;
  salaryType: string;
  status: SettlementStatus;
  notes?: string | null;
  paidAt?: string | null;
  createdAt: string;
  updatedAt?: string;
  job?: {
    id: number;
    title: string;
    location?: string;
  };
  student?: {
    id: number;
    username: string;
    email?: string;
    phone?: string;
  };
  employer?: {
    id: number;
    username: string;
    email?: string;
  };
  processor?: {
    id: number;
    username: string;
  };
}

export interface SettlementSummary {
  total: number;
  pending: number;
  paid: number;
  disputed: number;
}

export interface SettlementListResponse {
  success: boolean;
  data: {
    settlements: SettlementRecord[];
    summary: SettlementSummary;
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
export class SettlementService {
  private apiUrl = environment.apiBaseUrl;

  constructor(private http: HttpClient) {}

  getSettlements(
    page: number = 1,
    limit: number = 10,
    status?: SettlementStatus | ''
  ): Observable<SettlementListResponse> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());

    if (status) {
      params = params.set('status', status);
    }

    return this.http.get<SettlementListResponse>(`${this.apiUrl}/jobs/settlements/admin`, { params });
  }
}
