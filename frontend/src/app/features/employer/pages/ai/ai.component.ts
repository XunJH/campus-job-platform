import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { AiApiService } from '../../../../core/services/ai-api.service';
import { AuthService } from '../../../../core/services/auth.service';
import {
  ApplicationStage,
  ApplicationStatus,
  Job,
  JobApplication,
  JobService
} from '../../../../core/services/job.service';
import { PlatformSettingsService } from '../../../../core/services/platform-settings.service';
import { EmployerShellSidebarComponent } from '../../../../shared/components/employer-shell-sidebar/employer-shell-sidebar.component';

type EmployerAiTab = 'chat' | 'referral';

type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
};

type RecruitmentContext = {
  application_id?: number | null;
  application_status?: string | null;
  application_stage?: string | null;
  applied_at?: string | null;
  stage_updated_at?: string | null;
  has_conversation?: boolean;
  conversation_status?: string | null;
  last_message_at?: string | null;
  in_pipeline?: boolean;
  pipeline_priority?: number;
  next_action?: string | null;
};

type CandidateFitBreakdown = {
  requirements_fit: number;
  keyword_fit: number;
  role_fit: number;
  profile_readiness: number;
  pipeline_fit: number;
  credit_score: number;
};

type GapMatchedItem = {
  requirement: string;
  evidence: string;
};

type GapItem = {
  requirement: string;
  severity: string;
  suggestion: string;
};

type CandidateGapAnalysis = {
  matched_items: GapMatchedItem[];
  gap_items: GapItem[];
  matched_count: number;
  gap_count: number;
  gap_suggestion: string;
};

type ReferralCandidate = {
  student_id: string;
  name: string;
  major?: string;
  grade?: string;
  bio?: string;
  summary?: string;
  tags?: string[];
  strengths?: string[];
  suitable_jobs?: string[];
  credit_score?: number;
  has_resume_image?: boolean;
  resume_image?: string;
  recruitment_context?: RecruitmentContext | null;
  source?: string;
};

type ReferralItem = {
  student: ReferralCandidate;
  match_score: number;
  recommendation: string;
  recruit_condition: string;
  candidate_readiness: string;
  fit_breakdown: CandidateFitBreakdown;
  match_reasons: string[];
  gap_analysis?: CandidateGapAnalysis | null;
};

type ReferralStatistics = {
  strongly_recommended: number;
  worth_considering: number;
  not_recommended: number;
};

type SmartReferralPayload = {
  job_id: string;
  job_title: string;
  job_salary?: string | null;
  job_requirements: string[];
  total_candidates: number;
  candidate_source: 'platform' | 'mock' | string;
  recommendations: ReferralItem[];
  statistics: ReferralStatistics;
  ai_summary: string;
};

@Component({
  selector: 'app-employer-ai',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, EmployerShellSidebarComponent],
  templateUrl: './ai.component.html',
  styleUrls: ['./ai.component.scss']
})
export class EmployerAiComponent implements OnInit {
  readonly tabs: Array<{ id: EmployerAiTab; label: string; icon: string }> = [
    { id: 'chat', label: 'AI 招聘问答', icon: 'forum' },
    { id: 'referral', label: '候选人推荐', icon: 'group_search' }
  ];

  readonly quickPrompts = [
    '请帮我把这份兼职岗位介绍改得更适合校园招聘场景。',
    '针对校园运营助理岗位，给我 8 个高质量面试问题。',
    '如果学生批量投递较多，我该如何更高效地筛选候选人？'
  ];

  activeTab: EmployerAiTab = 'chat';
  currentEmployerName = '';

  chatMessages: ChatMessage[] = [];
  chatInput = '';
  chatLoading = false;

  jobsLoading = false;
  jobsError = '';
  employerJobs: Job[] = [];
  selectedJobId: number | null = null;
  recommendationLimit = 8;
  referralLoading = false;
  referralError = '';
  referralResult: SmartReferralPayload | null = null;
  referralActionLoadingId: number | null = null;
  referralActionMessage = '';
  referralActionError = '';

  riskTypes: Record<string, { description: string; types: Array<{ name: string; desc: string }> }> | null = null;
  aiRuntimeStatus: any = null;

