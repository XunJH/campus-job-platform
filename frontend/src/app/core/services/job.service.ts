import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Job {
  id: number;
  title: string;
  description: string;
  requirements: string;
  salary: number;
  salaryType: string;
  location: string;
  jobType: string;
  workingHours?: string;
  deadline?: string;
  status: string;
  auditStatus?: string;
  rejectionReason?: string;
  employerId: number;
  createdAt: string;
  views?: number;
  applicationsCount?: number;
}

export interface EmployerStats {
  activeJobsCount: number;
  totalJobsCount: number;
  recentJobs: Job[];
}

@Injectable({ providedIn: 'root' })
export class JobService {
  private readonly API_URL = '/api/v1/jobs';

  constructor(private http: HttpClient) {}

  createJob(data: Partial<Job>): Observable<{ success: boolean; message: string; data: Job }> {
    return this.http.post<any>(this.API_URL, data);
  }

  getMyJobs(page = 1, limit = 10): Observable<{ success: boolean; data: { jobs: Job[]; pagination: any } }> {
    const params = new HttpParams().set('page', page).set('limit', limit);
    return this.http.get<any>(`${this.API_URL}/my-jobs`, { params });
  }

  getEmployerStats(): Observable<{ success: boolean; data: EmployerStats }> {
    return this.http.get<any>(`${this.API_URL}/employer-stats`);
  }
}
