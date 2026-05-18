import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export type ExportResource = 'users' | 'jobs' | 'applications' | 'verifications' | 'settlements' | 'tickets';

export interface DistributionItem {
  key: string;
  count: number;
}

export interface TrendItem {
  label: string;
  count: number;
}

export interface AdminReportOverview {
  summary: {
    totalUsers: number;
    totalEmployers: number;
    totalStudents: number;
    activeJobs: number;
    pendingJobReviews: number;
    totalApplications: number;
    openTickets: number;
    disputedSettlements: number;
    totalSettlementAmount: string;
  };
  distributions: {
    userRoles: DistributionItem[];
    userStatuses: DistributionItem[];
    jobAuditStatuses: DistributionItem[];
    applicationStages: DistributionItem[];
    ticketStatuses: DistributionItem[];
    settlementStatuses: DistributionItem[];
    verificationStatuses: DistributionItem[];
  };
  trends: {
    userRegistrations: TrendItem[];
    jobPosts: TrendItem[];
    applications: TrendItem[];
    tickets: TrendItem[];
  };
}

@Injectable({
  providedIn: 'root'
})
export class AdminReportService {
  private readonly apiUrl = `${environment.apiBaseUrl}/admin-reports`;

  constructor(private readonly http: HttpClient) {}

  getOverview(): Observable<{ success: boolean; data: AdminReportOverview }> {
    return this.http.get<{ success: boolean; data: AdminReportOverview }>(`${this.apiUrl}/overview`);
  }

  exportResource(resource: ExportResource): Observable<Blob> {
    const params = new HttpParams().set('resource', resource);
    return this.http.get(`${this.apiUrl}/export`, {
      params,
      responseType: 'blob'
    });
  }
}
