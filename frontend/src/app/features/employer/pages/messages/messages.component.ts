import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { Subscription, catchError, debounceTime, distinctUntilChanged, filter, interval, of, switchMap, timeout } from 'rxjs';
import { Subject } from 'rxjs';
import {
  ConversationDetail,
  ConversationMessage,
  ConversationService,
  ConversationSummary
} from '../../../../core/services/conversation.service';
import { AiApiService } from '../../../../core/services/ai-api.service';
import { ApplicationStage, ApplicationStatus } from '../../../../core/services/job.service';
import { EmployerShellSidebarComponent } from '../../../../shared/components/employer-shell-sidebar/employer-shell-sidebar.component';

type ConversationGroup = {
  title: string;
  description: string;
  conversations: ConversationSummary[];
};

type RiskWarning = {
  hasRisk: boolean;
  riskLevel: string;
  decision: string;
  summary: string;
  actions: string[];
  platformActions: string[];
  shouldBlock: boolean;
  confidence: string;
};

@Component({
  selector: 'app-employer-messages',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, EmployerShellSidebarComponent],
  templateUrl: './messages.component.html'
})
export class EmployerMessagesComponent implements OnInit, OnDestroy {
  conversations: ConversationSummary[] = [];
  selectedConversation: ConversationDetail | null = null;
  loading = false;
  detailLoading = false;
  sending = false;
  riskChecking = false;
  errorMessage = '';
  draftMessage = '';
  applicationId: number | null = null;
  riskWarning: RiskWarning | null = null;

  private querySubscription?: Subscription;
  private pollSubscription?: Subscription;
  private draftRiskSubscription?: Subscription;
  private readonly draftMessage$ = new Subject<string>();

  constructor(
    private route: ActivatedRoute,
    private conversationService: ConversationService,
    private aiApiService: AiApiService
  ) {}

  ngOnInit(): void {
    this.querySubscription = this.route.queryParamMap.subscribe((params) => {
      const value = params.get('applicationId');
      this.applicationId = value ? Number(value) : null;
      this.loadConversations(true);
    });

    this.pollSubscription = interval(8000).subscribe(() => {
      this.loadConversations(false);
    });

    this.draftRiskSubscription = this.draftMessage$
      .pipe(
        debounceTime(250),
        distinctUntilChanged(),
        filter(() => !!this.selectedConversation),
        switchMap((message) => {
          const trimmed = message.trim();
          if (!trimmed || trimmed.length < 6) {
            this.riskWarning = null;
            this.riskChecking = false;
            return of(null);
          }

          const localWarning = this.getLocalRiskWarning(trimmed);
          if (localWarning?.shouldBlock) {
            this.riskWarning = localWarning;
            this.riskChecking = false;
            return of(null);
          }

          this.riskChecking = true;
          return this.aiApiService.checkChatWarningMessage(
            trimmed,
            'employer',
            String(this.selectedConversation?.id ?? '')
          ).pipe(
            timeout(6000),
            catchError(() => of(null))
          );
        })
      )
      .subscribe({
        next: (res) => {
          this.riskChecking = false;
          this.riskWarning = res?.data ? this.normalizeRiskWarning(res.data) : null;
        },
        error: () => {
          this.riskChecking = false;
          this.riskWarning = null;
        }
      });
  }

  ngOnDestroy(): void {
    this.querySubscription?.unsubscribe();
    this.pollSubscription?.unsubscribe();
    this.draftRiskSubscription?.unsubscribe();
  }

  get groupedConversations(): ConversationGroup[] {
    const confirmed = this.conversations.filter((item) => item.application?.applicationStage === 'interview_confirmed');
    const pipeline = this.conversations.filter((item) =>
      ['new', 'screening', 'interview_shortlist'].includes(item.application?.applicationStage || '')
    );
    const others = this.conversations.filter((item) => !confirmed.includes(item) && !pipeline.includes(item));

    return [
      {
        title: '已确认面试',
        description: '这些候选人会始终优先显示，避免被新消息挤下去。',
        conversations: confirmed
      },
      {
        title: '待处理候选人',
        description: '这里集中处理新投递、待筛选和待面试候选人。',
        conversations: pipeline
      },
      {
        title: '其他沟通',
        description: '归档、淘汰或学生撤回的会话保留在这里。',
        conversations: others
      }
    ].filter((group) => group.conversations.length > 0);
  }

