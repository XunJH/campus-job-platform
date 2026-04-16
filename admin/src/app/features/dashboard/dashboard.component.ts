import { Component, OnInit } from '@angular/core';
import { forkJoin } from 'rxjs';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AdminVerificationService } from '../../core/services/admin-verification.service';
import { UserService } from '../../core/services/user.service';
import { JobService } from '../../core/services/job.service';

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

  constructor(
    private userService: UserService,
    private jobService: JobService,
    private verificationService: AdminVerificationService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadStats();
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
}
