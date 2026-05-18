import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { AiApiService } from '../../../../core/services/ai-api.service';
import { PlatformSettingsService } from '../../../../core/services/platform-settings.service';
import { PersonalityProfileService } from '../../../../core/services/personality-profile.service';
import { JobApplication, JobService } from '../../../../core/services/job.service';
import { UserService } from '../../../../core/services/user.service';
import { StudentShellHeaderComponent } from '../../../../shared/components/student-shell-header/student-shell-header.component';

type StudentAiTab = 'test' | 'interview' | 'resume' | 'career';

interface QuestionOption {
  text: string;
}

interface PersonalityQuestion {
  id: number;
  question: string;
  options: QuestionOption[];
}

interface InterviewMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface AiWorkbenchSnapshot<TInput = any, TResult = any> {
  input: TInput;
  result: TResult;
  updatedAt: string;
}

interface StudentAiWorkbench {
  interview?: AiWorkbenchSnapshot<any, any>;
  resumeOptimize?: AiWorkbenchSnapshot<any, any>;
  rejectionAnalysis?: AiWorkbenchSnapshot<any, any>;
  resumeUpdate?: AiWorkbenchSnapshot<any, any>;
  careerPlan?: AiWorkbenchSnapshot<any, any>;
}

type WorkbenchSectionKey = keyof StudentAiWorkbench;

interface WorkbenchCard {
  section: WorkbenchSectionKey;
  tab: StudentAiTab;
  title: string;
  description: string;
  cta: string;
}

@Component({
  selector: 'app-student-ai',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, StudentShellHeaderComponent],
  templateUrl: './ai.component.html',
  styleUrls: ['./ai.component.scss']
})
export class StudentAiComponent implements OnInit {
  readonly tabs: Array<{ id: StudentAiTab; label: string; icon: string }> = [
    { id: 'test', label: '人格测评', icon: 'psychology' },
    { id: 'interview', label: '模拟面试', icon: 'record_voice_over' },
    { id: 'resume', label: '简历成果', icon: 'description' },
    { id: 'career', label: '职业规划', icon: 'map' },
  ];

  readonly workbenchCards: WorkbenchCard[] = [
    {
      section: 'interview',
      tab: 'interview',
      title: '模拟面试记录',
      description: '保留岗位、对话和面试总结，方便继续追问或重新演练。',
      cta: '继续面试'
    },
    {
      section: 'resumeOptimize',
      tab: 'resume',
      title: '简历优化结果',
      description: '保存评分、问题清单和改写建议，后续可继续润色。',
      cta: '继续优化'
    },
    {
      section: 'resumeUpdate',
      tab: 'resume',
      title: '兼职经历整理',
      description: '把兼职内容整理成可直接写进简历的经历草稿。',
      cta: '继续整理'
    },
    {
      section: 'careerPlan',
      tab: 'career',
      title: '职业规划路径',
      description: '保留目标岗位、成长步骤和下一步行动建议。',
      cta: '继续规划'
    },
    
  ];

  activeTab: StudentAiTab = 'test';

  questionnaire: PersonalityQuestion[] = [];
  currentQuestionIndex = 0;
  answers: number[] = [];
  testCompleted = false;
  testLoading = false;
  personalityResult: any = null;
  recommendations: any[] = [];
  recommendLoading = false;

  interviewJobTitle = '';
  interviewJobDescription = '';
  interviewInput = '';
  interviewStarted = false;
  interviewLoading = false;
  interviewMessages: InterviewMessage[] = [];
  interviewWarning: any = null;
  interviewEvaluation: any = null;

  resumeOptimize = {
    section: '自我介绍',
    content: '',
    jobTarget: ''
  };
  resumeOptimizeLoading = false;
  resumeOptimizeResult: any = null;

  rejectionForm = {
    jobTitle: '',
    rejectionMessage: '',
    resumeSummary: ''
  };
  rejectionLoading = false;
  rejectionResult: any = null;

  resumeUpdateForm = {
    jobTitle: '',
    company: '',
    duration: '',
    description: '',
    currentResume: ''
  };
  resumeUpdateLoading = false;
  resumeUpdateResult: any = null;

