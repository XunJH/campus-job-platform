import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../../core/services/auth.service';
import { JobService, Job } from '../../../../core/services/job.service';
import { PlatformSettingsService } from '../../../../core/services/platform-settings.service';
import { PersonalityProfileService } from '../../../../core/services/personality-profile.service';
import { AiFabComponent } from '../../../../shared/components/ai-fab/ai-fab.component';
import { StudentShellHeaderComponent } from '../../../../shared/components/student-shell-header/student-shell-header.component';

@Component({
  selector: 'app-jobs',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    AiFabComponent,
    StudentShellHeaderComponent
  ],
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

  batchApplyLoading = false;
  batchApplyMessage = '';
  batchApplyError = false;
  maxBatchApplyCount = 100;
  batchApplyEnabled = true;
  aiAssistantEnabled = true;

  categories = ['技术类', '教学类', '运营类', '设计类', '市场类', '其他'];
  workLocations = [
    { value: 'on_campus', label: '校内' },
    { value: 'remote', label: '远程' },
    { value: 'hybrid', label: '混合' }
  ];
  jobTypes = [
    { value: 'part_time', label: '兼职' },
    { value: 'full_time', label: '全职' },
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
    private platformSettingsService: PlatformSettingsService,
    private personalityProfileService: PersonalityProfileService
  ) {}

  ngOnInit(): void {
    this.loadPlatformSettings();

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
      error: () => {}
    });

    this.route.queryParams.subscribe((params) => {
      this.searchKeyword = params['search'] || '';
      this.loadJobs();
    });
  }

  get canBatchApply(): boolean {
    return this.batchApplyEnabled && this.jobs.length > 0 && !this.loading && !this.batchApplyLoading;
  }

  private loadPlatformSettings(): void {
    this.platformSettingsService.getPublicSettings().subscribe({
      next: (response) => {
        const settings = response.data;
        this.categories = settings.jobCategories?.length ? settings.jobCategories : this.categories;
        this.workLocations = this.mapWorkLocationOptions(settings.workLocationOptions);
        this.maxBatchApplyCount = settings.operationRules?.batchApplyLimit || 100;
        this.batchApplyEnabled = settings.featureToggles?.enableBatchApply !== false;
        this.aiAssistantEnabled = settings.featureToggles?.enableAiAssistant !== false;
        this.selectedCategories = this.selectedCategories.filter((category) => this.categories.includes(category));
      },
      error: () => {}
    });
  }

  private mapWorkLocationOptions(labels?: string[]): Array<{ value: string; label: string }> {
    const defaults = ['校内', '远程', '混合'];
    const source = labels && labels.length ? labels : defaults;

    return [
      { value: 'on_campus', label: this.normalizeWorkLocationLabel(source[0], defaults[0]) },
      { value: 'remote', label: this.normalizeWorkLocationLabel(source[1], defaults[1]) },
      { value: 'hybrid', label: this.normalizeWorkLocationLabel(source[2], defaults[2]) }
    ];
  }

  private normalizeWorkLocationLabel(label: string | undefined, fallback: string): string {
    const normalized = (label || '').trim();
    const presetMap: Record<string, string> = {
      on_campus: '校内',
      remote: '远程',
      hybrid: '混合'
    };

    return presetMap[normalized] || normalized || fallback;
  }

  private getActiveFilterArgs(): {
    category?: string;
    salaryType?: string;
    effectiveMinSalary?: number;
  } {
    return {
      category: this.selectedCategories.length > 0 ? this.selectedCategories.join(',') : undefined,
      salaryType: this.selectedSalaryTypes.length > 0 ? this.selectedSalaryTypes.join(',') : undefined,
      effectiveMinSalary: this.minSalary > 0 ? this.minSalary : undefined
    };
  }

  loadJobs(): void {
    this.loading = true;
    this.errorMessage = '';

    const filters = this.getActiveFilterArgs();

    this.jobService.getJobs(
      this.page,
      this.limit,
      this.searchKeyword || undefined,
      filters.effectiveMinSalary,
      this.selectedWorkLocation || undefined,
      filters.category,
      this.selectedJobType || undefined,
      filters.salaryType
    ).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.jobs = res.data.jobs || [];
          this.total = res.data.pagination?.total || 0;
          this.totalPages = res.data.pagination?.totalPages || 0;
        } else {
          this.errorMessage = '获取岗位列表失败。';
        }
        this.loading = false;
      },
      error: (err) => {
        this.errorMessage = err.error?.message || '网络错误，请稍后重试。';
        this.loading = false;
      }
    });
  }

  onSearch(): void {
    this.page = 1;
    this.batchApplyMessage = '';
    this.loadJobs();
  }

  onFilterChange(): void {
    this.page = 1;
    this.batchApplyMessage = '';
    this.loadJobs();
  }

  toggleCategory(category: string): void {
    const index = this.selectedCategories.indexOf(category);
    if (index > -1) {
      this.selectedCategories.splice(index, 1);
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
    const index = this.selectedSalaryTypes.indexOf(salaryType);
    if (index > -1) {
      this.selectedSalaryTypes.splice(index, 1);
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
    this.batchApplyMessage = '';
    this.loadJobs();
  }

  prevPage(): void {
    if (this.page > 1) {
      this.page -= 1;
      this.loadJobs();
    }
  }

  nextPage(): void {
    if (this.page < this.totalPages) {
      this.page += 1;
      this.loadJobs();
    }
  }

  applyFilteredJobs(): void {
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/auth/login']);
      return;
    }

    if (!this.batchApplyEnabled) {
      this.batchApplyError = true;
      this.batchApplyMessage = '平台暂时关闭了一键批量投递功能。';
      return;
    }

    if (this.total === 0 || this.batchApplyLoading) {
      return;
    }

    this.batchApplyLoading = true;
    this.batchApplyError = false;
    this.batchApplyMessage = '';

    const filters = this.getActiveFilterArgs();
    const batchLimit = Math.min(this.total, this.maxBatchApplyCount);

    this.jobService.getJobs(
      1,
      batchLimit,
      this.searchKeyword || undefined,
      filters.effectiveMinSalary,
      this.selectedWorkLocation || undefined,
      filters.category,
      this.selectedJobType || undefined,
      filters.salaryType
    ).subscribe({
      next: (res) => {
        const targetJobs = res.success && res.data ? (res.data.jobs || []) : [];
        const jobIds = targetJobs.map((job) => job.id);

        if (jobIds.length === 0) {
          this.batchApplyLoading = false;
          this.batchApplyError = true;
          this.batchApplyMessage = '当前筛选结果中没有可投递的岗位。';
          return;
        }

        this.jobService.batchApplyJobs(jobIds).subscribe({
          next: (applyRes) => {
            const data = applyRes.data;
            const detail: string[] = [];

            if (data.skippedCount) {
              detail.push(`跳过 ${data.skippedCount} 个`);
            }

            if (data.failedCount) {
              detail.push(`失败 ${data.failedCount} 个`);
            }

            if (this.total > this.maxBatchApplyCount) {
              detail.push(`本次只处理前 ${this.maxBatchApplyCount} 个筛选结果`);
            }

            const firstResumeHint = data.results.find((item) => item.message.includes('简历图片'));
            if (data.successCount === 0 && firstResumeHint) {
              this.batchApplyError = true;
              this.batchApplyMessage = `${firstResumeHint.message}。请先去个人资料上传简历图片。`;
            } else {
              this.batchApplyError = data.successCount === 0;
              this.batchApplyMessage = [
                `已成功投递 ${data.successCount} 个岗位`,
                detail.length ? detail.join('，') : ''
              ].filter(Boolean).join('；');
            }

            this.batchApplyLoading = false;
            this.loadJobs();
          },
          error: (err) => {
            this.batchApplyLoading = false;
            this.batchApplyError = true;
            this.batchApplyMessage = err.error?.message || '批量投递失败，请稍后重试。';
          }
        });
      },
      error: (err) => {
        this.batchApplyLoading = false;
        this.batchApplyError = true;
        this.batchApplyMessage = err.error?.message || '读取筛选结果失败，请稍后重试。';
      }
    });
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

  getCategoryIcon(category: string): string {
    switch (category) {
      case '技术类':
        return 'code';
      case '教学类':
        return 'school';
      case '配送类':
        return 'local_shipping';
      default:
        return 'campaign';
    }
  }

  formatDate(dateStr: string): string {
    if (!dateStr) {
      return '';
    }

    const date = new Date(dateStr);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  getMatchScore(job: Job): string {
    const user = this.authService.getCurrentUser();
    const profile = user?.personalityProfile;
    const suitableJobs: string[] = profile?.suitable_jobs || [];

    if (!suitableJobs.length) {
      return '待评估';
    }

    const jobText = `${job.title || ''} ${job.category || ''} ${job.description || ''} ${job.location || ''}`.toLowerCase();
    let matchCount = 0;

    for (const suitableJob of suitableJobs) {
      if (jobText.includes(String(suitableJob).toLowerCase())) {
        matchCount += 1;
      }
    }

    const idStr = String(job.id || '');
    const base = idStr.charCodeAt(idStr.length - 1) || 0;

    if (matchCount >= 3) {
      return `${85 + (base % 10)}%`;
    }
    if (matchCount === 2) {
      return `${70 + (base % 10)}%`;
    }
    if (matchCount === 1) {
      return `${55 + (base % 10)}%`;
    }

    return `${40 + (base % 10)}%`;
  }
}