  constructor(
    private readonly authService: AuthService,
    private readonly aiApi: AiApiService,
    private readonly jobService: JobService,
    private readonly platformSettingsService: PlatformSettingsService,
    private readonly router: Router,
    private readonly route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    const user = this.authService.getCurrentUser();
    this.currentEmployerName = user?.username || '当前企业';

    this.route.queryParamMap.subscribe((params) => {
      this.activeTab = this.resolveTab(params.get('tab'));
    });

    this.platformSettingsService.getPublicSettings().subscribe({
      next: (response) => {
        if (response.data.featureToggles?.enableAiAssistant === false) {
          this.router.navigate(['/employer/dashboard']);
          return;
        }

        this.bootstrapPage();
      },
      error: () => this.bootstrapPage()
    });
  }

  get selectedJob(): Job | null {
    if (!this.selectedJobId) {
      return null;
    }

    return this.employerJobs.find((job) => job.id === this.selectedJobId) || null;
  }

  switchTab(tab: EmployerAiTab): void {
    this.activeTab = tab;
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab },
      queryParamsHandling: 'merge'
    });
  }

  usePrompt(prompt: string): void {
    this.chatInput = prompt;
  }

  sendChat(): void {
    if (!this.chatInput.trim() || this.chatLoading) {
      return;
    }

    const message = this.chatInput.trim();
    this.chatMessages.push({ role: 'user', content: message });
    this.chatInput = '';
    this.chatLoading = true;

    this.aiApi.employerChat(this.getUserId(), message, 'hr', this.chatMessages.slice(-10)).subscribe({
      next: (res) => {
        this.chatMessages.push({
          role: 'assistant',
          content: res.data?.reply || '抱歉，我暂时没有生成建议，请稍后再试。'
        });
        this.chatLoading = false;
      },
      error: (err) => {
        this.chatMessages.push({
          role: 'assistant',
          content: err.error?.message || '网络异常，暂时无法完成问答。'
        });
        this.chatLoading = false;
      }
    });
  }

  runSmartReferral(): void {
    if (!this.selectedJob) {
      this.referralError = '请先选择一个岗位。';
      return;
    }

    this.referralLoading = true;
    this.referralError = '';
    this.referralResult = null;
    this.referralActionMessage = '';
    this.referralActionError = '';

    const job = this.selectedJob;

    this.aiApi
      .smartReferral(
        String(job.id),
        job.title,
        job.description || '',
        this.extractJobRequirements(job),
        this.formatSalary(job),
        this.recommendationLimit,
        true
      )
      .subscribe({
        next: (res) => {
          this.referralResult = res.data || null;
          this.referralLoading = false;
        },
        error: (err) => {
          this.referralError = err.error?.message || '候选人推荐加载失败，请稍后重试。';
          this.referralLoading = false;
        }
      });
  }

  openConversation(item: ReferralItem): void {
    const applicationId = item.student.recruitment_context?.application_id;
    if (!applicationId) {
      return;
    }

    this.router.navigate(['/employer/messages'], {
      queryParams: { applicationId }
    });
  }

  goToApplications(jobId?: number | null): void {
    this.router.navigate(['/employer/applications'], {
      queryParams: jobId ? { jobId } : {}
    });
  }

  openResumeImage(item: ReferralItem): void {
    const url = item.student.resume_image;
    if (!url) {
      return;
    }

    window.open(url, '_blank', 'noopener');
  }

  getStageActionOptions(item: ReferralItem): Array<{ stage: ApplicationStage; label: string; style: string }> {
    const context = item.student.recruitment_context;
    if (!context?.application_id || context.application_status !== 'pending') {
      return [];
    }

    const options: Array<{ stage: ApplicationStage; label: string; style: string }> = [];

    if (context.application_stage !== 'screening') {
      options.push({
        stage: 'screening',
        label: '加入待筛选',
        style: 'border border-slate-200 text-slate-700'
      });
    }

    if (context.application_stage !== 'interview_shortlist') {
      options.push({
        stage: 'interview_shortlist',
        label: '加入待面试',
        style: 'bg-sky-50 text-sky-700'
      });
    }

    if (context.application_stage !== 'interview_confirmed') {
      options.push({
        stage: 'interview_confirmed',
        label: '确认面试',
        style: 'bg-emerald-50 text-emerald-700'
      });
    }

    if (context.application_stage !== 'rejected_pool') {
      options.push({
        stage: 'rejected_pool',
        label: '移入淘汰池',
        style: 'bg-rose-50 text-rose-700'
      });
    }

    return options;
  }

  moveCandidateToStage(item: ReferralItem, stage: ApplicationStage): void {
    const applicationId = item.student.recruitment_context?.application_id;
    if (!applicationId || this.referralActionLoadingId) {
      return;
    }

    this.referralActionLoadingId = applicationId;
    this.referralActionMessage = '';
    this.referralActionError = '';

    this.jobService.updateApplicationStage(applicationId, stage).subscribe({
      next: (res) => {
        this.referralActionLoadingId = null;
        this.referralActionMessage = res.message || '候选人流程阶段已更新。';
        this.applyStageLocally(item, res.data);
      },
      error: (err) => {
        this.referralActionLoadingId = null;
        this.referralActionError = err.error?.message || '更新候选人阶段失败，请稍后重试。';
      }
    });
  }

  getCandidateSourceLabel(source?: string): string {
    return this.getCandidateSourceLabelDisplay(source);
  }

  getRecommendationTier(score: number): string {
    return this.getRecommendationTierDisplay(score);
  }

  getRecommendationTierClasses(score: number): string {
    if (score >= 85) {
      return 'bg-emerald-50 text-emerald-700';
    }

    if (score >= 70) {
      return 'bg-sky-50 text-sky-700';
    }

    if (score >= 55) {
      return 'bg-amber-50 text-amber-700';
    }

    return 'bg-rose-50 text-rose-700';
  }

  getPipelineStageLabel(stage?: string | null): string {
    return this.getPipelineStageLabelDisplay(stage);
  }

  getPipelineStageClasses(stage?: string | null): string {
    const map: Record<ApplicationStage, string> = {
      new: 'bg-sky-50 text-sky-700',
      screening: 'bg-indigo-50 text-indigo-700',
      interview_shortlist: 'bg-violet-50 text-violet-700',
      interview_confirmed: 'bg-emerald-50 text-emerald-700',
      rejected_pool: 'bg-rose-50 text-rose-700',
      archived: 'bg-slate-100 text-slate-700'
    };

    if (!stage) {
      return 'bg-slate-100 text-slate-700';
    }

    return map[stage as ApplicationStage] || 'bg-slate-100 text-slate-700';
  }

  getApplicationStatusLabel(status?: string | null): string {
    return this.getApplicationStatusLabelDisplay(status);
  }

  getApplicationStatusClasses(status?: string | null): string {
    const map: Record<ApplicationStatus, string> = {
      pending: 'bg-sky-50 text-sky-700',
      approved: 'bg-emerald-50 text-emerald-700',
      rejected: 'bg-rose-50 text-rose-700',
      withdrawn: 'bg-slate-100 text-slate-700'
    };

    if (!status) {
      return 'bg-slate-100 text-slate-700';
    }

    return map[status as ApplicationStatus] || 'bg-slate-100 text-slate-700';
  }

  getCandidateNextAction(item: ReferralItem): string {
    return this.getCandidateNextActionDisplay(item);
  }

  getFitMetricEntries(item: ReferralItem): Array<{ label: string; value: number }> {
    return this.getFitMetricEntriesDisplay(item);
  }

  getRiskLevelClasses(level?: string | null): string {
    if (!level) {
      return 'bg-slate-100 text-slate-700';
    }

    const normalized = String(level).toLowerCase();
    if (normalized.includes('high') || String(level).includes('高')) {
      return 'bg-rose-50 text-rose-700';
    }

    if (normalized.includes('medium') || String(level).includes('中')) {
      return 'bg-amber-50 text-amber-700';
    }

    return 'bg-emerald-50 text-emerald-700';
  }

  getAiRuntimeBadgeClasses(): string {
    if (!this.aiRuntimeStatus) {
      return 'bg-slate-100 text-slate-700';
    }

    return this.aiRuntimeStatus.mode === 'live'
      ? 'bg-emerald-50 text-emerald-700'
      : 'bg-amber-50 text-amber-700';
  }

  getAiRuntimeLabel(): string {
    return this.getAiRuntimeDisplayLabel();
  }

  getAiRuntimeHint(): string {
    return this.getAiRuntimeDisplayHint();
  }

  goToMessageSafety(): void {
    this.router.navigate(['/employer/messages']);
  }

  getGovernanceDecisionClasses(decision?: string | null): string {
    switch (decision) {
      case 'block_and_review':
        return 'bg-rose-50 text-rose-700';
      case 'manual_review':
        return 'bg-amber-50 text-amber-700';
      case 'warn':
        return 'bg-sky-50 text-sky-700';
      default:
        return 'bg-emerald-50 text-emerald-700';
    }
  }

  getRiskActionPriorityClasses(priority?: string | null): string {
    switch (priority) {
      case 'high':
        return 'bg-rose-50 text-rose-700';
      case 'medium':
        return 'bg-amber-50 text-amber-700';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  }

  getTabLabel(id: EmployerAiTab): string {
    const map: Record<EmployerAiTab, string> = {
      chat: '招聘问答',
      referral: '候选人推荐'
    };

    return map[id];
  }

  getQuickPromptLabel(index: number): string {
    const prompts = [
      '请帮我把这份兼职岗位介绍改得更适合校园招聘场景。',
      '针对校园运营助理岗位，给我 8 个高质量面试问题。',
      '如果学生批量投递较多，我该如何更高效地筛选候选人？'
    ];

    return prompts[index] || this.quickPrompts[index] || '';
  }

  getCandidateSourceLabelDisplay(source?: string): string {
    if (source === 'platform') {
      return '平台真实候选人';
    }

    if (source === 'mock') {
      return '候选样本池';
    }

    return '候选来源未标注';
  }

  getRecommendationTierDisplay(score: number): string {
    if (score >= 85) {
      return '强烈推荐';
    }

    if (score >= 70) {
      return '优先跟进';
    }

    if (score >= 55) {
      return '保留观察';
    }

    return '暂不推荐';
  }

  getPipelineStageLabelDisplay(stage?: string | null): string {
    const map: Record<ApplicationStage, string> = {
      new: '新投递',
      screening: '待筛选',
      interview_shortlist: '待面试',
      interview_confirmed: '已确认面试',
      rejected_pool: '已淘汰',
      archived: '已归档'
    };

    if (!stage) {
      return '未进入流程';
    }

    return map[stage as ApplicationStage] || '未进入流程';
  }

  getApplicationStatusLabelDisplay(status?: string | null): string {
    const map: Record<ApplicationStatus, string> = {
      pending: '流程处理中',
      approved: '最终通过',
      rejected: '最终淘汰',
      withdrawn: '学生已撤回'
    };

    if (!status) {
      return '未处理';
    }

    return map[status as ApplicationStatus] || '未处理';
  }

  getCandidateNextActionDisplay(item: ReferralItem): string {
    const context = item.student.recruitment_context;
    if (!context) {
      return '建议先发起沟通，确认候选人意向。';
    }

    if (context.next_action) {
      return context.next_action;
    }

    if (context.application_stage === 'interview_confirmed') {
      return '已确认面试，建议保持沟通并提醒面试时间。';
    }

    if (context.application_stage === 'interview_shortlist') {
      return '建议尽快发起沟通，确认面试时间。';
    }

    if (context.application_stage === 'screening') {
      return '建议进入深度筛选，重点查看简历与沟通记录。';
    }

    if (context.application_stage === 'new') {
      return '建议先查看简历与匹配理由，再决定是否进入待筛选。';
    }

    return '建议结合当前申请阶段与沟通情况，继续推进招聘流程。';
  }

  getFitMetricEntriesDisplay(item: ReferralItem): Array<{ label: string; value: number }> {
    return [
      { label: '岗位要求匹配', value: item.fit_breakdown?.requirements_fit ?? 0 },
      { label: '关键词命中', value: item.fit_breakdown?.keyword_fit ?? 0 },
      { label: '岗位方向适配', value: item.fit_breakdown?.role_fit ?? 0 },
      { label: '资料完整度', value: item.fit_breakdown?.profile_readiness ?? 0 },
      { label: '流程优先级', value: item.fit_breakdown?.pipeline_fit ?? 0 },
      { label: '信用评分', value: item.fit_breakdown?.credit_score ?? 0 }
    ];
  }

  formatJobTypeLabel(value?: string | null): string {
    const map: Record<string, string> = {
      part_time: '兼职',
      full_time: '全职',
      internship: '实习',
      temporary: '临时'
    };

    if (!value) {
      return '岗位类型待补充';
    }

    return map[value] || value;
  }

  formatWorkLocationLabel(value?: string | null): string {
    const map: Record<string, string> = {
      on_campus: '校内',
      remote: '远程',
      hybrid: '混合'
    };

    if (!value) {
      return '工作方式待补充';
    }

    return map[value] || value;
  }

  getStageActionLabel(stage: ApplicationStage): string {
    const map: Record<ApplicationStage, string> = {
      new: '恢复到新投递',
      screening: '加入待筛选',
      interview_shortlist: '加入待面试',
      interview_confirmed: '确认面试',
      rejected_pool: '移入淘汰池',
      archived: '归档'
    };

    return map[stage];
  }

  getAiRuntimeDisplayLabel(): string {
    return this.aiRuntimeStatus?.display_label || '运行状态未知';
  }

  getAiRuntimeDisplayHint(): string {
    return this.aiRuntimeStatus?.warning || '当前服务状态正常，可继续使用本页功能。';
  }

  trackByJobId(_index: number, job: Job): number {
    return job.id;
  }

  private bootstrapPage(): void {
    this.loadEmployerJobs();
    this.loadRiskTypes();
    this.loadRuntimeStatus();
  }

  private loadEmployerJobs(): void {
    this.jobsLoading = true;
    this.jobsError = '';

    this.jobService.getMyJobs(1, 100).subscribe({
      next: (res) => {
        const jobs = res.data?.jobs || [];
        this.employerJobs = [...jobs].sort((left, right) => this.getJobRank(right) - this.getJobRank(left));
        this.jobsLoading = false;

        if (!this.selectedJobId && this.employerJobs.length) {
          this.selectedJobId = this.employerJobs[0].id;
        }

      },
      error: (err) => {
        this.jobsLoading = false;
        this.jobsError = err.error?.message || '岗位列表加载失败，请稍后重试。';
      }
    });
  }

  private loadRiskTypes(): void {
    this.aiApi.getChatWarningRiskTypes().subscribe({
      next: (res) => {
        this.riskTypes = res.data || null;
      },
      error: () => {
        this.riskTypes = null;
      }
    });
  }

  private loadRuntimeStatus(): void {
    this.aiApi.getRuntimeStatus().subscribe({
      next: (res) => {
        this.aiRuntimeStatus = res.data || null;
      },
      error: () => {
        this.aiRuntimeStatus = null;
      }
    });
  }

  private applyStageLocally(item: ReferralItem, application: JobApplication): void {
    const context = item.student.recruitment_context || {};
    item.student.recruitment_context = {
      ...context,
      application_id: application.id,
      application_stage: application.applicationStage,
      application_status: application.status,
      stage_updated_at: application.stageUpdatedAt || application.updatedAt || new Date().toISOString(),
      next_action: this.getDefaultStageAction(application.applicationStage),
      in_pipeline: !['rejected_pool', 'archived'].includes(application.applicationStage)
    };
  }

  private getDefaultStageAction(stage: ApplicationStage): string {
    switch (stage) {
      case 'screening':
        return '已加入待筛选，建议集中查看简历图和资料完整度。';
      case 'interview_shortlist':
        return '已进入待面试，建议尽快发起沟通并确认时间安排。';
      case 'interview_confirmed':
        return '已确认面试，建议在沟通渠道置顶跟进，并提醒面试时间。';
      case 'rejected_pool':
        return '已移入淘汰池，建议保留记录，避免重复跟进。';
      case 'archived':
        return '当前候选人已归档，可作为历史记录保留。';
      case 'new':
      default:
        return '建议先完成首轮筛选，再决定是否继续推进。';
    }
  }

  private resolveTab(tab: string | null): EmployerAiTab {
    const allowed: EmployerAiTab[] = ['chat', 'referral'];
    return allowed.includes(tab as EmployerAiTab) ? (tab as EmployerAiTab) : 'chat';
  }

  private getUserId(): string {
    const user = this.authService.getCurrentUser();
    return String(user?.id || 'employer');
  }

  private extractJobRequirements(job: Job): string[] {
    const raw = [
      job.requirements || '',
      job.description || '',
      job.category || '',
      this.formatJobTypeLabel(job.jobType),
      this.formatWorkLocationLabel(job.workLocation),
      job.location || ''
    ];
    const terms = raw
      .flatMap((value) => value.split(/[\n\r,，。；;]/))
      .map((item) => item.trim())
      .filter(Boolean);

    return [...new Set(terms)].slice(0, 16);
  }

  private getJobRank(job: Job): number {
    let rank = 0;
    if (job.auditStatus === 'approved') rank += 4;
    if (job.status === 'active') rank += 3;
    if ((job.applicationsCount || 0) > 0) rank += 2;
    if (job.createdAt) rank += new Date(job.createdAt).getTime() / 1_000_000_000_000;
    return rank;
  }

  private formatSalary(job: Job): string {
    const typeMap: Record<string, string> = {
      monthly: '月薪',
      daily: '日薪',
      hourly: '时薪',
      per_project: '项目制'
    };

    const typeLabel = typeMap[job.salaryType] || '薪资';
    return `${typeLabel} ¥${Number(job.salary || 0).toFixed(2)}`;
  }
}
