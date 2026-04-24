import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Job {
  id: number;
  title: string;
  description: string;
  requirements: string;
  salary: string;
  location: string;
  jobType: string;
  salaryType: string;
  workingHours?: string;
  deadline?: string;
  status: 'active' | 'inactive' | 'filled' | 'draft' | 'closed' | 'cancelled';
  auditStatus?: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
  views: number;
  createdAt: string;
  employerId: number;
  employer?: {
    id: number;
    username: string;
    email: string;
  };
}

export interface JobsResponse {
  success: boolean;
  data: {
    jobs: Job[];
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
export class JobService {
  private apiUrl = environment.apiBaseUrl;

  constructor(private http: HttpClient) { }

  getJobs(page: number = 1, limit: number = 10, title?: string, auditStatus?: string): Observable<JobsResponse> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());
    if (title) {
      params = params.set('title', title);
    }
    if (auditStatus !== undefined) {
      params = params.set('auditStatus', auditStatus);
    }
    return this.http.get<JobsResponse>(`${this.apiUrl}/jobs`, { params });
  }

  getPendingJobs(page: number = 1, limit: number = 10): Observable<JobsResponse> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());
    return this.http.get<JobsResponse>(`${this.apiUrl}/jobs/pending`, { params });
  }

  approveJob(id: number): Observable<{ success: boolean; message: string; data: Job }> {
    return this.http.post<{ success: boolean; message: string; data: Job }>(`${this.apiUrl}/jobs/${id}/approve`, {});
  }

  rejectJob(id: number, reason: string): Observable<{ success: boolean; message: string; data: Job }> {
    return this.http.post<{ success: boolean; message: string; data: Job }>(`${this.apiUrl}/jobs/${id}/reject`, { reason });
  }

  getJobById(id: number): Observable<{ success: boolean; data: Job }> {
    return this.http.get<{ success: boolean; data: Job }>(`${this.apiUrl}/jobs/${id}`);
  }

  deleteJob(id: number): Observable<{ success: boolean; message: string }> {
    return this.http.delete<{ success: boolean; message: string }>(`${this.apiUrl}/jobs/${id}`);
  }

  updateJobStatus(id: number, status: string): Observable<{ success: boolean; message: string; data: Job }> {
    return this.http.put<{ success: boolean; message: string; data: Job }>(`${this.apiUrl}/jobs/${id}`, { status });
  }
}
