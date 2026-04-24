import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { JobService } from '../../../../core/services/job.service';
import { VerificationService, VerificationStatus } from '../../../../core/services/verification.service';

interface EmployerStats {
  activeJobsCount: number;
  totalJobsCount: number;
  recentJobs: any[];
  totalApplications: number;
  pendingApplications: number;
  recentApplications: any[];
}

@Component({
  selector: 'app-employer-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
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
        } else {
          this.isLoading = false;
        }
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

  getTopJobs(): any[] {
    if (!this.stats?.recentJobs?.length) return [];
    return this.stats.recentJobs
      .filter((j: any) => j.applicationsCount > 0)
      .sort((a: any, b: any) => b.applicationsCount - a.applicationsCount)
      .slice(0, 4);
  }

  getMonthlyHires(): number {
    return 0;
  }

  getTrendIcon(value: number): string {
    if (value > 0) return 'trending_up';
    if (value < 0) return 'trending_down';
    return 'horizontal_rule';
  }

  getTrendClass(value: number): string {
    if (value > 0) return 'text-green-500';
    if (value < 0) return 'text-red-500';
    return 'text-orange-500';
  }

  getTrendLabel(value: number): string {
    if (value > 0) return `+${value}%`;
    if (value < 0) return `${value}%`;
    return '持平';
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/auth/login']);
  }
}
