import { Component, OnInit } from '@angular/core';
import { PageEvent } from '@angular/material/paginator';
import { MatSnackBar } from '@angular/material/snack-bar';
import { forkJoin } from 'rxjs';
import { JobService } from '../../core/services/job.service';

@Component({
  selector: 'app-jobs',
  templateUrl: './jobs.component.html',
  styleUrls: ['./jobs.component.scss']
})
export class JobsComponent implements OnInit {
  displayedColumns: string[] = ['title', 'company', 'date', 'status', 'actions'];
  jobs: any[] = [];
  total = 0;
  page = 1;
  limit = 10;
  isLoading = false;
  searchText = '';
  activeTab: 'all' | 'pending' = 'all';
  pendingCount = 0;
  approvedCount = 0;

  constructor(private jobService: JobService, private snackBar: MatSnackBar) {}

  ngOnInit(): void {
    this.loadStats();
    this.loadJobs();
  }

  loadStats(): void {
    forkJoin({
      pending: this.jobService.getPendingJobs(1, 1),
      all: this.jobService.getJobs(1, 100)
    }).subscribe({
      next: ({ pending, all }) => {
        this.pendingCount = pending.data.pagination.total;
        this.approvedCount = all.data.jobs.filter((j: any) => j.auditStatus === 'approved').length;
      },
      error: () => {}
    });
  }

  loadJobs(): void {
    this.isLoading = true;
    if (this.activeTab === 'pending') {
      this.jobService.getPendingJobs(this.page, this.limit).subscribe({
        next: (res) => { this.jobs = res.data.jobs; this.total = res.data.pagination.total; this.isLoading = false; },
        error: () => { this.isLoading = false; this.snackBar.open('获取职位列表失败', '关闭', { duration: 3000 }); }
      });
    } else {
      this.jobService.getJobs(this.page, this.limit, this.searchText || undefined).subscribe({
        next: (res) => { this.jobs = res.data.jobs; this.total = res.data.pagination.total; this.isLoading = false; },
        error: () => { this.isLoading = false; this.snackBar.open('获取职位列表失败', '关闭', { duration: 3000 }); }
      });
    }
  }

  switchTab(tab: 'all' | 'pending'): void {
    this.activeTab = tab;
    this.page = 1;
    this.searchText = '';
    this.loadJobs();
  }

  onPageChange(event: PageEvent): void {
    this.page = event.pageIndex + 1;
    this.limit = event.pageSize;
    this.loadJobs();
  }

  goToPage(p: number): void {
    this.page = p;
    this.loadJobs();
  }

  get totalPages(): number {
    return Math.ceil(this.total / this.limit) || 1;
  }

  onSearch(): void {
    this.page = 1;
    this.loadJobs();
  }

  toggleStatus(job: any): void {
    const newStatus = job.status === 'active' ? 'closed' : 'active';
    this.jobService.updateJobStatus(job.id, newStatus).subscribe({
      next: () => {
        job.status = newStatus;
        this.snackBar.open('职位状态已更新', '关闭', { duration: 3000 });
      },
      error: () => {
        this.snackBar.open('更新职位状态失败', '关闭', { duration: 3000 });
      }
    });
  }

  approveJob(job: any): void {
    if (confirm(`确定通过职位 "${job.title}" 的审核？`)) {
      this.jobService.approveJob(job.id).subscribe({
        next: () => {
          this.snackBar.open('审核已通过', '关闭', { duration: 3000 });
          this.loadJobs();
          this.loadStats();
        },
        error: () => {
          this.snackBar.open('操作失败', '关闭', { duration: 3000 });
        }
      });
    }
  }

  rejectJob(job: any): void {
    const reason = prompt(`请输入拒绝职位 "${job.title}" 的原因：`);
    if (reason === null) return;
    this.jobService.rejectJob(job.id, reason || '不符合发布要求').subscribe({
      next: () => {
        this.snackBar.open('审核已拒绝', '关闭', { duration: 3000 });
        this.loadJobs();
        this.loadStats();
      },
      error: () => {
        this.snackBar.open('操作失败', '关闭', { duration: 3000 });
      }
    });
  }

  deleteJob(jobId: number, title: string): void {
    if (confirm(`确定要删除职位 "${title}" 吗？`)) {
      this.jobService.deleteJob(jobId).subscribe({
        next: () => {
          this.snackBar.open('职位已删除', '关闭', { duration: 3000 });
          this.loadJobs();
        },
        error: () => {
          this.snackBar.open('删除职位失败', '关闭', { duration: 3000 });
        }
      });
    }
  }

  getAuditStatusText(status: string): string {
    const map: Record<string, string> = { pending: '待审核', approved: '已通过', rejected: '已拒绝' };
    return map[status] || status;
  }

  getAuditStatusClass(status: string): string {
    const map: Record<string, string> = {
      pending: 'bg-orange-100 text-orange-700',
      approved: 'bg-green-100 text-green-700',
      rejected: 'bg-red-100 text-red-700',
    };
    return map[status] || 'bg-gray-100 text-gray-700';
  }

  getJobTypeIcon(jobType: string): string {
    const map: Record<string, string> = {
      part_time: 'schedule',
      full_time: 'work',
      internship: 'school',
      temporary: 'timelapse'
    };
    return map[jobType] || 'work';
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
}
