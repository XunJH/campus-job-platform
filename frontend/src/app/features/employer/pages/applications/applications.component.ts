import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { AiApiService } from '../../../../core/services/ai-api.service';
import { AuthService } from '../../../../core/services/auth.service';
import {
  ApplicationStage,
  ApplicationStageSummary,
  ApplicationStatus,
  EmployerApplicationsPayload,
  JobApplication,
  JobService
} from '../../../../core/services/job.service';
import { EmployerShellSidebarComponent } from '../../../../shared/components/employer-shell-sidebar/employer-shell-sidebar.component';

type StageCard = {
  key: ApplicationStage;
  label: string;
  description: string;
  accentClass: string;
  count: number;
};

@Component({
  selector: 'app-employer-applications',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, EmployerShellSidebarComponent],
  templateUrl: './applications.component.html',
  styleUrls: ['./applications.component.scss']
})
export class EmployerApplicationsComponent implements OnInit {
  loading = false;
  errorMessage = '';
  successMessage = '';
  reviewNotes = '';

  page = 1;
  limit = 10;

  selectedJobId: number | null = null;
  selectedStage: ApplicationStage | '' = '';
  selectedStatus: ApplicationStatus | '' = '';
  selectedApplication: JobApplication | null = null;
  processingAction: string | null = null;
  employerReview = {
    workDuration: '',
    performanceRating: 4,
    reviewText: ''
  };
  employerReviewLoading = false;
  employerReviewResult: any = null;

  payload: EmployerApplicationsPayload = {
    applications: [],
    jobs: [],
    summary: {
      total: 0,
      pending: 0,
      approved: 0,
      rejected: 0,
      withdrawn: 0
    },
    stageSummary: {
      new: 0,
      screening: 0,
      interview_shortlist: 0,
      interview_confirmed: 0,
      rejected_pool: 0,
      archived: 0
    },
    pagination: {
      page: 1,
      limit: 10,
      total: 0,
      totalPages: 0
    }
  };

  private readonly stageConfig: Record<ApplicationStage, Omit<StageCard, 'count'>> = {
    new: {
      key: 'new',
      label: '新投递',
      description: '优先完成首轮浏览与分流',
      accentClass: 'border-sky-200 bg-sky-50 text-sky-700'
    },
    screening: {
      key: 'screening',
      label: '待筛选',
      description: '适合继续比较简历与资料',
      accentClass: 'border-indigo-200 bg-indigo-50 text-indigo-700'
    },
    interview_shortlist: {
      key: 'interview_shortlist',
      label: '待面试',
      description: '已进入安排面试阶段',
      accentClass: 'border-violet-200 bg-violet-50 text-violet-700'
    },
    interview_confirmed: {
      key: 'interview_confirmed',
      label: '已确认面试',
      description: '这些候选人会在沟通渠道置顶',
      accentClass: 'border-emerald-200 bg-emerald-50 text-emerald-700'
    },
    rejected_pool: {
      key: 'rejected_pool',
      label: '已淘汰',
      description: '保留记录，避免重复筛选',
      accentClass: 'border-rose-200 bg-rose-50 text-rose-700'
    },
    archived: {
      key: 'archived',
      label: '已归档',
      description: '已完成结论，留档备查',
      accentClass: 'border-slate-200 bg-slate-100 text-slate-700'
    }
  };

  constructor(
    private aiApi: AiApiService,
    private authService: AuthService,
    private jobService: JobService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.route.queryParamMap.subscribe((params) => {
      const jobId = params.get('jobId');
      const stage = params.get('stage') as ApplicationStage | null;
      const status = params.get('status') as ApplicationStatus | null;

      this.selectedJobId = jobId ? Number(jobId) : null;
      this.selectedStage = stage && this.isStage(stage) ? stage : '';
      this.selectedStatus = status && this.isStatus(status) ? status : '';
      this.page = 1;
      this.loadApplications();
    });
  }

  get applications(): JobApplication[] {
    return this.payload.applications;
  }

  get jobs(): EmployerApplicationsPayload['jobs'] {
    return this.payload.jobs;
  }

  get totalPages(): number {
    return this.payload.pagination.totalPages || 0;
  }

