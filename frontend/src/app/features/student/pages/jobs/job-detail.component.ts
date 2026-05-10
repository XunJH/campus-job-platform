import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { JobService, Job } from '../../../../core/services/job.service';
import { AuthService } from '../../../../core/services/auth.service';
import { StudentShellHeaderComponent } from '../../../../shared/components/student-shell-header/student-shell-header.component';

@Component({
  selector: 'app-job-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, StudentShellHeaderComponent],
  templateUrl: './job-detail.component.html',
  styleUrls: ['./job-detail.component.scss']
})
export class JobDetailComponent implements OnInit {
  job: Job | null = null;
  loading = false;
  errorMessage = '';
  saved = false;
  applied = false;
  applicationStatus: 'pending' | 'approved' | 'rejected' | 'withdrawn' | null = null;
  applyLoading = false;
  saveLoading = false;
  matchScore: number | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private jobService: JobService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    const jobId = this.route.snapshot.paramMap.get('id');
    if (jobId) {
      this.loadJob(+jobId);
      return;
    }

    this.errorMessage = '岗位 ID 无效。';
  }

  loadJob(id: number): void {
    this.loading = true;
    this.errorMessage = '';

    this.jobService.getJobById(id).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.job = res.data;
          if (this.authService.isAuthenticated()) {
            this.checkApplied(id);
            this.checkBookmarked(id);
          }
        } else {
          this.errorMessage = '获取岗位详情失败。';
        }
        this.loading = false;
      },
      error: (err) => {
        this.errorMessage = err.error?.message || '网络错误，请稍后重试。';
        this.loading = false;
      }
    });
  }

  private checkApplied(id: number): void {
    this.jobService.checkApplied(id).subscribe({
      next: (res) => {
        if (res.success) {
          this.applied = res.data.applied;
          this.applicationStatus = (res.data.status as 'pending' | 'approved' | 'rejected' | 'withdrawn' | null) ?? null;
        }
      },
      error: () => {}
    });
  }

  private checkBookmarked(id: number): void {
    this.jobService.checkBookmarked(id).subscribe({
      next: (res) => {
        if (res.success) {
          this.saved = res.data.bookmarked;
        }
      },
      error: () => {}
    });
  }

  toggleSave(): void {
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/auth/login']);
      return;
    }

    if (!this.job) {
      return;
    }

    this.saveLoading = true;
    this.jobService.toggleBookmark(this.job.id).subscribe({
      next: (res) => {
        if (res.success) {
          this.saved = res.data.bookmarked;
        }
        this.saveLoading = false;
      },
      error: () => {
        this.saveLoading = false;
      }
    });
  }

  applyJob(): void {
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/auth/login']);
      return;
    }

    if (!this.job || this.applied) {
      return;
    }

    this.applyLoading = true;
    this.jobService.applyJob(this.job.id).subscribe({
      next: (res) => {
        if (res.success) {
          this.applied = true;
          this.applicationStatus = 'pending';
          this.job!.applicationsCount = (this.job!.applicationsCount || 0) + 1;
        } else {
          this.errorMessage = res.message || '申请失败。';
        }
        this.applyLoading = false;
      },
      error: (err) => {
        this.errorMessage = err.error?.message || '申请失败，请稍后重试。';
        this.applyLoading = false;
      }
    });
  }

  get requirementsList(): string[] {
    if (!this.job?.requirements) {
      return [];
    }

    return this.job.requirements
      .split('\n')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  formatSalary(): string {
    if (!this.job) {
      return '薪资面议';
    }

    const typeMap: Record<string, string> = {
      hourly: '时薪',
      daily: '日薪',
      weekly: '周薪',
      monthly: '月薪'
    };
    const typeLabel = typeMap[this.job.salaryType] || '薪资';
    return `${typeLabel} ￥${this.job.salary}`;
  }

  formatJobType(jobType?: string): string {
    const map: Record<string, string> = {
      part_time: '兼职',
      full_time: '全职',
      internship: '实习',
      temporary: '临时'
    };
    return map[jobType || ''] || jobType || '面议';
  }

  formatDate(dateStr?: string): string {
    if (!dateStr) {
      return '';
    }

    const date = new Date(dateStr);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  getApplyButtonLabel(): string {
    if (this.applyLoading) {
      return '提交中...';
    }

    if (!this.applicationStatus) {
      return '立即申请';
    }

    const statusLabelMap: Record<string, string> = {
      pending: '已申请',
      approved: '已通过',
      rejected: '已拒绝',
      withdrawn: '已撤回'
    };

    return statusLabelMap[this.applicationStatus] || '已申请';
  }
}
