import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { JobService, Job } from '../../../../core/services/job.service';
import { AuthService } from '../../../../core/services/auth.service';

/**
 * @功能 学生端岗位详情页
 * @说明 展示单个岗位的详细信息，包含AI匹配度、企业信息、申请功能
 */
@Component({
  selector: 'app-job-detail',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './job-detail.component.html',
  styleUrls: ['./job-detail.component.scss']
})
export class JobDetailComponent implements OnInit {
  job: Job | null = null;
  loading = false;
  errorMessage = '';
  saved = false;
  matchScore = 92; // TODO: 从后端获取真实匹配度

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
    } else {
      this.errorMessage = '岗位ID无效';
    }
  }

  loadJob(id: number): void {
    this.loading = true;
    this.errorMessage = '';
    this.jobService.getJobById(id).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.job = res.data;
        } else {
          this.errorMessage = '获取岗位详情失败';
        }
        this.loading = false;
      },
      error: (err) => {
        this.errorMessage = err.error?.message || '网络错误，请稍后重试';
        this.loading = false;
      }
    });
  }

  toggleSave(): void {
    this.saved = !this.saved;
    // TODO: 调用收藏API
  }

  applyJob(): void {
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/auth/login']);
      return;
    }
    // TODO: 调用申请API
    alert('申请功能开发中...');
  }

  get requirementsList(): string[] {
    if (!this.job?.requirements) return [];
    return this.job.requirements.split('\n').filter(r => r.trim());
  }

  formatSalary(): string {
    if (!this.job) return '薪资面议';
    const typeMap: Record<string, string> = {
      hourly: '时薪',
      daily: '日薪',
      weekly: '周薪',
      monthly: '月薪'
    };
    const typeLabel = typeMap[this.job.salaryType] || '薪资';
    return `${typeLabel} ¥${this.job.salary}`;
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

  formatDate(dateStr: string | undefined): string {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
}
