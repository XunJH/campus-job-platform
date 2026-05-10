import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Employer {
  id: number;
  username: string;
  email?: string;
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

export interface StudentApplicant {
  id: number;
  username: string;
  email?: string;
  phone?: string;
  avatar?: string;
  bio?: string;
  creditScore?: number;
  personalityProfileCompletedAt?: string | null;
}

export interface JobApplication {
  id: number;
  status: 'pending' | 'approved' | 'rejected' | 'withdrawn';
  coverLetter?: string | null;
  notes?: string | null;
  appliedAt: string;
  reviewedAt?: string | null;
  reviewedBy?: number | null;
  updatedAt?: string;
  student?: StudentApplicant;
  reviewer?: {
    id: number;
    username: string;
  };
  job?: Job;
}

export interface BookmarkRecord {
  id: number;
  createdAt: string;
  updatedAt?: string;
  job?: Job;
}

export type SettlementStatus = 'pending' | 'paid' | 'disputed';

export interface SettlementRecord {
  id: number;
  applicationId: number;
  jobId: number;
  studentId: number;
  employerId: number;
  amount: number;
  salaryType: string;
  status: SettlementStatus;
  notes?: string | null;
  paidAt?: string | null;
  createdAt: string;
  updatedAt?: string;
  application?: {
    id: number;
    status: JobApplication['status'];
    appliedAt: string;
    reviewedAt?: string | null;
    notes?: string | null;
  };
  job?: Job;
  student?: StudentApplicant;
  employer?: Employer;
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

export interface StudentSettlementsPayload {
  settlements: SettlementRecord[];
  summary: SettlementSummary;
}

export interface EmployerSettlementsPayload {
  settlements: SettlementRecord[];
  jobs: Pick<Job, 'id' | 'title' | 'status' | 'auditStatus'>[];
  summary: SettlementSummary;
}

export interface EmployerStats {
  activeJobsCount: number;
  totalJobsCount: number;
  recentJobs: Job[];
  totalApplications: number;
  pendingApplications: number;
  recentApplications: JobApplication[];
}

export interface PaginationData {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface EmployerApplicationsPayload {
  applications: JobApplication[];
  jobs: Pick<Job, 'id' | 'title' | 'status' | 'auditStatus' | 'applicationsCount'>[];
  summary: {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
    withdrawn: number;
  };
  pagination: PaginationData;
}

@Injectable({ providedIn: 'root' })
export class JobService {
  private readonly API_URL = '/api/v1/jobs';

  constructor(private http: HttpClient) {}

  createJob(data: Partial<Job>): Observable<{ success: boolean; message: string; data: Job }> {
    return this.http.post<{ success: boolean; message: string; data: Job }>(this.API_URL, data);
  }

  getMyJobs(page = 1, limit = 10): Observable<{ success: boolean; data: { jobs: Job[]; pagination: PaginationData } }> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());

    return this.http.get<{ success: boolean; data: { jobs: Job[]; pagination: PaginationData } }>(
      `${this.API_URL}/my-jobs`,
      { params }
    );
  }

  getEmployerStats(): Observable<{ success: boolean; data: EmployerStats }> {
    return this.http.get<{ success: boolean; data: EmployerStats }>(`${this.API_URL}/employer-stats`);
  }

  getJobs(
    page = 1,
    limit = 10,
    title?: string,
    minSalary?: number,
    workLocation?: string,
    category?: string,
    jobType?: string,
    salaryType?: string
  ): Observable<{ success: boolean; data: { jobs: Job[]; pagination: PaginationData } }> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());

    if (title) params = params.set('title', title);
    if (minSalary !== undefined && minSalary !== null) params = params.set('minSalary', minSalary.toString());
    if (workLocation) params = params.set('workLocation', workLocation);
    if (category) params = params.set('category', category);
    if (jobType) params = params.set('jobType', jobType);
    if (salaryType) params = params.set('salaryType', salaryType);

    return this.http.get<{ success: boolean; data: { jobs: Job[]; pagination: PaginationData } }>(
      this.API_URL,
      { params }
    );
  }

  getJobById(id: number): Observable<{ success: boolean; data: Job }> {
    return this.http.get<{ success: boolean; data: Job }>(`${this.API_URL}/${id}`);
  }

  updateJob(id: number, data: Partial<Job>): Observable<{ success: boolean; message: string; data: Job }> {
    return this.http.put<{ success: boolean; message: string; data: Job }>(`${this.API_URL}/${id}`, data);
  }

  deleteJob(id: number): Observable<{ success: boolean; message: string }> {
    return this.http.delete<{ success: boolean; message: string }>(`${this.API_URL}/${id}`);
  }

  getReceivedApplications(
    page = 1,
    limit = 10,
    jobId?: number | null,
    status?: string | null
  ): Observable<{ success: boolean; data: EmployerApplicationsPayload }> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());

    if (jobId) params = params.set('jobId', jobId.toString());
    if (status) params = params.set('status', status);

    return this.http.get<{ success: boolean; data: EmployerApplicationsPayload }>(
      `${this.API_URL}/applications/received`,
      { params }
    );
  }

  reviewApplication(
    applicationId: number,
    status: 'approved' | 'rejected',
    notes?: string
  ): Observable<{ success: boolean; message: string; data: JobApplication }> {
    return this.http.patch<{ success: boolean; message: string; data: JobApplication }>(
      `${this.API_URL}/applications/${applicationId}/status`,
      { status, notes: notes ?? null }
    );
  }

  applyJob(id: number, coverLetter?: string): Observable<{ success: boolean; message: string; data?: JobApplication }> {
    return this.http.post<{ success: boolean; message: string; data?: JobApplication }>(
      `${this.API_URL}/${id}/apply`,
      { coverLetter }
    );
  }

  withdrawApplication(applicationId: number): Observable<{ success: boolean; message: string; data: JobApplication }> {
    return this.http.patch<{ success: boolean; message: string; data: JobApplication }>(
      `${this.API_URL}/applications/${applicationId}/withdraw`,
      {}
    );
  }

  checkApplied(id: number): Observable<{ success: boolean; data: { applied: boolean; status: string | null } }> {
    return this.http.get<{ success: boolean; data: { applied: boolean; status: string | null } }>(
      `${this.API_URL}/${id}/applied`
    );
  }

  toggleBookmark(id: number): Observable<{ success: boolean; message: string; data: { bookmarked: boolean } }> {
    return this.http.post<{ success: boolean; message: string; data: { bookmarked: boolean } }>(
      `${this.API_URL}/${id}/bookmark`,
      {}
    );
  }

  checkBookmarked(id: number): Observable<{ success: boolean; data: { bookmarked: boolean } }> {
    return this.http.get<{ success: boolean; data: { bookmarked: boolean } }>(
      `${this.API_URL}/${id}/bookmarked`
    );
  }

  getMyApplications(): Observable<{ success: boolean; data: JobApplication[] }> {
    return this.http.get<{ success: boolean; data: JobApplication[] }>(`${this.API_URL}/applications/my`);
  }

  getMyBookmarks(): Observable<{ success: boolean; data: BookmarkRecord[] }> {
    return this.http.get<{ success: boolean; data: BookmarkRecord[] }>(`${this.API_URL}/bookmarks/my`);
  }

  getMySettlements(): Observable<{ success: boolean; data: StudentSettlementsPayload }> {
    return this.http.get<{ success: boolean; data: StudentSettlementsPayload }>(`${this.API_URL}/settlements/my`);
  }

  getEmployerSettlements(
    status?: SettlementStatus | '',
    jobId?: number | null
  ): Observable<{ success: boolean; data: EmployerSettlementsPayload }> {
    let params = new HttpParams();

    if (status) {
      params = params.set('status', status);
    }

    if (jobId) {
      params = params.set('jobId', jobId.toString());
    }

    return this.http.get<{ success: boolean; data: EmployerSettlementsPayload }>(
      `${this.API_URL}/settlements/employer`,
      { params }
    );
  }

  updateSettlementStatus(
    settlementId: number,
    status: SettlementStatus,
    notes?: string
  ): Observable<{ success: boolean; message: string; data: SettlementRecord }> {
    return this.http.patch<{ success: boolean; message: string; data: SettlementRecord }>(
      `${this.API_URL}/settlements/${settlementId}/status`,
      { status, notes: notes ?? null }
    );
  }
}
