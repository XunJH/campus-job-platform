import { Component, OnInit } from '@angular/core';
import { forkJoin } from 'rxjs';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AdminVerificationService, Verification } from '../../core/services/admin-verification.service';
import { UserService } from '../../core/services/user.service';
import { JobService, Job } from '../../core/services/job.service';

interface PendingTask {
  id: number;
  title: string;
  subtitle: string;
  type: string;
  typeLabel: string;
  typeColor: string;
  submittedAt: string;
  priority: string;
  priorityLabel: string;
  priorityColor: string;
  icon: string;
  route: string[];
}

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  stats = {
    totalUsers: 0,
    totalJobs: 0,
    pendingVerifications: 0,
    totalVerifications: 0
  };
  isLoading = true;
  pendingTasks: PendingTask[] = [];

  // Chart placeholder data
  growthData = [
    { label: '1月', value: '12k', height: '40%' },
    { label: '2月', value: '15.2k', height: '55%' },
    { label: '3月', value: '14.1k', height: '50%' },
    { label: '4月', value: '19.8k', height: '70%' },
    { label: '5月', value: '18.5k', height: '65%' },
    { label: '6月', value: '24.5k', height: '85%' },
  ];

  jobCategories = [
    { label: '技术类', percent: '45%', color: 'bg-primary' },
    { label: '金融类', percent: '22%', color: 'bg-tertiary-fixed-dim' },
    { label: '创意类', percent: '18%', color: 'bg-secondary' },
    { label: '其他', percent: '15%', color: 'bg-surface-container-highest' },
  ];

  constructor(
    private userService: UserService,
    private jobService: JobService,
    private verificationService: AdminVerificationService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadStats();
    this.loadPendingTasks();
  }

  loadStats(): void {
    this.isLoading = true;
    forkJoin({
      users: this.userService.getUsers(1, 1),
      jobs: this.jobService.getJobs(1, 1),
      verifications: this.verificationService.getStats()
    }).subscribe({
      next: ({ users, jobs, verifications }) => {
        this.stats.totalUsers = users.total;
        this.stats.totalJobs = jobs.data.pagination.total;
        this.stats.pendingVerifications = verifications.data.pending;
        this.stats.totalVerifications = verifications.data.total;
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
        this.snackBar.open('获取统计数据失败', '关闭', { duration: 3000 });
      }
    });
  }

  loadPendingTasks(): void {
    forkJoin({
      verifications: this.verificationService.getPendingList(1, 3),
      jobs: this.jobService.getPendingJobs(1, 3)
    }).subscribe({
      next: ({ verifications, jobs }) => {
        const tasks: PendingTask[] = [];

        verifications.data.list.forEach((v: Verification) => {
          tasks.push({
            id: v.id,
            title: v.companyName,
            subtitle: '企业认证审核',
            type: 'company_audit',
            typeLabel: '企业审核',
            typeColor: 'bg-blue-50 text-blue-600',
            submittedAt: this.formatDate(v.submittedAt),
            priority: 'high',
            priorityLabel: '高',
            priorityColor: 'bg-red-50 text-red-600',
            icon: 'verified_user',
            route: ['/verification-review']
          });
        });

        jobs.data.jobs.forEach((j: Job) => {
          tasks.push({
            id: j.id,
            title: j.title,
            subtitle: j.employer?.username ? `${j.employer.username} 发布` : '岗位发布审核',
            type: 'job_audit',
            typeLabel: '岗位审核',
            typeColor: 'bg-surface-container text-secondary',
            submittedAt: this.formatDate(j.createdAt),
            priority: 'medium',
            priorityLabel: '中',
            priorityColor: 'bg-orange-50 text-orange-600',
            icon: 'work',
            route: ['/jobs']
          });
        });

        // Sort by date descending and take top 5
        this.pendingTasks = tasks.slice(0, 5);
      },
      error: () => {
        // Silently fail - table will be empty
      }
    });
  }

  refresh(): void {
    this.loadStats();
    this.loadPendingTasks();
  }

  private formatDate(dateStr: string): string {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
}
