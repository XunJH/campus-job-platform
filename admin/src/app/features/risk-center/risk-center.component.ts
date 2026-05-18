import { Component, OnInit } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { forkJoin } from 'rxjs';
import { AdminVerificationService, Verification } from '../../core/services/admin-verification.service';
import { Job, JobService } from '../../core/services/job.service';
import { SettlementRecord, SettlementService } from '../../core/services/settlement.service';

type RiskLevel = 'high' | 'medium' | 'low' | 'unknown';

type RiskCard = {
  title: string;
  value: number;
  description: string;
  icon: string;
  tone: string;
};

type VerificationRiskItem = Verification & {
  aiAuditResult?: {
    risk_level?: RiskLevel;
    summary?: string;
    warning_signs?: string[];
    recommendation?: string;
  };
};

type JobRiskItem = Job & {
  fraudCheckResult?: {
    risk_level?: RiskLevel;
    warning_signs?: string[];
    recommendation?: string;
  };
};

type RiskFeedItem = {
  id: string;
  type: 'verification' | 'job' | 'settlement';
  level: RiskLevel;
  title: string;
  subtitle: string;
  description: string;
  actionLabel: string;
  route: string;
  createdAt?: string;
};

@Component({
  selector: 'app-risk-center',
  templateUrl: './risk-center.component.html',
  styleUrls: ['./risk-center.component.scss']
})
export class RiskCenterComponent implements OnInit {
  isLoading = false;

  summaryCards: RiskCard[] = [
    {
      title: '高风险认证',
      value: 0,
      description: 'AI 预审命中高风险的企业认证',
      icon: 'shield_person',
      tone: 'bg-red-50 text-red-700'
    },
    {
      title: '高风险岗位',
      value: 0,
      description: '职位反诈识别为高风险的岗位',
      icon: 'warning',
      tone: 'bg-orange-50 text-orange-700'
    },
    {
      title: '争议结算',
      value: 0,
      description: '需要管理员介入处理的账目争议',
      icon: 'payments',
      tone: 'bg-amber-50 text-amber-700'
    },
    {
      title: '待优先处理',
      value: 0,
      description: '建议今天优先消化的风险事项',
      icon: 'priority_high',
      tone: 'bg-slate-100 text-slate-700'
    }
  ];

  highRiskVerifications: VerificationRiskItem[] = [];
  riskyJobs: JobRiskItem[] = [];
  disputedSettlements: SettlementRecord[] = [];
  riskFeed: RiskFeedItem[] = [];

  constructor(
    private readonly verificationService: AdminVerificationService,
    private readonly jobService: JobService,
    private readonly settlementService: SettlementService,
    private readonly snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadRiskOverview();
  }

  loadRiskOverview(): void {
    this.isLoading = true;

    forkJoin({
      verifications: this.verificationService.getAll(1, 100),
      jobs: this.jobService.getJobs(1, 100),
      disputedSettlements: this.settlementService.getSettlements(1, 100, 'disputed')
    }).subscribe({
      next: ({ verifications, jobs, disputedSettlements }) => {
        const verificationList = ((verifications.data?.list || []) as VerificationRiskItem[]);
        const jobList = ((jobs.data?.jobs || []) as JobRiskItem[]);
        const settlementList = disputedSettlements.data?.settlements || [];

        this.highRiskVerifications = verificationList
          .filter((item) => this.getVerificationRiskLevel(item) === 'high')
          .sort((left, right) => this.toTimestamp(right.submittedAt) - this.toTimestamp(left.submittedAt))
          .slice(0, 6);

        this.riskyJobs = jobList
          .filter((item) => this.getJobRiskLevel(item) === 'high' || this.getJobRiskLevel(item) === 'medium')
          .sort((left, right) => this.getRiskWeight(right) - this.getRiskWeight(left) || this.toTimestamp(right.createdAt) - this.toTimestamp(left.createdAt))
          .slice(0, 8);

        this.disputedSettlements = settlementList
          .slice()
          .sort((left, right) => this.toTimestamp(right.updatedAt || right.createdAt) - this.toTimestamp(left.updatedAt || left.createdAt))
          .slice(0, 8);

        this.summaryCards = [
          {
            ...this.summaryCards[0],
            value: this.highRiskVerifications.length
          },
          {
            ...this.summaryCards[1],
            value: this.riskyJobs.filter((item) => this.getJobRiskLevel(item) === 'high').length
          },
          {
            ...this.summaryCards[2],
            value: this.disputedSettlements.length
          },
          {
            ...this.summaryCards[3],
            value: this.highRiskVerifications.length
              + this.riskyJobs.filter((item) => this.getJobRiskLevel(item) !== 'low').length
              + this.disputedSettlements.length
          }
        ];

        this.riskFeed = this.buildRiskFeed();
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
        this.snackBar.open('风险监控数据加载失败，请稍后重试。', '关闭', { duration: 3000 });
      }
    });
  }

