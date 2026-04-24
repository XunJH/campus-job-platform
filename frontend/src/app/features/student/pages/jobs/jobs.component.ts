import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../../core/services/auth.service';
import { JobService, Job } from '../../../../core/services/job.service';

/**
 * @功能 学生端岗位浏览页
 * @说明 展示所有已审核通过的岗位列表，支持搜索和分页
 */
@Component({
  selector: 'app-jobs',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './jobs.component.html',
  styleUrls: ['./jobs.component.scss']
})
export class JobsComponent implements OnInit {
  jobs: Job[] = [];
  loading = false;
  errorMessage = '';
  searchKeyword = '';
  minSalary = 15;
  selectedCategories: string[] = [];
  selectedWorkLocation = '';
  selectedJobType = '';

  page = 1;
  limit = 8;
  total = 0;
  totalPages = 0;

  categories = ['技术类', '教学类', '配送类', '营销类'];
  workLocations = [
    { value: 'on_campus', label: '校内' },
    { value: 'remote', label: '远程' },
    { value: 'hybrid', label: '混合' }
  ];
  jobTypes = [
    { value: 'part_time', label: '兼职' },
    { value: 'full_time', label: '长期' },
    { value: 'internship', label: '实习' },
    { value: 'temporary', label: '临时' }
  ];

  get salaryConfig() {
    if (this.selectedJobType === 'full_time' || this.selectedJobType === 'internship') {
      return { min: 1000, max: 5000, step: 100 };
    }
    return { min: 15, max: 100, step: 1 };
  }

  constructor(
    private authService: AuthService,
    private router: Router,
    private jobService: JobService
  ) {}

  ngOnInit(): void {
    this.loadJobs();
  }

  loadJobs(): void {
    this.loading = true;
    this.errorMessage = '';
    const category = this.selectedCategories.length > 0 ? this.selectedCategories.join(',') : undefined;
    const cfg = this.salaryConfig;
    const effectiveMinSalary = this.minSalary > cfg.min ? this.minSalary : undefined;
    this.jobService.getJobs(
      this.page,
      this.limit,
      this.searchKeyword || undefined,
      effectiveMinSalary,
      this.selectedWorkLocation || undefined,
      category,
      this.selectedJobType || undefined
    ).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.jobs = res.data.jobs || [];
          this.total = res.data.pagination?.total || 0;
          this.totalPages = res.data.pagination?.totalPages || 0;
        } else {
          this.errorMessage = '获取岗位列表失败';
        }
        this.loading = false;
      },
      error: (err) => {
        this.errorMessage = err.error?.message || '网络错误，请稍后重试';
        this.loading = false;
      }
    });
  }

  onSearch(): void {
    this.page = 1;
    this.loadJobs();
  }

  onFilterChange(): void {
    this.page = 1;
    this.loadJobs();
  }

  toggleCategory(category: string): void {
    const idx = this.selectedCategories.indexOf(category);
    if (idx > -1) {
      this.selectedCategories.splice(idx, 1);
    } else {
      this.selectedCategories.push(category);
    }
    this.onFilterChange();
  }

  selectWorkLocation(location: string): void {
    this.selectedWorkLocation = this.selectedWorkLocation === location ? '' : location;
    this.onFilterChange();
  }

  selectJobType(jobType: string): void {
    this.selectedJobType = this.selectedJobType === jobType ? '' : jobType;
    const cfg = this.salaryConfig;
    this.minSalary = cfg.min;
    this.onFilterChange();
  }

  resetFilters(): void {
    this.searchKeyword = '';
    this.selectedJobType = '';
    this.minSalary = 15;
    this.selectedCategories = [];
    this.selectedWorkLocation = '';
    this.page = 1;
    this.loadJobs();
  }

  prevPage(): void {
    if (this.page > 1) {
      this.page--;
      this.loadJobs();
    }
  }

  nextPage(): void {
    if (this.page < this.totalPages) {
      this.page++;
      this.loadJobs();
    }
  }

  formatSalary(job: Job): string {
    const typeMap: Record<string, string> = {
      hourly: '时薪',
      daily: '日薪',
      weekly: '周薪',
      monthly: '月薪'
    };
    const typeLabel = typeMap[job.salaryType] || '薪资';
    return `${typeLabel} ¥${job.salary}`;
  }

  formatJobType(jobType: string): string {
    const map: Record<string, string> = {
      part_time: '兼职',
      full_time: '全职',
      internship: '实习',
      temporary: '临时'
    };
    return map[jobType] || jobType;
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/auth/login']);
  }
}