  careerForm = {
    targetJob: '',
    currentSkills: '',
    personalityTags: ''
  };
  careerLoading = false;
  careerResult: any = null;

    message = '';
  error = false;
  aiRuntimeStatus: any = null;

  constructor(
    private authService: AuthService,
    private aiApi: AiApiService,
    private platformSettingsService: PlatformSettingsService,
    private personalityProfileService: PersonalityProfileService,
    private jobService: JobService,
    private userService: UserService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.normalizeStaticCopy();
    this.route.queryParamMap.subscribe((params) => {
      this.activeTab = this.resolveTab(params.get('tab'));
    });

    this.platformSettingsService.getPublicSettings().subscribe({
      next: (response) => {
        if (response.data.featureToggles?.enableAiAssistant === false) {
          this.router.navigate(['/student/jobs']);
          return;
        }

        this.bootstrapPage();
      },
      error: () => this.bootstrapPage()
    });
  }

  get currentQuestion(): PersonalityQuestion | null {
    return this.questionnaire[this.currentQuestionIndex] || null;
  }

    get hasWorkbenchContent(): boolean {
    return this.workbenchCards.some((card) => !!this.getWorkbenchSnapshot(card.section));
  }

  get savedWorkbenchCount(): number {
    return this.workbenchCards.filter((card) => !!this.getWorkbenchSnapshot(card.section)).length;
  }

