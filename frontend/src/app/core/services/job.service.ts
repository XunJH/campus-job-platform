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
  totalApplications: number;
  pendingApplications: number;
  recentApplications: any[];
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

  // ==================== 学生申请/收藏 ====================

  applyJob(id: number, coverLetter?: string): Observable<{ success: boolean; message: string; data?: any }> {
    return this.http.post<any>(`${this.API_URL}/${id}/apply`, { coverLetter });
  }

  checkApplied(id: number): Observable<{ success: boolean; data: { applied: boolean; status: string | null } }> {
    return this.http.get<any>(`${this.API_URL}/${id}/applied`);
  }

  toggleBookmark(id: number): Observable<{ success: boolean; message: string; data: { bookmarked: boolean } }> {
    return this.http.post<any>(`${this.API_URL}/${id}/bookmark`, {});
  }

  checkBookmarked(id: number): Observable<{ success: boolean; data: { bookmarked: boolean } }> {
    return this.http.get<any>(`${this.API_URL}/${id}/bookmarked`);
  }

  getMyApplications(): Observable<{ success: boolean; data: any[] }> {
    return this.http.get<any>(`${this.API_URL}/applications/my`);
  }

  getMyBookmarks(): Observable<{ success: boolean; data: any[] }> {
    return this.http.get<any>(`${this.API_URL}/bookmarks/my`);
  }
}
