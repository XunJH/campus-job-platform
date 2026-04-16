import { Component, OnInit } from '@angular/core';
import { PageEvent } from '@angular/material/paginator';
import { MatSnackBar } from '@angular/material/snack-bar';
import { JobService } from '../../core/services/job.service';

@Component({
  selector: 'app-jobs',
  templateUrl: './jobs.component.html',
  styleUrls: ['./jobs.component.scss']
})
export class JobsComponent implements OnInit {
  displayedColumns: string[] = ['id', 'title', 'company', 'location', 'salary', 'auditStatus', 'status', 'actions'];
  jobs: any[] = [];
  total = 0;
  page = 1;
  limit = 10;
  isLoading = false;
  searchText = '';
  activeTab: 'all' | 'pending' = 'all';

  constructor(private jobService: JobService, private snackBar: MatSnackBar) {}

  ngOnInit(): void {
    this.loadJobs();
  }

  loadJobs(): void {
    this.isLoading = true;
    if (this.activeTab === 'pending') {
      this.jobService.getPendingJobs(this.page, this.limit).subscribe({
        next: (res) => {
          this.jobs = res.data.jobs;
          this.total = res.data.pagination.total;
          this.isLoading = false;
        },
        error: () => {
          this.isLoading = false;
          this.snackBar.open('获取职位列表失败', '关闭', { duration: 3000 });
        }
      });
    } else {
      this.jobService.getJobs(this.page, this.limit, this.searchText || undefined).subscribe({
        next: (res) => {
          this.jobs = res.data.jobs;
          this.total = res.data.pagination.total;
          this.isLoading = false;
        },
        error: () => {
          this.isLoading = false;
          this.snackBar.open('获取职位列表失败', '关闭', { duration: 3000 });
        }
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
      pending: 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-50 text-orange-700',
      approved: 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700',
      rejected: 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700',
    };
    return map[status] || 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700';
  }
}
