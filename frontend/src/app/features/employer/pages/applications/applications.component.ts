import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import {
  EmployerApplicationsPayload,
  JobApplication,
  JobService
} from '../../../../core/services/job.service';
import { EmployerShellSidebarComponent } from '../../../../shared/components/employer-shell-sidebar/employer-shell-sidebar.component';

@Component({
  selector: 'app-employer-applications',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, EmployerShellSidebarComponent],
  templateUrl: './applications.component.html',
  styleUrls: ['./applications.component.scss']
})
export class EmployerApplicationsComponent implements OnInit {
  loading = false;
  errorMessage = '';
  successMessage = '';
  reviewNotes = '';

  page = 1;
  limit = 10;

  selectedJobId: number | null = null;
  selectedStatus = '';
  selectedApplication: JobApplication | null = null;
  processingStatus: 'approved' | 'rejected' | null = null;

  payload: EmployerApplicationsPayload = {
    applications: [],
    jobs: [],
    summary: {
      total: 0,
      pending: 0,
      approved: 0,
      rejected: 0,
      withdrawn: 0
    },
    pagination: {
      page: 1,
      limit: 10,
      total: 0,
      totalPages: 0
    }
  };

  constructor(
    private authService: AuthService,
    private jobService: JobService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.route.queryParamMap.subscribe((params) => {
      const jobId = params.get('jobId');
      const status = params.get('status');

      this.selectedJobId = jobId ? Number(jobId) : null;
      this.selectedStatus = status || '';
      this.page = 1;
      this.loadApplications();
    });
  }

  get applications(): JobApplication[] {
    return this.payload.applications;
  }

  get jobs(): EmployerApplicationsPayload['jobs'] {
    return this.payload.jobs;
  }

  get totalPages(): number {
    return this.payload.pagination.totalPages || 0;
  }

  loadApplications(): void {
    this.loading = true;
    this.errorMessage = '';

    const selectedId = this.selectedApplication?.id || null;

    this.jobService.getReceivedApplications(
      this.page,
      this.limit,
      this.selectedJobId,
      this.selectedStatus || null
    ).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.payload = res.data;
          const nextSelected = this.payload.applications.find((item) => item.id === selectedId);
          this.selectedApplication = nextSelected || this.payload.applications[0] || null;
          this.reviewNotes = this.selectedApplication?.notes || '';
        } else {
          this.errorMessage = '获取申请列表失败。';
        }
        this.loading = false;
      },
      error: (err) => {
        this.errorMessage = err.error?.message || '网络错误，请稍后重试。';
        this.loading = false;
      }
    });
  }

  selectApplication(application: JobApplication): void {
    this.selectedApplication = application;
    this.reviewNotes = application.notes || '';
    this.successMessage = '';
    this.errorMessage = '';
  }

  applyFilters(): void {
    this.page = 1;
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        jobId: this.selectedJobId || null,
        status: this.selectedStatus || null
      },
      queryParamsHandling: 'merge'
    });
  }

  clearFilters(): void {
    this.selectedJobId = null;
    this.selectedStatus = '';
    this.page = 1;
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        jobId: null,
        status: null
      },
      queryParamsHandling: 'merge'
    });
  }

  reviewSelectedApplication(status: 'approved' | 'rejected'): void {
    if (!this.selectedApplication || this.selectedApplication.status !== 'pending') {
      return;
    }

    this.processingStatus = status;
    this.errorMessage = '';
    this.successMessage = '';

    this.jobService.reviewApplication(
      this.selectedApplication.id,
      status,
      this.reviewNotes
    ).subscribe({
      next: (res) => {
        this.processingStatus = null;
        this.successMessage = res.message || '申请处理成功。';
        this.selectedApplication = res.data;
        this.reviewNotes = res.data.notes || '';
        this.loadApplications();
      },
      error: (err) => {
        this.processingStatus = null;
        this.errorMessage = err.error?.message || '处理申请失败。';
      }
    });
  }

  prevPage(): void {
    if (this.page > 1) {
      this.page -= 1;
      this.loadApplications();
    }
  }

  nextPage(): void {
    if (this.page < this.totalPages) {
      this.page += 1;
      this.loadApplications();
    }
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/auth/login']);
  }

  getStatusMeta(status: string): { label: string; className: string } {
    const map: Record<string, { label: string; className: string }> = {
      pending: { label: '待处理', className: 'bg-amber-50 text-amber-700' },
      approved: { label: '已通过', className: 'bg-emerald-50 text-emerald-700' },
      rejected: { label: '已拒绝', className: 'bg-rose-50 text-rose-700' },
      withdrawn: { label: '已撤回', className: 'bg-slate-100 text-slate-700' }
    };

    return map[status] || { label: status, className: 'bg-slate-100 text-slate-700' };
  }

  formatDate(value?: string | null): string {
    if (!value) return '-';
    const date = new Date(value);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  }

  getStudentInitial(application: JobApplication): string {
    return application.student?.username?.charAt(0)?.toUpperCase() || '?';
  }

  getStudentName(application: JobApplication): string {
    return application.student?.username || '未命名学生';
  }
}