  get canSendMessage(): boolean {
    return !!this.selectedConversation && !!this.draftMessage.trim() && !this.sending && !(this.riskWarning?.shouldBlock ?? false);
  }

  get riskBannerTone(): string {
    if (!this.riskWarning?.hasRisk) {
      return 'border-emerald-100 bg-emerald-50 text-emerald-700';
    }

    if (this.riskWarning.shouldBlock) {
      return 'border-rose-100 bg-rose-50 text-rose-700';
    }

    if (this.riskWarning.riskLevel === '中风险') {
      return 'border-amber-100 bg-amber-50 text-amber-700';
    }

    return 'border-sky-100 bg-sky-50 text-sky-700';
  }

  get riskStatusTitle(): string {
    if (!this.riskWarning) {
      return '';
    }

    if (!this.riskWarning.hasRisk) {
      return '发送前安全检查通过';
    }

    if (this.riskWarning.shouldBlock) {
      return '检测到高风险内容，当前消息已被拦截';
    }

    if (this.riskWarning.riskLevel === '中风险') {
      return '检测到可疑表达，建议修改后再发送';
    }

    return '检测到轻度风险信号，请确认后再发送';
  }

  get riskBannerIcon(): string {
    if (!this.riskWarning) {
      return 'verified';
    }

    if (!this.riskWarning.hasRisk) {
      return 'verified';
    }

    if (this.riskWarning.shouldBlock) {
      return 'gpp_bad';
    }

    if (this.riskWarning.riskLevel === '中风险') {
      return 'warning';
    }

    return 'shield_with_heart';
  }

  loadConversations(autoSelectFirst: boolean): void {
    if (autoSelectFirst) {
      this.loading = true;
    }

    const selectedId = this.selectedConversation?.id || null;

    this.conversationService.getMyConversations(this.applicationId).subscribe({
      next: (res) => {
        this.loading = false;
        this.conversations = this.sortConversations(res.data || []);

        if (!this.conversations.length) {
          this.selectedConversation = null;
          this.riskWarning = null;
          return;
        }

        const target = selectedId
          ? this.conversations.find((item) => item.id === selectedId) || this.conversations[0]
          : this.conversations[0];

        const selectedChanged = !this.selectedConversation || this.selectedConversation.id !== target.id;
        const hasUnread = (target.unreadCount || 0) > 0;
        const messageChanged = this.selectedConversation?.lastMessageAt !== target.lastMessageAt;

        if (selectedChanged || hasUnread || messageChanged || autoSelectFirst) {
          this.selectConversation(target);
        }
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err.error?.message || '加载沟通记录失败，请稍后重试。';
      }
    });
  }

  selectConversation(conversation: ConversationSummary): void {
    this.detailLoading = true;
    this.errorMessage = '';
    this.riskWarning = null;
    this.draftMessage = '';

    this.conversationService.getConversationDetail(conversation.id).subscribe({
      next: (res) => {
        this.detailLoading = false;
        this.selectedConversation = res.data;
        this.conversations = this.sortConversations(
          this.conversations.map((item) =>
            item.id === conversation.id
              ? {
                  ...item,
                  unreadCount: 0,
                  lastMessageAt: res.data.lastMessageAt || item.lastMessageAt,
                  lastMessagePreview: res.data.lastMessagePreview || item.lastMessagePreview,
                  application: res.data.application || item.application
                }
              : item
          )
        );
      },
      error: (err) => {
        this.detailLoading = false;
        this.errorMessage = err.error?.message || '加载会话详情失败，请稍后重试。';
      }
    });
  }

  onDraftMessageChange(): void {
    this.errorMessage = '';
    this.draftMessage$.next(this.draftMessage);
  }

  sendMessage(): void {
    if (!this.selectedConversation || !this.draftMessage.trim() || this.sending) {
      return;
    }

    const content = this.draftMessage.trim();
    const localWarning = this.getLocalRiskWarning(content);

    if (localWarning?.shouldBlock) {
      this.riskWarning = localWarning;
      this.riskChecking = false;
      this.sending = false;
      this.errorMessage = '当前消息存在较高风险，请先根据提示修改后再发送。';
      return;
    }

    this.sending = true;
    this.aiApiService
      .checkChatWarningMessage(content, 'employer', String(this.selectedConversation.id))
      .pipe(
        timeout(6000),
        catchError(() => of(null))
      )
      .subscribe({
        next: (res) => {
          this.riskWarning = res?.data ? this.normalizeRiskWarning(res.data) : null;

          if (this.riskWarning?.shouldBlock) {
            this.sending = false;
            this.errorMessage = '当前消息存在较高风险，请先根据提示修改后再发送。';
            return;
          }

          this.persistMessage(content);
        },
        error: () => {
          this.persistMessage(content);
        }
      });
  }

