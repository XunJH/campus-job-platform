import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { JobService, Job } from '../../../../core/services/job.service';
import { EmployerShellSidebarComponent } from '../../../../shared/components/employer-shell-sidebar/employer-shell-sidebar.component';

@Component({
  selector: 'app-job-management',
  standalone: true,
  imports: [CommonModule, RouterModule, EmployerShellSidebarComponent],
  templateUrl: './job-management.component.html',
  styleUrls: ['./job-management.component.scss']
})
export class JobManagementComponent implements OnInit {
  jobs: Job[] = [];
  loading = false;
  errorMessage = '';
  page = 1;
  limit = 10;
  total = 0;
  totalPages = 0;

  constructor(
    private authService: AuthService,
    private router: Router,
    private jobService: JobService
  ) {}

  ngOnInit(): void {
    this.loadJobs();
  }

  loadJobs(): void {
    this.loading = true;
    this.errorMessage = '';

    this.jobService.getMyJobs(this.page, this.limit).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.jobs = res.data.jobs || [];
          this.total = res.data.pagination?.total || 0;
          this.totalPages = res.data.pagination?.totalPages || 0;
        } else {
          this.errorMessage = '获取岗位列表失败。';
        }
        this.loading = false;
      },
      error: (err) => {
        this.errorMessage = err.error?.message || '网络错误，请稍后重试。';
        this.loading = false;
      }
    });
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/auth/login']);
  }

  editJob(job: Job): void {
    this.router.navigate(['/employer/jobs/edit', job.id]);
  }

  viewApplications(job: Job): void {
    this.router.navigate(['/employer/applications'], {
      queryParams: { jobId: job.id }
    });
  }

  canToggleStatus(job: Job): boolean {
    return job.auditStatus === 'approved' && (job.status === 'active' || job.status === 'closed');
  }

  toggleStatus(job: Job): void {
    if (!this.canToggleStatus(job)) {
      return;
    }

    const newStatus = job.status === 'active' ? 'closed' : 'active';
    this.jobService.updateJob(job.id, { status: newStatus }).subscribe({
      next: (res) => {
        job.status = res.data?.status || newStatus;
      },
      error: (err) => {
        this.errorMessage = err.error?.message || '岗位状态更新失败。';
      }
    });
  }

  deleteJob(job: Job): void {
    if (!confirm(`确定要删除岗位“${job.title}”吗？此操作不可恢复。`)) {
      return;
    }

    this.jobService.deleteJob(job.id).subscribe({
      next: () => {
        this.jobs = this.jobs.filter((item) => item.id !== job.id);
        this.total = Math.max(this.total - 1, 0);
      },
      error: (err) => {
        this.errorMessage = err.error?.message || '删除岗位失败。';
      }
    });
  }

  formatDate(dateStr?: string): string {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  formatStatus(job: Job): { label: string; className: string } {
    if (job.auditStatus === 'pending') {
      return { label: '待审核', className: 'bg-slate-100 text-slate-700' };
    }

    if (job.auditStatus === 'rejected') {
      return { label: '审核拒绝', className: 'bg-rose-50 text-rose-700' };
    }

    const map: Record<string, { label: string; className: string }> = {
      draft: { label: '草稿', className: 'bg-slate-100 text-slate-700' },
      active: { label: '招聘中', className: 'bg-emerald-50 text-emerald-700' },
      closed: { label: '已关闭', className: 'bg-blue-50 text-blue-700' },
      cancelled: { label: '已取消', className: 'bg-gray-100 text-gray-600' }
    };

    return map[job.status] || { label: job.status, className: 'bg-gray-100 text-gray-600' };
  }

  formatJobType(jobType: string): string {
    const map: Record<string, string> = {
      part_time: '兼职',
      full_time: '全职',
      internship: '实习',
      temporary: '临时'
    };

    return map[jobType] || jobType;
  }

  formatSalary(job: Job): string {
    const typeMap: Record<string, string> = {
      hourly: '时薪',
      daily: '日薪',
      weekly: '周薪',
      monthly: '月薪'
    };

    return `${typeMap[job.salaryType] || '薪资'} ￥${Number(job.salary || 0)}`;
  }

  getToggleLabel(job: Job): string {
    return job.status === 'active' ? '关闭招聘' : '重新开放';
  }

  prevPage(): void {
    if (this.page > 1) {
      this.page -= 1;
      this.loadJobs();
    }
  }

  nextPage(): void {
    if (this.page < this.totalPages) {
      this.page += 1;
      this.loadJobs();
    }
  }
}