  switchTab(tab: StudentAiTab): void {
    this.activeTab = tab;
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab },
      queryParamsHandling: 'merge'
    });
  }

  goToProfileEditor(section: 'basic' | 'experience'): void {
    void this.router.navigate(['/student/profile'], {
      queryParams: { edit: '1', section }
    });
  }

  selectAnswer(optionIndex: number): void {
    this.answers[this.currentQuestionIndex] = optionIndex + 1;
  }

  nextQuestion(): void {
    if (this.currentQuestionIndex < this.questionnaire.length - 1) {
      this.currentQuestionIndex += 1;
    }
  }

  prevQuestion(): void {
    if (this.currentQuestionIndex > 0) {
      this.currentQuestionIndex -= 1;
    }
  }

  submitTest(): void {
    this.testLoading = true;
    this.setBanner('', false);

    const answers = this.answers.map((score, index) => ({
      question_id: index + 1,
      selected_option: score - 1
    }));

    this.aiApi.analyzePersonality(this.getUserId(), answers).subscribe({
      next: (res) => {
        const profile = res.data;
        this.personalityResult = profile;
        this.testCompleted = true;
        this.testLoading = false;
        this.savePersonalityProfile(profile);
      },
      error: (err) => {
        this.testLoading = false;
        this.setBanner(this.extractAiError(err, '人格画像生成失败，请稍后重试。'), true);
      }
    });
  }

  resetTest(): void {
    this.testCompleted = false;
    this.currentQuestionIndex = 0;
    this.answers = new Array(this.questionnaire.length).fill(0);
    this.recommendations = [];
    this.setBanner('', false);
  }

  startInterview(): void {
    if (!this.interviewJobTitle.trim()) {
      this.setBanner('请先填写目标岗位名称。', true);
      return;
    }

    this.interviewLoading = true;
    this.interviewWarning = null;
    this.interviewEvaluation = null;

    this.aiApi.startInterview(this.interviewJobTitle.trim(), this.interviewJobDescription.trim()).subscribe({
      next: (res) => {
        this.interviewStarted = true;
        this.interviewMessages = [
          {
            role: 'assistant',
            content: res.data?.opening || '模拟面试已开始，请先做一个简短的自我介绍。'
          }
        ];
        this.interviewLoading = false;
      },
      error: (err) => {
        this.interviewLoading = false;
        this.setBanner(this.extractAiError(err, '模拟面试启动失败，请稍后重试。'), true);
      }
    });
  }

  sendInterviewMessage(): void {
    const text = this.interviewInput.trim();
    if (!text || this.interviewLoading || !this.interviewStarted) {
      return;
    }

    this.interviewMessages.push({ role: 'user', content: text });
    this.interviewInput = '';
    this.interviewLoading = true;

    this.aiApi.chatInterview(this.interviewJobTitle.trim(), text, this.getInterviewHistory()).subscribe({
      next: (res) => {
        this.interviewMessages.push({
          role: 'assistant',
          content: res.data?.reply || '我记录下来了，我们继续下一题。'
        });
        this.interviewWarning = res.data?.warning || null;
        this.interviewLoading = false;
      },
      error: (err) => {
        this.interviewLoading = false;
        this.setBanner(this.extractAiError(err, '面试对话失败，请稍后重试。'), true);
      }
    });
  }

  endInterview(): void {
    if (!this.interviewStarted || this.interviewLoading) {
      return;
    }

    this.interviewLoading = true;

    this.aiApi.endInterview(this.interviewJobTitle.trim(), this.getInterviewHistory()).subscribe({
      next: (res) => {
        this.interviewEvaluation = res.data?.evaluation || null;
        this.persistAiWorkbench(
          'interview',
          {
            jobTitle: this.interviewJobTitle.trim(),
            jobDescription: this.interviewJobDescription.trim(),
            messages: this.getInterviewHistory(),
            warning: this.interviewWarning
          },
          this.interviewEvaluation
        );
        this.interviewLoading = false;
      },
      error: (err) => {
        this.interviewLoading = false;
        this.setBanner(this.extractAiError(err, '面试总结生成失败，请稍后重试。'), true);
      }
    });
  }

  restartInterview(): void {
    this.interviewStarted = false;
    this.interviewMessages = [];
    this.interviewInput = '';
    this.interviewWarning = null;
    this.interviewEvaluation = null;
  }

  runResumeOptimize(): void {
    if (!this.resumeOptimize.content.trim()) {
      this.setBanner('请先输入要优化的简历内容。', true);
      return;
    }

    this.resumeOptimizeLoading = true;
    this.resumeOptimizeResult = null;

    this.aiApi.optimizeResume(
      this.getUserId(),
      this.resumeOptimize.section,
      this.resumeOptimize.content.trim(),
      this.resumeOptimize.jobTarget.trim() || undefined
    ).subscribe({
      next: (res) => {
        this.resumeOptimizeResult = res.data || null;
        this.persistAiWorkbench(
          'resumeOptimize',
          { ...this.resumeOptimize },
          this.resumeOptimizeResult
        );
        this.resumeOptimizeLoading = false;
      },
      error: (err) => {
        this.resumeOptimizeLoading = false;
        this.setBanner(this.extractAiError(err, '简历优化失败，请稍后重试。'), true);
      }
    });
  }

  runRejectionAnalysis(): void {
    if (!this.rejectionForm.jobTitle.trim() || !this.rejectionForm.rejectionMessage.trim()) {
      this.setBanner('请先填写岗位名称和拒信内容。', true);
      return;
    }

    this.rejectionLoading = true;
    this.rejectionResult = null;

    this.aiApi.analyzeRejection(
      this.getUserId(),
      this.rejectionForm.rejectionMessage.trim(),
      this.rejectionForm.jobTitle.trim(),
      this.rejectionForm.resumeSummary.trim() || undefined
    ).subscribe({
      next: (res) => {
        this.rejectionResult = res.data || null;
        this.persistAiWorkbench(
          'rejectionAnalysis',
          { ...this.rejectionForm },
          this.rejectionResult
        );
        this.rejectionLoading = false;
      },
      error: (err) => {
        this.rejectionLoading = false;
        this.setBanner(this.extractAiError(err, '拒信分析失败，请稍后重试。'), true);
      }
    });
  }

  runResumeUpdate(): void {
    if (!this.resumeUpdateForm.jobTitle.trim() || !this.resumeUpdateForm.company.trim() || !this.resumeUpdateForm.description.trim()) {
      this.setBanner('请先补全兼职经历的核心信息。', true);
      return;
    }

    this.resumeUpdateLoading = true;
    this.resumeUpdateResult = null;

    this.aiApi.updateResumeFromJob(
      this.getUserId(),
      this.resumeUpdateForm.jobTitle.trim(),
      this.resumeUpdateForm.company.trim(),
      this.resumeUpdateForm.duration.trim(),
      this.resumeUpdateForm.description.trim(),
      this.resumeUpdateForm.currentResume.trim() || undefined
    ).subscribe({
      next: (res) => {
        this.resumeUpdateResult = res.data || null;
        this.persistAiWorkbench(
          'resumeUpdate',
          { ...this.resumeUpdateForm },
          this.resumeUpdateResult
        );
        this.resumeUpdateLoading = false;
      },
      error: (err) => {
        this.resumeUpdateLoading = false;
        this.setBanner(this.extractAiError(err, '经历整理失败，请稍后重试。'), true);
      }
    });
  }

  generateCareerPath(): void {
    if (!this.careerForm.targetJob.trim()) {
      this.setBanner('请先填写目标岗位。', true);
      return;
    }

    this.careerLoading = true;
    this.careerResult = null;

    this.aiApi.generateCareerPath(
      this.careerForm.targetJob.trim(),
      this.splitInput(this.careerForm.currentSkills),
      this.splitInput(this.careerForm.personalityTags)
    ).subscribe({
      next: (res) => {
        this.careerResult = res.data || null;
        this.persistAiWorkbench(
          'careerPlan',
          { ...this.careerForm },
          this.careerResult
        );
        this.careerLoading = false;
      },
      error: (err) => {
        this.careerLoading = false;
        this.setBanner(this.extractAiError(err, '职业规划生成失败，请稍后重试。'), true);
      }
    });
  }

    getDimensionEntries(dimensions: Record<string, string> | undefined): Array<{ key: string; value: string }> {
    return Object.entries(dimensions || {}).map(([key, value]) => ({ key, value }));
  }

  continueWorkbench(card: WorkbenchCard): void {
    if (card.section === 'resumeOptimize') {
      this.setBanner('已带你进入资料页的个人简介模块，可继续查看 AI 建议并应用到当前表单。', false);
      this.goToProfileEditor('basic');
      return;
    }

    if (card.section === 'resumeUpdate') {
      this.setBanner('已带你进入资料页的经历项目模块，可继续把兼职经历整理结果补充进简历。', false);
      this.goToProfileEditor('experience');
      return;
    }

    this.switchTab(card.tab);
    this.setBanner(`已打开“${card.title}”，你可以在当前页继续完善结果。`, false);
  }

  useResumeExperienceDraft(): void {
    const experience = this.resumeUpdateResult?.formatted_experience;
    if (!experience) {
      this.setBanner('还没有可复用的兼职经历草稿，请先生成整理结果。', true);
      return;
    }

    this.goToProfileEditor('experience');
    this.setBanner('已把兼职经历草稿带到资料页的经历项目模块，可继续润色并保存。', false);
  }

  useCareerGoalForInterview(): void {
    const targetJob = this.careerForm.targetJob.trim();
    if (!targetJob) {
      this.setBanner('还没有职业目标，请先在职业规划里填写目标岗位。', true);
      return;
    }

    this.interviewJobTitle = targetJob;
    this.switchTab('interview');
    this.setBanner('已把职业规划里的目标岗位带到模拟面试，接下来可以直接开始演练。', false);
  }

  private bootstrapPage(): void {
    this.loadQuestionnaire();
    this.loadSavedProfile();
    this.loadRuntimeStatus();
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
    return this.aiRuntimeStatus?.display_label || '运行状态未知';
  }

  getAiRuntimeHint(): string {
    return this.aiRuntimeStatus?.warning || '当前服务状态正常，可继续使用本页功能。';
  }

  getTabLabel(id: StudentAiTab): string {
    const map: Record<StudentAiTab, string> = {
      test: '\u4eba\u683c\u6d4b\u8bc4',
      interview: '\u6a21\u62df\u9762\u8bd5',
      resume: '\u7b80\u5386\u6210\u679c',
      career: '\u804c\u4e1a\u89c4\u5212',
    };

    return map[id];
  }

  getWorkbenchCardTitle(section: WorkbenchSectionKey): string {
    const map: Record<WorkbenchSectionKey, string> = {
      interview: '\u6a21\u62df\u9762\u8bd5\u8bb0\u5f55',
      resumeOptimize: '\u8d44\u6599\u9875\u7b80\u5386\u4f18\u5316\u7ed3\u679c',
      rejectionAnalysis: '\u62d2\u4fe1\u5206\u6790\u8bb0\u5f55',
      resumeUpdate: '\u517c\u804c\u7ecf\u5386\u6574\u7406\u8349\u7a3f',
      careerPlan: '\u804c\u4e1a\u89c4\u5212\u8def\u5f84',
    };

    return map[section];
  }

  getWorkbenchCardDescription(section: WorkbenchSectionKey): string {
    const map: Record<WorkbenchSectionKey, string> = {
      interview: '\u4fdd\u5b58\u5c97\u4f4d\u3001\u5bf9\u8bdd\u548c\u9762\u8bd5\u603b\u7ed3\uff0c\u65b9\u4fbf\u7ee7\u7eed\u8ffd\u95ee\u6216\u91cd\u65b0\u6f14\u7ec3\u3002',
      resumeOptimize: '\u8d44\u6599\u9875\u4e2d\u7684\u7b80\u5386\u4f18\u5316\u5efa\u8bae\u4f1a\u6c89\u6dc0\u5728\u8fd9\u91cc\uff0c\u65b9\u4fbf\u7ee7\u7eed\u67e5\u770b\u5e76\u5e94\u7528\u56de\u8868\u5355\u3002',
      rejectionAnalysis: '\u8bb0\u5f55\u88ab\u62d2\u7684\u53ef\u80fd\u539f\u56e0\uff0c\u65b9\u4fbf\u4e0b\u4e00\u8f6e\u6709\u9488\u5bf9\u6027\u5730\u6539\u7b80\u5386\u548c\u6295\u9012\u7b56\u7565\u3002',
      resumeUpdate: '\u628a\u517c\u804c\u5185\u5bb9\u6574\u7406\u6210\u8d44\u6599\u9875\u53ef\u7ee7\u7eed\u5b8c\u5584\u7684\u7ecf\u5386\u8349\u7a3f\uff0c\u51cf\u5c11\u91cd\u590d\u5f55\u5165\u3002',
      careerPlan: '\u4fdd\u5b58\u76ee\u6807\u5c97\u4f4d\u3001\u6210\u957f\u6b65\u9aa4\u548c\u4e0b\u4e00\u6b65\u884c\u52a8\u5efa\u8bae\u3002',
    };

    return map[section];
  }

  getWorkbenchCardAction(section: WorkbenchSectionKey): string {
    const map: Record<WorkbenchSectionKey, string> = {
      interview: '\u7ee7\u7eed\u9762\u8bd5',
      resumeOptimize: '\u524d\u5f80\u8d44\u6599\u9875',
      rejectionAnalysis: '\u7ee7\u7eed\u5206\u6790',
      resumeUpdate: '\u524d\u5f80\u8d44\u6599\u9875',
      careerPlan: '\u7ee7\u7eed\u89c4\u5212',
    };

    return map[section];
  }

  private normalizeStaticCopy(): void {
    this.tabs.splice(0, this.tabs.length, ...[
      { id: 'test' as StudentAiTab, label: '\u4eba\u683c\u6d4b\u8bc4', icon: 'psychology' },
      { id: 'interview' as StudentAiTab, label: '\u6a21\u62df\u9762\u8bd5', icon: 'record_voice_over' },
      { id: 'resume' as StudentAiTab, label: '\u7b80\u5386\u6210\u679c', icon: 'description' },
      { id: 'career' as StudentAiTab, label: '\u804c\u4e1a\u89c4\u5212', icon: 'map' },
    ]);
  }

  private loadQuestionnaire(): void {
    this.aiApi.getQuestionnaire().subscribe({
      next: (res) => {
        const questions = res.data?.questions || [];
        this.questionnaire = questions.length ? questions : this.getDefaultQuestionnaire();
        this.answers = new Array(this.questionnaire.length).fill(0);
      },
      error: () => {
        this.questionnaire = this.getDefaultQuestionnaire();
        this.answers = new Array(this.questionnaire.length).fill(0);
      }
    });
  }

  private loadSavedProfile(): void {
    this.personalityProfileService.getStatus().subscribe({
      next: (status) => {
        if (!status.completed || !status.profile?.tags?.length) {
          this.prefillFromLocalUser();
          return;
        }

        this.personalityResult = status.profile;
        this.testCompleted = true;
        this.prefillFromProfile(status.profile);
        this.getRecommendations();
      },
      error: () => this.prefillFromLocalUser()
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

  private restoreAiWorkbench(profile: any): void {
    const workbench = (profile?.aiWorkbench || {}) as StudentAiWorkbench;

    if (workbench.interview) {
      this.interviewJobTitle = workbench.interview.input?.jobTitle || this.interviewJobTitle;
      this.interviewJobDescription = workbench.interview.input?.jobDescription || this.interviewJobDescription;
      this.interviewMessages = Array.isArray(workbench.interview.input?.messages)
        ? workbench.interview.input.messages
        : [];
      this.interviewWarning = workbench.interview.input?.warning || null;
      this.interviewEvaluation = workbench.interview.result || null;
      this.interviewStarted = this.interviewMessages.length > 0;
    }

    if (workbench.resumeOptimize) {
      this.resumeOptimize = {
        ...this.resumeOptimize,
        ...(workbench.resumeOptimize.input || {})
      };
      this.resumeOptimizeResult = workbench.resumeOptimize.result || null;
    }

    if (workbench.rejectionAnalysis) {
      this.rejectionForm = {
        ...this.rejectionForm,
        ...(workbench.rejectionAnalysis.input || {})
      };
      this.rejectionResult = workbench.rejectionAnalysis.result || null;
    }

    if (workbench.resumeUpdate) {
      this.resumeUpdateForm = {
        ...this.resumeUpdateForm,
        ...(workbench.resumeUpdate.input || {})
      };
      this.resumeUpdateResult = workbench.resumeUpdate.result || null;
    }

    if (workbench.careerPlan) {
      this.careerForm = {
        ...this.careerForm,
        ...(workbench.careerPlan.input || {})
      };
      this.careerResult = workbench.careerPlan.result || null;
    }

    
  }

  private persistAiWorkbench(
    section: keyof StudentAiWorkbench,
    input: Record<string, any>,
    result: any
  ): void {
    const user = this.authService.getCurrentUser();
    if (!user) {
      return;
    }

    const nextWorkbench: StudentAiWorkbench = {
      ...((user.personalityProfile?.aiWorkbench || {}) as StudentAiWorkbench),
      [section]: {
        input,
        result,
        updatedAt: new Date().toISOString()
      }
    };

    const nextProfile = {
      ...(user.personalityProfile || {}),
      aiWorkbench: nextWorkbench
    };

    this.userService.updateProfile({ personalityProfile: nextProfile }).subscribe({
      next: (response) => {
        const serverUser = response.data || {};
        const savedProfile = serverUser.personalityProfile || nextProfile;
        this.authService.updateCurrentUser({
          ...user,
          ...serverUser,
          id: String(serverUser.id ?? user.id),
          role: serverUser.role ?? user.role,
          status: serverUser.status ?? user.status,
          personalityProfile: savedProfile,
          personalityProfileCompletedAt:
            serverUser.personalityProfileCompletedAt ?? user.personalityProfileCompletedAt,
          createdAt: serverUser.createdAt ?? user.createdAt,
          updatedAt: serverUser.updatedAt ?? user.updatedAt
        } as any);
        this.prefillFromProfile(savedProfile);
      },
      error: () => {}
    });
  }

  private savePersonalityProfile(profile: any): void {
    this.personalityProfileService.submit(profile).subscribe({
      next: (status) => {
        const savedProfile = status.profile || profile;
        const user = this.authService.getCurrentUser();

        if (user) {
          this.authService.updateCurrentUser({
            ...user,
            personalityProfileCompletedAt: status.completedAt || new Date().toISOString(),
            personalityProfile: savedProfile
          });
        }

        this.personalityResult = savedProfile;
        this.prefillFromProfile(savedProfile);
        this.setBanner('人格画像已保存，推荐结果已切换为主库画像。', false);
        this.getRecommendations();
      },
      error: () => {
        this.setBanner('人格画像已生成，但保存失败，所以无法触发真实推荐。', true);
      }
    });
  }

  private getRecommendations(): void {
    this.recommendLoading = true;
    this.recommendations = [];

    this.aiApi.recommendJobs(this.getUserId(), undefined, 5).subscribe({
      next: (res) => {
        this.recommendations = res.data?.recommendations || [];
        this.recommendLoading = false;
      },
      error: (err) => {
        this.recommendLoading = false;
        this.setBanner(this.extractAiError(err, '岗位推荐加载失败，请稍后重试。'), true);
      }
    });
  }

  private prefillFromLocalUser(): void {
    const user = this.authService.getCurrentUser();
    this.prefillFromProfile(user?.personalityProfile || null);
  }

  private prefillFromProfile(profile: any): void {
    if (!profile) {
      return;
    }

    const skills = [
      ...(profile.technicalSkills || []),
      ...(profile.tools || []),
      ...(profile.strengths || [])
    ];
    const summary = profile.summary || profile.bio || '';

    this.careerForm.currentSkills = this.joinList(skills);
    this.careerForm.personalityTags = this.joinList(profile.tags || []);
    this.resumeUpdateForm.currentResume = summary;
    this.rejectionForm.resumeSummary = summary;
    this.restoreAiWorkbench(profile);
  }

  getWorkbenchSnapshot(section: WorkbenchSectionKey): AiWorkbenchSnapshot<any, any> | null {
    const user = this.authService.getCurrentUser();
    const workbench = (user?.personalityProfile?.aiWorkbench || {}) as StudentAiWorkbench;
    return workbench[section] || null;
  }

  getWorkbenchUpdatedAt(section: WorkbenchSectionKey): string {
    return this.getWorkbenchSnapshot(section)?.updatedAt || '';
  }

  getWorkbenchPreview(section: WorkbenchSectionKey): string {
    const snapshot = this.getWorkbenchSnapshot(section);
    if (!snapshot) {
      return '';
    }

    switch (section) {
      case 'interview':
        return snapshot.input?.jobTitle
          ? `最近一次面试目标：${snapshot.input.jobTitle}`
          : '已保存面试对话和总结。';
      case 'resumeOptimize':
        return snapshot.input?.section
          ? `最近优化板块：${snapshot.input.section}`
          : '已保存简历评分与优化建议。';
      case 'resumeUpdate':
        return snapshot.result?.formatted_experience?.title
          ? `最近整理经历：${snapshot.result.formatted_experience.title}`
          : '已保存兼职经历草稿。';
      case 'careerPlan':
        return snapshot.input?.targetJob
          ? `当前目标岗位：${snapshot.input.targetJob}`
          : '已保存职业成长路径。';
            case 'rejectionAnalysis':
        return snapshot.input?.jobTitle
          ? `最近分析被拒岗位：${snapshot.input.jobTitle}`
          : '已保存拒信分析结果。';
      default:
        return '已保存 AI 结果。';
    }
  }

  private getUserId(): string {
    const user = this.authService.getCurrentUser();
    return String(user?.id || 'guest');
  }

  private getInterviewHistory(): Array<{ role: string; content: string }> {
    return this.interviewMessages.map((item) => ({
      role: item.role,
      content: item.content
    }));
  }

  private joinList(values: string[]): string {
    return (values || []).filter(Boolean).join('、');
  }

  private splitInput(value: string): string[] {
    return (value || '')
      .split(/[、，,\n]/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  private extractAiError(err: any, fallback: string): string {
    const detail = err?.error?.detail ?? err?.error?.message ?? err?.message;
    const normalized = this.normalizeBannerMessage(detail);
    return normalized && normalized !== '请求参数格式不正确，请检查后重试。'
      ? normalized
      : fallback;
  }

  private setBanner(message: unknown, error: boolean): void {
    this.message = this.normalizeBannerMessage(message);
    this.error = error;
  }

  private normalizeBannerMessage(message: unknown): string {
    if (typeof message === 'string') {
      return message === '[object Object]' ? '请求参数格式不正确，请检查后重试。' : message;
    }

    if (message == null) {
      return '';
    }

    if (Array.isArray(message)) {
      const normalized = message
        .map((item) => this.normalizeBannerMessage(item))
        .filter(Boolean)
        .join('；');

      return normalized || '请求参数格式不正确，请检查后重试。';
    }

    if (typeof message === 'object') {
      const value = message as Record<string, unknown>;

      if (value['detail'] !== undefined) {
        return this.normalizeBannerMessage(value['detail']);
      }

      if (value['message'] !== undefined) {
        return this.normalizeBannerMessage(value['message']);
      }

      if (typeof value['msg'] === 'string') {
        const location = Array.isArray(value['loc']) ? (value['loc'] as unknown[]).slice(1).join('.') : '';
        return location ? `${location}：${value['msg']}` : value['msg'];
      }
    }

    return '请求参数格式不正确，请检查后重试。';
  }

  private resolveTab(tab: string | null): StudentAiTab {
    switch (tab) {
      case 'interview':
      case 'resume':
      case 'career':
      case 'test':
        return tab;
      default:
        return 'test';
    }
  }

  private getDefaultQuestionnaire(): PersonalityQuestion[] {
    return [
      {
        id: 1,
        question: '周末你更喜欢哪种安排？',
        options: [
          { text: '和朋友一起外出活动' },
          { text: '参加聚会或社交活动' },
          { text: '一个人安静休息' },
          { text: '在家看书或看电影' }
        ]
      },
      {
        id: 2,
        question: '接到任务后，你通常会怎么做？',
        options: [
          { text: '提前完成并主动优化' },
          { text: '按时完成并保证质量' },
          { text: '拖到最后再处理' },
          { text: '经常忘记或拖延' }
        ]
      },
      {
        id: 3,
        question: '面对新问题时，你通常会？',
        options: [
          { text: '主动尝试不同方法' },
          { text: '参考别人的做法后改进' },
          { text: '用最常规的方法解决' },
          { text: '等别人来处理' }
        ]
      },
      {
        id: 4,
        question: '和同学或同事有分歧时，你更倾向于？',
        options: [
          { text: '主动沟通，争取双赢' },
          { text: '冷静分析后协商' },
          { text: '尽量避免冲突' },
          { text: '情绪化处理或回避' }
        ]
      },
      {
        id: 5,
        question: '截止时间突然提前时，你会？',
        options: [
          { text: '迅速调整计划并高效推进' },
          { text: '会紧张，但能应对' },
          { text: '容易焦虑，手忙脚乱' },
          { text: '不知道该怎么处理' }
        ]
      },
      {
        id: 6,
        question: '你如何安排兼职与学习时间？',
        options: [
          { text: '提前规划并严格执行' },
          { text: '有大致计划，灵活调整' },
          { text: '走一步看一步' },
          { text: '经常顾此失彼' }
        ]
      },
      {
        id: 7,
        question: '和新认识的人交流时，你的感受更像？',
        options: [
          { text: '很自然，很快熟悉' },
          { text: '需要一点时间适应' },
          { text: '有点紧张，不太主动' },
          { text: '很不自在，尽量少说话' }
        ]
      },
      {
        id: 8,
        question: '学习一项新技能时，你通常？',
        options: [
          { text: '主动研究，不懂就查资料' },
          { text: '跟着教程一步步学' },
          { text: '需要别人手把手带' },
          { text: '学不会就容易放弃' }
        ]
      },
      {
        id: 9,
        question: '你找兼职的主要目标是？',
        options: [
          { text: '积累经验，为未来铺路' },
          { text: '赚零花钱，同时学点东西' },
          { text: '主要为了赚钱' },
          { text: '打发时间' }
        ]
      },
      {
        id: 10,
        question: '工作时手机来了消息，你会？',
        options: [
          { text: '先专注工作，稍后回复' },
          { text: '看一眼，简单回复后继续工作' },
          { text: '忍不住频繁回复，影响工作' },
          { text: '直接玩手机忘了工作' }
        ]
      }
    ];
  }
}
