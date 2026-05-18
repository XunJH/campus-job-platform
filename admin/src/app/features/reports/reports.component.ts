import { Component, OnInit } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { finalize } from 'rxjs/operators';
import {
  AdminReportOverview,
  AdminReportService,
  DistributionItem,
  ExportResource,
  TrendItem
} from '../../core/services/admin-report.service';

interface SummaryCard {
  title: string;
  value: string;
  description: string;
  icon: string;
  tone: string;
}

interface DistributionSection {
  title: string;
  description: string;
  items: DistributionItem[];
  type: 'role' | 'status' | 'jobAudit' | 'applicationStage' | 'ticketStatus' | 'settlementStatus' | 'verificationStatus';
}

interface TrendSection {
  title: string;
  description: string;
  items: TrendItem[];
}

interface ExportItem {
  resource: ExportResource;
  label: string;
  description: string;
}

@Component({
  selector: 'app-reports',
  templateUrl: './reports.component.html',
  styleUrls: ['./reports.component.scss']
})
export class ReportsComponent implements OnInit {
  isLoading = false;
  exportingResource: ExportResource | null = null;
  overview: AdminReportOverview | null = null;
  summaryCards: SummaryCard[] = [];
  distributionSections: DistributionSection[] = [];
  trendSections: TrendSection[] = [];

  readonly exportItems: ExportItem[] = [
    { resource: 'users', label: '导出用户', description: '导出学生、企业和管理员账号列表。' },
    { resource: 'jobs', label: '导出岗位', description: '导出岗位基础信息与审核结果。' },
    { resource: 'applications', label: '导出投递', description: '导出投递状态与流程跟进记录。' },
    { resource: 'verifications', label: '导出认证', description: '导出企业认证提交与审核记录。' },
    { resource: 'settlements', label: '导出结算', description: '导出结算台账与争议记录。' },
    { resource: 'tickets', label: '导出工单', description: '导出申诉、投诉和处理进度。' }
  ];

  constructor(
    private readonly adminReportService: AdminReportService,
    private readonly snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadOverview();
  }

  loadOverview(): void {
    this.isLoading = true;

    this.adminReportService.getOverview()
      .pipe(finalize(() => {
        this.isLoading = false;
      }))
      .subscribe({
        next: (response) => {
          this.overview = response.data;
          this.summaryCards = this.buildSummaryCards(response.data);
          this.distributionSections = this.buildDistributionSections(response.data);
          this.trendSections = this.buildTrendSections(response.data);
        },
        error: () => {
          this.snackBar.open('获取运营报表失败，请稍后重试', '关闭', { duration: 3000 });
        }
      });
  }

  export(resource: ExportResource): void {
    this.exportingResource = resource;

    this.adminReportService.exportResource(resource)
      .pipe(finalize(() => {
        this.exportingResource = null;
      }))
      .subscribe({
        next: (blob) => {
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `${resource}.csv`;
          link.click();
          link.remove();
          window.URL.revokeObjectURL(url);

          this.snackBar.open('导出已开始，请查看浏览器下载记录', '关闭', { duration: 2500 });
        },
        error: () => {
          this.snackBar.open('导出失败，请稍后重试', '关闭', { duration: 3000 });
        }
      });
  }

  getDistributionLabel(type: DistributionSection['type'], key: string): string {
    const dictionaries: Record<DistributionSection['type'], Record<string, string>> = {
      role: {
        student: '学生',
        employer: '企业',
        admin: '管理员'
      },
      status: {
        active: '正常',
        inactive: '未激活',
        banned: '禁用'
      },
      jobAudit: {
        pending: '待审核',
        approved: '已通过',
        rejected: '已驳回'
      },
      applicationStage: {
        new: '新投递',
        screening: '筛选中',
        interview_shortlist: '待面试',
        interview_confirmed: '已确认面试',
        rejected_pool: '已淘汰',
        archived: '已归档',
        interview: '待面试',
        confirmed: '已确认面试',
        rejected: '已淘汰'
      },
      ticketStatus: {
        open: '待受理',
        in_progress: '处理中',
        resolved: '已解决',
        rejected: '已驳回'
      },
      settlementStatus: {
        pending: '待结算',
        paid: '已支付',
        disputed: '争议中'
      },
      verificationStatus: {
        pending: '待审核',
        approved: '已通过',
        rejected: '已驳回'
      }
    };

    return dictionaries[type][key] || key;
  }

