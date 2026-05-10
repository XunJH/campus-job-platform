import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { JobApplication, JobService, EmployerStats } from '../../../../core/services/job.service';
import { VerificationService, VerificationStatus } from '../../../../core/services/verification.service';
import { EmployerShellSidebarComponent } from '../../../../shared/components/employer-shell-sidebar/employer-shell-sidebar.component';

@Component({
  selector: 'app-employer-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, EmployerShellSidebarComponent],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class EmployerDashboardComponent implements OnInit {
  verificationStatus: VerificationStatus | null = null;
  stats: EmployerStats | null = null;
  isLoading = true;

  constructor(
    private authService: AuthService,
    private jobService: JobService,
    private verificationService: VerificationService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.isLoading = true;

    this.verificationService.getStatus().subscribe({
      next: (res) => {
        this.verificationStatus = res.data;
        if (this.verificationStatus?.status === 'approved') {
          this.loadStats();
          return;
        }

        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
      }
    });
  }

  loadStats(): void {
    this.jobService.getEmployerStats().subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.stats = res.data;
        }
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
      }
    });
  }

  getTopJobs() {
    if (!this.stats?.recentJobs?.length) {
      return [];
    }

    return [...this.stats.recentJobs]
      .filter((job) => Number(job.applicationsCount || 0) > 0)
      .sort((a, b) => Number(b.applicationsCount || 0) - Number(a.applicationsCount || 0))
      .slice(0, 4);
  }

  getVerificationMeta(): { label: string; description: string; className: string } {
    switch (this.verificationStatus?.status) {
      case 'approved':
        return {
          label: '已认证',
          description: '企业认证已通过，可以正常发布并管理岗位。',
          className: 'bg-emerald-50 text-emerald-700'
        };
      case 'pending':
        return {
          label: '审核中',
          description: '认证材料正在审核，请耐心等待平台处理。',
          className: 'bg-amber-50 text-amber-700'
        };
      case 'rejected':
        return {
          label: '未通过',
          description: this.verificationStatus?.rejectionReason || '认证未通过，请补充或修改企业资料后重新提交。',
          className: 'bg-rose-50 text-rose-700'
        };
      default:
        return {
          label: '未提交',
          description: '完成企业认证后，可开放更多招聘功能。',
          className: 'bg-slate-100 text-slate-700'
        };
    }
  }

  getApplicationStatusMeta(status?: string): { label: string; className: string } {
    const map: Record<string, { label: string; className: string }> = {
      pending: { label: '待处理', className: 'bg-amber-50 text-amber-700' },
      approved: { label: '已通过', className: 'bg-emerald-50 text-emerald-700' },
      rejected: { label: '已拒绝', className: 'bg-rose-50 text-rose-700' },
      withdrawn: { label: '已撤回', className: 'bg-slate-100 text-slate-700' }
    };

    return map[status || ''] || { label: status || '未知', className: 'bg-slate-100 text-slate-700' };
  }

  formatDate(value?: string | null): string {
    if (!value) {
      return '--';
    }

    const date = new Date(value);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  getJobStatusLabel(status?: string): string {
    const map: Record<string, string> = {
      active: '招聘中',
      closed: '已关闭',
      draft: '草稿',
      cancelled: '已取消'
    };

    return map[status || ''] || status || '未知';
  }

  getAuditStatusLabel(status?: string): string {
    const map: Record<string, string> = {
      approved: '审核通过',
      pending: '待审核',
      rejected: '审核拒绝'
    };

    return map[status || ''] || status || '待审核';
  }

  getStudentName(application: JobApplication): string {
    return application.student?.username || '未命名学生';
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/auth/login']);
  }
}
