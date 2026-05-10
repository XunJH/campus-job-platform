import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { BookmarkRecord, Job, JobService } from '../../../../core/services/job.service';
import { StudentShellHeaderComponent } from '../../../../shared/components/student-shell-header/student-shell-header.component';

@Component({
  selector: 'app-student-favorites',
  standalone: true,
  imports: [CommonModule, RouterModule, StudentShellHeaderComponent],
  templateUrl: './favorites.component.html',
  styleUrls: ['./favorites.component.scss']
})
export class StudentFavoritesComponent implements OnInit {
  bookmarks: BookmarkRecord[] = [];
  loading = false;
  errorMessage = '';
  successMessage = '';
  removingId: number | null = null;

  constructor(
    private authService: AuthService,
    private jobService: JobService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadBookmarks();
  }

  get activeCount(): number {
    return this.bookmarks.filter((bookmark) => this.isActiveJob(bookmark.job)).length;
  }

  get unavailableCount(): number {
    return this.bookmarks.filter((bookmark) => !this.isActiveJob(bookmark.job)).length;
  }

  loadBookmarks(): void {
    this.loading = true;
    this.errorMessage = '';

    this.jobService.getMyBookmarks().subscribe({
      next: (res) => {
        if (res.success) {
          this.bookmarks = res.data || [];
        } else {
          this.errorMessage = '加载收藏列表失败';
        }
        this.loading = false;
      },
      error: (err) => {
        this.errorMessage = err.error?.message || '加载收藏列表失败，请稍后重试';
        this.loading = false;
      }
    });
  }

  removeBookmark(bookmark: BookmarkRecord, event?: Event): void {
    event?.stopPropagation();

    if (!bookmark.job?.id || this.removingId) {
      return;
    }

    this.removingId = bookmark.id;
    this.errorMessage = '';
    this.successMessage = '';

    this.jobService.toggleBookmark(bookmark.job.id).subscribe({
      next: (res) => {
        if (res.success) {
          this.bookmarks = this.bookmarks.filter((item) => item.id !== bookmark.id);
          this.successMessage = res.message || '已取消收藏';
        } else {
          this.errorMessage = res.message || '取消收藏失败';
        }
        this.removingId = null;
      },
      error: (err) => {
        this.errorMessage = err.error?.message || '取消收藏失败，请稍后重试';
        this.removingId = null;
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

  getAvailabilityLabel(job?: Job): string {
    if (!job) {
      return '岗位已失效';
    }

    if (this.isActiveJob(job)) {
      return '可投递';
    }

    if (job.auditStatus !== 'approved') {
      return '待审核';
    }

    if (job.status === 'closed') {
      return '已关闭';
    }

    return '暂不可投';
  }

  getAvailabilityClasses(job?: Job): string {
    if (this.isActiveJob(job)) {
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    }

    return 'bg-slate-100 text-slate-600 border-slate-200';
  }

  private isActiveJob(job?: Job): boolean {
    return Boolean(job && job.auditStatus === 'approved' && job.status === 'active');
  }
}