  get stageCards(): StageCard[] {
    return (Object.keys(this.stageConfig) as ApplicationStage[]).map((stage) => ({
      ...this.stageConfig[stage],
      count: this.payload.stageSummary[stage]
    }));
  }

  loadApplications(): void {
    this.loading = true;
    this.errorMessage = '';

    const selectedId = this.selectedApplication?.id || null;

    this.jobService.getReceivedApplications(
      this.page,
      this.limit,
      this.selectedJobId,
      this.selectedStage || null,
      this.selectedStatus || null
    ).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.payload = res.data;
          const nextSelected = this.payload.applications.find((item) => item.id === selectedId);
          this.selectedApplication = nextSelected || this.payload.applications[0] || null;
          this.reviewNotes = this.selectedApplication?.notes || '';
          this.resetEmployerReviewAssistant();
        } else {
          this.errorMessage = '获取申请列表失败。';
        }
        this.loading = false;
      },
      error: (err) => {
        this.errorMessage = err.error?.message || '网络错误，请稍后重试。';
        this.loading = false;
      }
    });
  }

  selectApplication(application: JobApplication): void {
    this.selectedApplication = application;
    this.reviewNotes = application.notes || '';
    this.resetEmployerReviewAssistant();
    this.successMessage = '';
    this.errorMessage = '';
  }

  applyFilters(): void {
    this.page = 1;
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        jobId: this.selectedJobId || null,
        stage: this.selectedStage || null,
        status: this.selectedStatus || null
      },
      queryParamsHandling: 'merge'
    });
  }

  clearFilters(): void {
    this.selectedJobId = null;
    this.selectedStage = '';
    this.selectedStatus = '';
    this.page = 1;
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        jobId: null,
        stage: null,
        status: null
      },
      queryParamsHandling: 'merge'
    });
  }

  filterByStage(stage: ApplicationStage): void {
    this.selectedStage = this.selectedStage === stage ? '' : stage;
    this.applyFilters();
  }

  filterByStatus(status: ApplicationStatus): void {
    this.selectedStatus = this.selectedStatus === status ? '' : status;
    this.applyFilters();
  }

  updateSelectedStage(stage: ApplicationStage): void {
    if (!this.selectedApplication || !this.canMoveStage(this.selectedApplication) || this.processingAction) {
      return;
    }

    this.processingAction = `stage:${stage}`;
    this.errorMessage = '';
    this.successMessage = '';

    this.jobService.updateApplicationStage(
      this.selectedApplication.id,
      stage,
      this.reviewNotes
    ).subscribe({
      next: (res) => {
        this.processingAction = null;
        this.successMessage = res.message || '申请阶段更新成功。';
        this.selectedApplication = res.data;
        this.reviewNotes = res.data.notes || '';
        this.loadApplications();
      },
      error: (err) => {
        this.processingAction = null;
        this.errorMessage = err.error?.message || '更新申请阶段失败。';
      }
    });
  }

  reviewSelectedApplication(status: 'approved' | 'rejected'): void {
    if (!this.selectedApplication || !this.canFinalize(this.selectedApplication) || this.processingAction) {
      return;
    }

    this.processingAction = `review:${status}`;
    this.errorMessage = '';
    this.successMessage = '';

    this.jobService.reviewApplication(
      this.selectedApplication.id,
      status,
      this.reviewNotes
    ).subscribe({
      next: (res) => {
        this.processingAction = null;
        this.successMessage = res.message || '申请处理成功。';
        this.selectedApplication = res.data;
        this.reviewNotes = res.data.notes || '';
        this.loadApplications();
      },
      error: (err) => {
        this.processingAction = null;
        this.errorMessage = err.error?.message || '处理申请失败。';
      }
    });
  }

  runEmployerReviewAnalysis(): void {
    const application = this.selectedApplication;
    if (!application || !this.canUseReviewAssistant(application) || !this.employerReview.reviewText.trim()) {
      return;
    }

    this.employerReviewLoading = true;
    this.employerReviewResult = null;

    this.aiApi
      .analyzeEmployerReviewToStudent(
        this.getUserId(),
        String(application.student?.id || ''),
        application.student?.username || '候选人',
        application.job?.title || '岗位',
        this.employerReview.workDuration.trim() || '合作周期待补充',
        this.employerReview.performanceRating,
        this.employerReview.reviewText.trim()
      )
      .subscribe({
        next: (res) => {
          this.employerReviewResult = res.data?.ai_analysis || null;
          this.employerReviewLoading = false;
        },
        error: (err) => {
          this.employerReviewResult = {
            error: err.error?.detail || err.error?.message || '评价分析失败，请稍后重试。'
          };
          this.employerReviewLoading = false;
        }
      });
  }

  prevPage(): void {
    if (this.page > 1) {
      this.page -= 1;
      this.loadApplications();
    }
  }

  nextPage(): void {
    if (this.page < this.totalPages) {
      this.page += 1;
      this.loadApplications();
    }
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/auth/login']);
  }

  isStageSelected(stage: ApplicationStage): boolean {
    return this.selectedStage === stage;
  }

  isStatusSelected(status: ApplicationStatus): boolean {
    return this.selectedStatus === status;
  }

  canMoveStage(application: JobApplication): boolean {
    return application.status === 'pending';
  }

  canFinalize(application: JobApplication): boolean {
    return application.status === 'pending';
  }

  canUseReviewAssistant(application: JobApplication): boolean {
    return application.status === 'approved';
  }

  getStageMeta(stage?: ApplicationStage | null): { label: string; className: string } {
    const map: Record<ApplicationStage, { label: string; className: string }> = {
      new: { label: '新投递', className: 'bg-sky-50 text-sky-700' },
      screening: { label: '待筛选', className: 'bg-indigo-50 text-indigo-700' },
      interview_shortlist: { label: '待面试', className: 'bg-violet-50 text-violet-700' },
      interview_confirmed: { label: '已确认面试', className: 'bg-emerald-50 text-emerald-700' },
      rejected_pool: { label: '已淘汰', className: 'bg-rose-50 text-rose-700' },
      archived: { label: '已归档', className: 'bg-slate-100 text-slate-700' }
    };

    return stage ? map[stage] : map.new;
  }

  getStatusMeta(status: ApplicationStatus): { label: string; className: string } {
    const map: Record<ApplicationStatus, { label: string; className: string }> = {
      pending: { label: '流程进行中', className: 'bg-amber-50 text-amber-700' },
      approved: { label: '最终通过', className: 'bg-emerald-50 text-emerald-700' },
      rejected: { label: '最终淘汰', className: 'bg-rose-50 text-rose-700' },
      withdrawn: { label: '学生已撤回', className: 'bg-slate-100 text-slate-700' }
    };

    return map[status];
  }

  formatDate(value?: string | null): string {
    if (!value) return '-';
    const date = new Date(value);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  }

  getStudentInitial(application: JobApplication): string {
    return application.student?.username?.charAt(0)?.toUpperCase() || '?';
  }

  getStudentName(application: JobApplication): string {
    return application.student?.username || '未命名学生';
  }

  getStageSummaryValue(summary: ApplicationStageSummary, stage: ApplicationStage): number {
    return summary[stage];
  }

  getReviewDimensionEntries(dimensions?: Record<string, string | null | undefined>): Array<{ label: string; value: string }> {
    const labelMap: Record<string, string> = {
      attendance: '出勤情况',
      communication: '沟通表现',
      task_completion: '任务完成度',
      attitude: '工作态度',
      rehire_willingness: '再次录用意愿'
    };

    return Object.entries(dimensions || {})
      .filter(([, value]) => Boolean(value))
      .map(([key, value]) => ({
        label: labelMap[key] || key,
        value: String(value)
      }));
  }

  private getUserId(): string {
    const user = this.authService.getCurrentUser();
    return String(user?.id || 'employer');
  }

  private resetEmployerReviewAssistant(): void {
    this.employerReview = {
      workDuration: '',
      performanceRating: 4,
      reviewText: ''
    };
    this.employerReviewLoading = false;
    this.employerReviewResult = null;
  }

  private isStage(value: string): value is ApplicationStage {
    return Object.keys(this.stageConfig).includes(value);
  }

  private isStatus(value: string): value is ApplicationStatus {
    return ['pending', 'approved', 'rejected', 'withdrawn'].includes(value);
  }
}