  getVerificationRiskLevel(item: VerificationRiskItem): RiskLevel {
    return item.aiAuditResult?.risk_level || 'unknown';
  }

  getVerificationRiskSummary(item: VerificationRiskItem): string {
    const warning = item.aiAuditResult?.warning_signs?.[0];
    return warning || item.aiAuditResult?.recommendation || item.aiAuditResult?.summary || '暂无额外风险说明';
  }

  getJobRiskLevel(item: JobRiskItem): RiskLevel {
    return item.fraudCheckResult?.risk_level || 'unknown';
  }

  getJobRiskSummary(item: JobRiskItem): string {
    const warning = item.fraudCheckResult?.warning_signs?.[0];
    return warning || item.fraudCheckResult?.recommendation || '暂无额外风险说明';
  }

  getRiskLabel(level: RiskLevel): string {
    const map: Record<RiskLevel, string> = {
      high: '高风险',
      medium: '中风险',
      low: '低风险',
      unknown: '待确认'
    };

    return map[level] || '待确认';
  }

  getRiskClass(level: RiskLevel): string {
    const map: Record<RiskLevel, string> = {
      high: 'bg-red-100 text-red-700',
      medium: 'bg-orange-100 text-orange-700',
      low: 'bg-emerald-100 text-emerald-700',
      unknown: 'bg-slate-100 text-slate-700'
    };

    return map[level] || map.unknown;
  }

  formatDate(dateStr?: string | null): string {
    if (!dateStr) {
      return '-';
    }

    const date = new Date(dateStr);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  getSettlementAmount(record: SettlementRecord): string {
    return `¥${Number(record.amount || 0).toFixed(2)}`;
  }

  private buildRiskFeed(): RiskFeedItem[] {
    const verificationFeed: RiskFeedItem[] = this.highRiskVerifications.map((item) => ({
      id: `verification-${item.id}`,
      type: 'verification',
      level: this.getVerificationRiskLevel(item),
      title: item.companyName,
      subtitle: item.user?.username ? `认证申请 · ${item.user.username}` : '认证申请',
      description: this.getVerificationRiskSummary(item),
      actionLabel: '去看详情',
      route: `/verification-review/${item.id}`,
      createdAt: item.submittedAt
    }));

    const jobFeed: RiskFeedItem[] = this.riskyJobs.map((item) => ({
      id: `job-${item.id}`,
      type: 'job',
      level: this.getJobRiskLevel(item),
      title: item.title,
      subtitle: item.employer?.username ? `岗位审核 · ${item.employer.username}` : '岗位审核',
      description: this.getJobRiskSummary(item),
      actionLabel: '去审核岗位',
      route: '/jobs',
      createdAt: item.createdAt
    }));

    const settlementFeed: RiskFeedItem[] = this.disputedSettlements.map((item) => ({
      id: `settlement-${item.id}`,
      type: 'settlement',
      level: 'medium',
      title: item.job?.title || '结算争议',
      subtitle: item.student?.username && item.employer?.username
        ? `结算争议 · ${item.student.username} / ${item.employer.username}`
        : '结算争议',
      description: item.notes || '该结算记录处于争议中，建议管理员尽快确认处理意见。',
      actionLabel: '去看账目',
      route: '/settlements',
      createdAt: item.updatedAt || item.createdAt
    }));

    return [...verificationFeed, ...jobFeed, ...settlementFeed]
      .sort((left, right) => this.getFeedWeight(right) - this.getFeedWeight(left) || this.toTimestamp(right.createdAt) - this.toTimestamp(left.createdAt))
      .slice(0, 12);
  }

  private getFeedWeight(item: RiskFeedItem): number {
    const levelWeight: Record<RiskLevel, number> = {
      high: 30,
      medium: 20,
      low: 10,
      unknown: 5
    };

    const typeWeight: Record<RiskFeedItem['type'], number> = {
      verification: 3,
      job: 2,
      settlement: 1
    };

    return levelWeight[item.level] + typeWeight[item.type];
  }

  private getRiskWeight(item: JobRiskItem): number {
    const level = this.getJobRiskLevel(item);
    if (level === 'high') {
      return 10;
    }

    if (level === 'medium') {
      return 5;
    }

    return 0;
  }

  private toTimestamp(value?: string | null): number {
    return value ? new Date(value).getTime() : 0;
  }
}
