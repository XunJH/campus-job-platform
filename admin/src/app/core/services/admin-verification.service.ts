import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Verification {
  id: number;
  userId: number;
  companyName: string;
  licenseNumber: string;
  contactName: string;
  contactPhone: string;
  licenseImage: string;
  address?: string;
  status: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
  submittedAt: string;
  reviewedAt?: string;
  user?: {
    id: number;
    username: string;
    email: string;
    phone?: string;
  };
}

export interface VerificationStats {
  pending: number;
  approved: number;
  rejected: number;
  total: number;
}

export interface PaginationData {
  list: Verification[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

@Injectable({
  providedIn: 'root'
})
export class AdminVerificationService {
  private apiUrl = `${environment.apiBaseUrl}/verification`;

  constructor(private http: HttpClient) {}

  getStats(): Observable<{ success: boolean; data: VerificationStats }> {
    return this.http.get<{ success: boolean; data: VerificationStats }>(`${this.apiUrl}/stats`);
  }

  getPendingList(page: number = 1, limit: number = 100): Observable<{ success: boolean; data: PaginationData }> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());
    return this.http.get<{ success: boolean; data: PaginationData }>(`${this.apiUrl}/pending`, { params });
  }

  getAll(
    page: number = 1,
    limit: number = 10,
    status?: string,
    search?: string
  ): Observable<{ success: boolean; data: PaginationData }> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());
    if (status) {
      params = params.set('status', status);
    }
    if (search) {
      params = params.set('search', search);
    }
    return this.http.get<{ success: boolean; data: PaginationData }>(`${this.apiUrl}/all`, { params });
  }

  getAllVerifications(
    page: number = 1,
    limit: number = 10,
    status?: string
  ): Observable<{ success: boolean; data: PaginationData }> {
    return this.getAll(page, limit, status);
  }

  getVerificationDetail(id: number): Observable<{ success: boolean; data: Verification }> {
    return this.http.get<{ success: boolean; data: Verification }>(`${this.apiUrl}/${id}`);
  }

  approve(id: number): Observable<{ success: boolean; message: string }> {
    return this.http.post<{ success: boolean; message: string }>(`${this.apiUrl}/${id}/approve`, {});
  }

  approveVerification(id: number): Observable<{ success: boolean; message: string }> {
    return this.approve(id);
  }

  reject(id: number, reason: string): Observable<{ success: boolean; message: string }> {
    return this.http.post<{ success: boolean; message: string }>(`${this.apiUrl}/${id}/reject`, { reason });
  }

  rejectVerification(id: number, reason: string): Observable<{ success: boolean; message: string }> {
    return this.reject(id, reason);
  }
}