  getBarWidth(count: number, items: Array<{ count: number }>): string {
    const max = Math.max(...items.map((item) => item.count), 1);
    return `${Math.max((count / max) * 100, count > 0 ? 12 : 0)}%`;
  }

  private buildSummaryCards(data: AdminReportOverview): SummaryCard[] {
    return [
      {
        title: '平台用户',
        value: String(data.summary.totalUsers),
        description: `学生 ${data.summary.totalStudents} / 企业 ${data.summary.totalEmployers}`,
        icon: 'groups',
        tone: 'bg-blue-50 text-primary'
      },
      {
        title: '在招岗位',
        value: String(data.summary.activeJobs),
        description: `待审核岗位 ${data.summary.pendingJobReviews}`,
        icon: 'work',
        tone: 'bg-emerald-50 text-emerald-700'
      },
      {
        title: '投递总量',
        value: String(data.summary.totalApplications),
        description: `处理中工单 ${data.summary.openTickets}`,
        icon: 'move_to_inbox',
        tone: 'bg-amber-50 text-amber-700'
      },
      {
        title: '结算台账',
        value: `¥${data.summary.totalSettlementAmount}`,
        description: `争议结算 ${data.summary.disputedSettlements}`,
        icon: 'payments',
        tone: 'bg-rose-50 text-rose-700'
      }
    ];
  }

  private buildDistributionSections(data: AdminReportOverview): DistributionSection[] {
    return [
      {
        title: '用户角色分布',
        description: '查看学生、企业和管理员的结构占比。',
        items: data.distributions.userRoles,
        type: 'role'
      },
      {
        title: '用户状态分布',
        description: '快速识别未激活或被禁用账号的规模。',
        items: data.distributions.userStatuses,
        type: 'status'
      },
      {
        title: '岗位审核状态',
        description: '跟踪平台岗位供给与审核积压情况。',
        items: data.distributions.jobAuditStatuses,
        type: 'jobAudit'
      },
      {
        title: '投递流程阶段',
        description: '定位筛选、面试和归档环节的压力点。',
        items: data.distributions.applicationStages,
        type: 'applicationStage'
      },
      {
        title: '工单处理状态',
        description: '关注待受理与处理中工单数量。',
        items: data.distributions.ticketStatuses,
        type: 'ticketStatus'
      },
      {
        title: '结算状态',
        description: '辅助财务与争议处理节奏判断。',
        items: data.distributions.settlementStatuses,
        type: 'settlementStatus'
      },
      {
        title: '认证审核状态',
        description: '查看企业认证在待审、通过和驳回阶段的分布。',
        items: data.distributions.verificationStatuses,
        type: 'verificationStatus'
      }
    ];
  }

  private buildTrendSections(data: AdminReportOverview): TrendSection[] {
    return [
      {
        title: '近 7 天新增用户',
        description: '观察平台注册与拉新波动。',
        items: data.trends.userRegistrations
      },
      {
        title: '近 7 天发布岗位',
        description: '评估企业侧岗位供给节奏。',
        items: data.trends.jobPosts
      },
      {
        title: '近 7 天投递量',
        description: '判断求职活跃度和岗位吸引力。',
        items: data.trends.applications
      },
      {
        title: '近 7 天新增工单',
        description: '识别投诉、申诉和客服压力变化。',
        items: data.trends.tickets
      }
    ];
  }
}
