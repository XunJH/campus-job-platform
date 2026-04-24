import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Employer {
  id: number;
  username: string;
  avatar?: string;
  bio?: string;
}

export interface Job {
  id: number;
  title: string;
  description: string;
  requirements: string;
  salary: number;
  salaryType: string;
  location: string;
  workLocation?: string;
  category?: string;
  jobType: string;
  workingHours?: string;
  deadline?: string;
  status: string;
  auditStatus?: string;
  rejectionReason?: string;
  employerId: number;
  employer?: Employer;
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

  getJobs(
    page = 1,
    limit = 10,
    title?: string,
    minSalary?: number,
    workLocation?: string,
    category?: string,
    jobType?: string
  ): Observable<{ success: boolean; data: { jobs: Job[]; pagination: any } }> {
    let params = new HttpParams().set('page', page).set('limit', limit);
    if (title) {
      params = params.set('title', title);
    }
    if (minSalary !== undefined && minSalary !== null) {
      params = params.set('minSalary', minSalary.toString());
    }
    if (workLocation) {
      params = params.set('workLocation', workLocation);
    }
    if (category) {
      params = params.set('category', category);
    }
    if (jobType) {
      params = params.set('jobType', jobType);
    }
    return this.http.get<any>(this.API_URL, { params });
  }

  getJobById(id: number): Observable<{ success: boolean; data: Job }> {
    return this.http.get<any>(`${this.API_URL}/${id}`);
  }

  updateJob(id: number, data: Partial<Job>): Observable<{ success: boolean; message: string; data: Job }> {
    return this.http.put<any>(`${this.API_URL}/${id}`, data);
  }

  deleteJob(id: number): Observable<{ success: boolean; message: string }> {
    return this.http.delete<any>(`${this.API_URL}/${id}`);
  }
}