  getConversationTitle(conversation: ConversationSummary | ConversationDetail): string {
    return conversation.job?.title || '岗位沟通';
  }

  getCounterpartName(conversation: ConversationSummary | ConversationDetail): string {
    return conversation.student?.username || '学生';
  }

  getStatusLabel(status?: ApplicationStatus): string {
    const map: Record<ApplicationStatus, string> = {
      pending: '流程进行中',
      approved: '最终通过',
      rejected: '最终淘汰',
      withdrawn: '学生已撤回'
    };

    return status ? map[status] : '流程进行中';
  }

  getStageLabel(stage?: ApplicationStage): string {
    const map: Record<ApplicationStage, string> = {
      new: '新投递',
      screening: '待筛选',
      interview_shortlist: '待面试',
      interview_confirmed: '已确认面试',
      rejected_pool: '已淘汰',
      archived: '已归档'
    };

    return stage ? map[stage] : '新投递';
  }

  getStageClasses(stage?: ApplicationStage): string {
    const map: Record<ApplicationStage, string> = {
      new: 'bg-sky-50 text-sky-700',
      screening: 'bg-indigo-50 text-indigo-700',
      interview_shortlist: 'bg-violet-50 text-violet-700',
      interview_confirmed: 'bg-emerald-50 text-emerald-700',
      rejected_pool: 'bg-rose-50 text-rose-700',
      archived: 'bg-slate-100 text-slate-700'
    };

    return stage ? map[stage] : map.new;
  }

  getSenderLabel(message: ConversationMessage): string {
    const roleMap: Record<ConversationMessage['senderRole'], string> = {
      student: '学生',
      employer: '企业',
      admin: '管理员'
    };

    const username = message.sender?.username ? ` · ${message.sender.username}` : '';
    return `${roleMap[message.senderRole]}${username}`;
  }

  formatDate(value?: string | null): string {
    if (!value) return '--';
    const date = new Date(value);
    return `${date.getMonth() + 1}-${date.getDate()} ${String(date.getHours()).padStart(2, '0')}:${String(
      date.getMinutes()
    ).padStart(2, '0')}`;
  }

  isMyMessage(message: ConversationMessage): boolean {
    return message.senderId === this.selectedConversation?.employerId;
  }

  isSelectedConversation(conversation: ConversationSummary): boolean {
    return this.selectedConversation?.id === conversation.id;
  }

  trackConversation(_index: number, conversation: ConversationSummary): number {
    return conversation.id;
  }

  private persistMessage(content: string): void {
    this.conversationService.sendMessage(this.selectedConversation!.id, content).pipe(timeout(8000)).subscribe({
      next: (res) => {
        this.sending = false;
        this.draftMessage = '';

        const message = res.data;
        this.selectedConversation = {
          ...this.selectedConversation!,
          messages: [...this.selectedConversation!.messages, message],
          lastMessagePreview: message.content || this.selectedConversation!.lastMessagePreview,
          lastMessageAt: message.createdAt,
          unreadCount: 0
        };

        this.conversations = this.sortConversations(
          this.conversations.map((item) =>
            item.id === this.selectedConversation!.id
              ? {
                  ...item,
                  unreadCount: 0,
                  lastMessagePreview: message.content || item.lastMessagePreview,
                  lastMessageAt: message.createdAt
                }
              : item
          )
        );

        this.riskWarning = null;
      },
      error: (err) => {
        this.sending = false;
        this.errorMessage = err.error?.message || '发送消息失败，请稍后重试。';
      }
    });
  }

