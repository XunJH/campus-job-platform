import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { Job, JobApplication, JobService } from '../../../../core/services/job.service';
import { StudentShellHeaderComponent } from '../../../../shared/components/student-shell-header/student-shell-header.component';

@Component({
  selector: 'app-student-applications',
  standalone: true,
  imports: [CommonModule, RouterModule, StudentShellHeaderComponent],
  templateUrl: './applications.component.html',
  styleUrls: ['./applications.component.scss']
})
export class StudentApplicationsComponent implements OnInit {
  applications: JobApplication[] = [];
  loading = false;
  errorMessage = '';
  successMessage = '';
  withdrawingId: number | null = null;

  constructor(
    private authService: AuthService,
    private jobService: JobService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadApplications();
  }

  get pendingCount(): number {
    return this.countByStatus('pending');
  }

  get approvedCount(): number {
    return this.countByStatus('approved');
  }

  get rejectedCount(): number {
    return this.countByStatus('rejected');
  }

  get withdrawnCount(): number {
    return this.countByStatus('withdrawn');
  }

  loadApplications(): void {
    this.loading = true;
    this.errorMessage = '';

    this.jobService.getMyApplications().subscribe({
      next: (res) => {
        if (res.success) {
          this.applications = res.data || [];
        } else {
          this.errorMessage = '加载投递记录失败';
        }
        this.loading = false;
      },
      error: (err) => {
        this.errorMessage = err.error?.message || '加载投递记录失败，请稍后重试';
        this.loading = false;
      }
    });
  }

  withdrawApplication(application: JobApplication): void {
    if (!application.id || application.status !== 'pending' || this.withdrawingId) {
      return;
    }

    this.withdrawingId = application.id;
    this.errorMessage = '';
    this.successMessage = '';

    this.jobService.withdrawApplication(application.id).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.applications = this.applications.map((item) =>
            item.id === application.id ? { ...item, ...res.data } : item
          );
          this.successMessage = res.message || '申请已撤回';
        } else {
          this.errorMessage = res.message || '撤回申请失败';
        }
        this.withdrawingId = null;
      },
      error: (err) => {
        this.errorMessage = err.error?.message || '撤回申请失败，请稍后重试';
        this.withdrawingId = null;
      }
    });
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/auth/login']);
  }

  formatDate(dateStr?: string | null): string {
    if (!dateStr) {
      return '暂无';
    }

    const date = new Date(dateStr);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  formatSalary(job?: Job): string {
    if (!job?.salary) {
      return '薪资面议';
    }

    const typeMap: Record<string, string> = {
      hourly: '时薪',
      daily: '日薪',
      weekly: '周薪',
      monthly: '月薪'
    };

    return `${typeMap[job.salaryType] || '薪资'} ¥${job.salary}`;
  }

  getJobLink(job?: Job): string[] {
    return ['/student/jobs', String(job?.id || '')];
  }

  getStatusLabel(status: JobApplication['status']): string {
    const statusMap: Record<JobApplication['status'], string> = {
      pending: '待处理',
      approved: '已通过',
      rejected: '已拒绝',
      withdrawn: '已撤回'
    };

    return statusMap[status] || status;
  }

  getStatusClasses(status: JobApplication['status']): string {
    const classMap: Record<JobApplication['status'], string> = {
      pending: 'bg-amber-50 text-amber-700 border-amber-200',
      approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      rejected: 'bg-rose-50 text-rose-700 border-rose-200',
      withdrawn: 'bg-slate-100 text-slate-600 border-slate-200'
    };

    return classMap[status] || classMap.pending;
  }

  getLastUpdatedLabel(application: JobApplication): string {
    if (application.status === 'pending') {
      return '提交时间';
    }

    if (application.status === 'withdrawn') {
      return '撤回时间';
    }

    return '处理时间';
  }

  getLastUpdatedValue(application: JobApplication): string {
    if (application.status === 'withdrawn') {
      return this.formatDate(application.updatedAt || application.appliedAt);
    }

    if (application.status === 'approved' || application.status === 'rejected') {
      return this.formatDate(application.reviewedAt || application.updatedAt || application.appliedAt);
    }

    return this.formatDate(application.appliedAt);
  }

  private countByStatus(status: JobApplication['status']): number {
    return this.applications.filter((application) => application.status === status).length;
  }
}
