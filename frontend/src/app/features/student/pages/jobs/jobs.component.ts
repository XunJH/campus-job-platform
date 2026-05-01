import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../../core/services/auth.service';
import { JobService, Job } from '../../../../core/services/job.service';
import { PersonalityProfileService } from '../../../../core/services/personality-profile.service';
import { AiFabComponent } from '../../../../shared/components/ai-fab/ai-fab.component';

/**
 * @功能 学生端岗位浏览页
 * @说明 展示所有已审核通过的岗位列表，支持搜索和分页
 */
@Component({
  selector: 'app-jobs',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, AiFabComponent],
  templateUrl: './jobs.component.html',
  styleUrls: ['./jobs.component.scss']
})
export class JobsComponent implements OnInit {
  jobs: Job[] = [];
  loading = false;
  errorMessage = '';
  searchKeyword = '';
  minSalary = 0;
  selectedCategories: string[] = [];
  selectedWorkLocation = '';
  selectedJobType = '';
  selectedSalaryTypes: string[] = [];

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

  salaryTypes = [
    { value: 'hourly', label: '时薪' },
    { value: 'daily', label: '日薪' },
    { value: 'weekly', label: '周薪' },
    { value: 'monthly', label: '月薪' }
  ];

  constructor(
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private jobService: JobService,
    private personalityProfileService: PersonalityProfileService
  ) {}

  ngOnInit(): void {
    // 先获取最新人格画像数据，确保匹配度计算使用最新信息
    this.personalityProfileService.getStatus().subscribe({
      next: (status) => {
        if (status.profile) {
          const user = this.authService.getCurrentUser();
          if (user) {
            user.personalityProfile = status.profile;
            this.authService.updateCurrentUser(user);
          }
        }
      },
      error: () => { /* 忽略错误，使用已有数据 */ }
    });

    this.route.queryParams.subscribe(params => {
      if (params['search']) {
        this.searchKeyword = params['search'];
      }
      this.loadJobs();
    });
  }

  loadJobs(): void {
    this.loading = true;
    this.errorMessage = '';
    const category = this.selectedCategories.length > 0 ? this.selectedCategories.join(',') : undefined;
    const salaryType = this.selectedSalaryTypes.length > 0 ? this.selectedSalaryTypes.join(',') : undefined;
    const effectiveMinSalary = this.minSalary > 0 ? this.minSalary : undefined;
    this.jobService.getJobs(
      this.page,
      this.limit,
      this.searchKeyword || undefined,
      effectiveMinSalary,
      this.selectedWorkLocation || undefined,
      category,
      this.selectedJobType || undefined,
      salaryType
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
    this.onFilterChange();
  }

  toggleSalaryType(salaryType: string): void {
    const idx = this.selectedSalaryTypes.indexOf(salaryType);
    if (idx > -1) {
      this.selectedSalaryTypes.splice(idx, 1);
    } else {
      this.selectedSalaryTypes.push(salaryType);
    }
    this.onFilterChange();
  }

  resetFilters(): void {
    this.searchKeyword = '';
    this.selectedJobType = '';
    this.minSalary = 0;
    this.selectedCategories = [];
    this.selectedWorkLocation = '';
    this.selectedSalaryTypes = [];
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

  /** 基于人格画像计算岗位匹配度 */
  getMatchScore(job: Job): string {
    const user = this.authService.getCurrentUser();
    const profile = user?.personalityProfile;
    const suitableJobs: string[] = profile?.suitable_jobs || [];

    // 未做性格测试
    if (!suitableJobs.length) {
      return '待评估';
    }

    const jobText = `${job.title || ''} ${job.category || ''} ${job.description || ''} ${job.location || ''}`.toLowerCase();
    let matchCount = 0;
    for (const sj of suitableJobs) {
      const keyword = sj.toLowerCase();
      if (jobText.includes(keyword)) {
        matchCount++;
      }
    }

    // 基于岗位ID做伪随机偏移，避免每次刷新都变
    const idStr = String(job.id || '');
    const base = idStr.charCodeAt(idStr.length - 1) || 0;

    if (matchCount >= 3) {
      return `${85 + (base % 10)}%`;  // 85~94%
    }
    if (matchCount === 2) {
      return `${70 + (base % 10)}%`;  // 70~79%
    }
    if (matchCount === 1) {
      return `${55 + (base % 10)}%`;  // 55~64%
    }
    // 有画像但关键词未直接命中，给基础匹配度
    return `${40 + (base % 10)}%`;     // 40~49%
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/auth/login']);
  }
}
