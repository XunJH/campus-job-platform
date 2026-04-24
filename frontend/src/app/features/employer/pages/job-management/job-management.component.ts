import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { JobService, Job } from '../../../../core/services/job.service';

/**
 * @功能 企业端岗位管理页
 * @说明 展示企业发布的所有岗位列表，支持查看、编辑、删除
 */
@Component({
  selector: 'app-job-management',
  standalone: true,
  imports: [CommonModule, RouterModule],
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
          this.errorMessage = '获取岗位列表失败';
        }
        this.loading = false;
      },
      error: (err) => {
        this.errorMessage = err.error?.message || '网络错误，请稍后重试';
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

  toggleStatus(job: Job): void {
    const newStatus = job.status === 'active' ? 'closed' : 'active';
    this.jobService.updateJob(job.id, { status: newStatus }).subscribe({
      next: () => {
        job.status = newStatus;
      },
      error: (err) => {
        this.errorMessage = err.error?.message || '操作失败';
      }
    });
  }

  deleteJob(job: Job): void {
    if (!confirm(`确定要删除岗位「${job.title}」吗？此操作不可恢复。`)) {
      return;
    }
    this.jobService.deleteJob(job.id).subscribe({
      next: () => {
        this.jobs = this.jobs.filter(j => j.id !== job.id);
        this.total--;
      },
      error: (err) => {
        this.errorMessage = err.error?.message || '删除失败';
      }
    });
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  formatStatus(status: string, auditStatus?: string): { label: string; class: string } {
    if (auditStatus === 'pending') {
      return { label: '审核中', class: 'bg-slate-100 text-slate-600' };
    }
    if (auditStatus === 'rejected') {
      return { label: '已拒绝', class: 'bg-red-50 text-red-700' };
    }
    const map: Record<string, { label: string; class: string }> = {
      active: { label: '招聘中', class: 'bg-green-50 text-green-700' },
      paused: { label: '已暂停', class: 'bg-orange-50 text-orange-700' },
      closed: { label: '已结束', class: 'bg-blue-50 text-blue-700' }
    };
    return map[status] || { label: status, class: 'bg-gray-50 text-gray-600' };
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

  prevPage(): void {
    if (this.page > 1) {
      this.page--;
      this.loadJobs();
    }
  }

  nextPage(): void {
    if (this.page < this.totalPages) {
      this.page++;
      this.loadJobs();
    }
  }
}