  private normalizeRiskWarning(data: any): RiskWarning | null {
    if (!data) return null;

    const riskLevelMap: Record<string, string> = {
      safe: '安全',
      low: '低风险',
      medium: '中风险',
      high: '较高风险',
      critical: '高危'
    };

    const decisionMap: Record<string, string> = {
      allow: '可继续沟通',
      warn: '建议提醒后发送',
      manual_review: '建议谨慎发送',
      block_and_review: '建议先修改后再发送'
    };

    const levelCode = data.risk_level_code || 'safe';
    const decisionCode = data.governance_decision || 'allow';
    const actions = Array.isArray(data.recommended_actions) ? data.recommended_actions.filter(Boolean) : [];
    const platformActions = Array.isArray(data.platform_actions)
      ? data.platform_actions
          .map((item: any) => item?.label || item?.description || item?.type)
          .filter(Boolean)
      : [];

    return {
      hasRisk: !!data.has_risk,
      riskLevel: riskLevelMap[levelCode] || data.risk_level_label || data.risk_level || '安全',
      decision: decisionMap[decisionCode] || data.governance_decision_label || '可继续沟通',
      summary: data.risk_summary || '当前消息未发现明显风险信号。',
      actions,
      platformActions,
      shouldBlock: !!data.should_block || !!data.block_recommended,
      confidence: data.confidence || '--'
    };
  }

  private getLocalRiskWarning(content: string): RiskWarning | null {
    const normalized = content.toLowerCase();
    const offPlatformWords = ['微信', 'vx', 'v信', '加我', '私聊', 'qq', '手机号'];
    const moneyWords = ['押金', '保证金', '转账', '汇款', '手续费', '培训费', '入职费', '报名费', '垫付'];
    const privacyWords = ['身份证', '银行卡', '验证码', '密码', '账号'];

    const hitOffPlatform = offPlatformWords.some((word) => normalized.includes(word.toLowerCase()));
    const hitMoney = moneyWords.some((word) => normalized.includes(word.toLowerCase()));
    const hitPrivacy = privacyWords.some((word) => normalized.includes(word.toLowerCase()));

    if (hitMoney || (hitOffPlatform && hitPrivacy)) {
      return {
        hasRisk: true,
        riskLevel: '较高风险',
        decision: '已拦截',
        summary: hitMoney
          ? '消息涉及押金、转账或前置收费要求，存在明显招聘诈骗风险。'
          : '消息同时包含脱离平台沟通和敏感信息索取，存在较高风险。',
        actions: [
          '删除押金、转账、保证金等前置收费表达。',
          '请在平台内沟通岗位安排、面试时间和结算方式。'
        ],
        platformActions: ['当前消息不会直接发送。'],
        shouldBlock: true,
        confidence: '规则命中'
      };
    }

    if (hitOffPlatform || hitPrivacy) {
      return {
        hasRisk: true,
        riskLevel: '中风险',
        decision: '建议修改',
        summary: hitOffPlatform
          ? '消息包含引导脱离平台沟通的表达，建议保留在平台内沟通。'
          : '消息涉及敏感个人信息，建议减少不必要的信息索取。',
        actions: ['建议修改措辞后再发送。'],
        platformActions: [],
        shouldBlock: false,
        confidence: '规则命中'
      };
    }

    return null;
  }

  private sortConversations(conversations: ConversationSummary[]): ConversationSummary[] {
    return [...conversations].sort((left, right) => {
      const stagePriorityDiff =
        this.getStagePriority(right.application?.applicationStage, right.application?.status) -
        this.getStagePriority(left.application?.applicationStage, left.application?.status);
      if (stagePriorityDiff !== 0) {
        return stagePriorityDiff;
      }

      if ((right.unreadCount || 0) !== (left.unreadCount || 0)) {
        return (right.unreadCount || 0) - (left.unreadCount || 0);
      }

      const rightStageTime = right.application?.stageUpdatedAt ? new Date(right.application.stageUpdatedAt).getTime() : 0;
      const leftStageTime = left.application?.stageUpdatedAt ? new Date(left.application.stageUpdatedAt).getTime() : 0;
      if (rightStageTime !== leftStageTime) {
        return rightStageTime - leftStageTime;
      }

      const rightTime = right.lastMessageAt ? new Date(right.lastMessageAt).getTime() : 0;
      const leftTime = left.lastMessageAt ? new Date(left.lastMessageAt).getTime() : 0;
      return rightTime - leftTime;
    });
  }

  private getStagePriority(stage?: ApplicationStage, status?: ApplicationStatus): number {
    if (status === 'withdrawn') {
      return 0;
    }

    const map: Record<ApplicationStage, number> = {
      interview_confirmed: 7,
      new: 6,
      screening: 5,
      interview_shortlist: 4,
      rejected_pool: 2,
      archived: 1
    };

    return stage ? map[stage] : 0;
  }
}
