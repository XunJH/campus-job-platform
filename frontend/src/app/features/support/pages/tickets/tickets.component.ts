import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { PlatformSettingsService } from '../../../../core/services/platform-settings.service';
import {
  FrontTicketPriority,
  FrontTicketRecord,
  FrontTicketStatus,
  FrontTicketType,
  TicketService
} from '../../../../core/services/ticket.service';
import { EmployerShellSidebarComponent } from '../../../../shared/components/employer-shell-sidebar/employer-shell-sidebar.component';
import { StudentShellHeaderComponent } from '../../../../shared/components/student-shell-header/student-shell-header.component';

@Component({
  selector: 'app-support-tickets',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    StudentShellHeaderComponent,
    EmployerShellSidebarComponent
  ],
  templateUrl: './tickets.component.html',
  styleUrls: ['./tickets.component.scss']
})
export class SupportTicketsComponent implements OnInit {
  tickets: FrontTicketRecord[] = [];
  loading = false;
  creating = false;
  errorMessage = '';
  successMessage = '';

  statusFilter: FrontTicketStatus | '' = '';
  typeFilter: FrontTicketType | '' = '';

  readonly typeOptions: Array<{ value: FrontTicketType; label: string }> = [
    { value: 'verification_appeal', label: '认证申诉' },
    { value: 'job_appeal', label: '岗位申诉' },
    { value: 'settlement_dispute', label: '结算争议' },
    { value: 'complaint_report', label: '投诉举报' },
    { value: 'manual_review', label: '其他复核' }
  ];

  readonly priorityOptions: Array<{ value: FrontTicketPriority; label: string }> = [
    { value: 'high', label: '高' },
    { value: 'medium', label: '中' },
    { value: 'low', label: '低' }
  ];

  readonly statusOptions: Array<{ value: FrontTicketStatus; label: string }> = [
    { value: 'open', label: '待受理' },
    { value: 'in_progress', label: '处理中' },
    { value: 'resolved', label: '已解决' },
    { value: 'rejected', label: '已驳回' }
  ];

  form = {
    title: '',
    description: '',
    type: 'manual_review' as FrontTicketType,
    priority: 'medium' as FrontTicketPriority,
    relatedVerificationId: null as number | null,
    relatedJobId: null as number | null,
    relatedSettlementId: null as number | null
  };

  constructor(
    private readonly authService: AuthService,
    private readonly platformSettingsService: PlatformSettingsService,
    private readonly ticketService: TicketService,
    private readonly route: ActivatedRoute,
    private readonly router: Router
  ) {}

  ngOnInit(): void {
    this.route.queryParamMap.subscribe((params) => {
      const type = params.get('type');
      const title = params.get('title');
      const description = params.get('description');
      const relatedJobId = params.get('relatedJobId');
      const relatedVerificationId = params.get('relatedVerificationId');
      const relatedSettlementId = params.get('relatedSettlementId');

      if (type && this.typeOptions.some((item) => item.value === type)) {
        this.form.type = type as FrontTicketType;
      }

      if (title) {
        this.form.title = title;
      }

      if (description) {
        this.form.description = description;
      }

      this.form.relatedJobId = relatedJobId ? Number(relatedJobId) : null;
      this.form.relatedVerificationId = relatedVerificationId ? Number(relatedVerificationId) : null;
      this.form.relatedSettlementId = relatedSettlementId ? Number(relatedSettlementId) : null;
    });

    this.platformSettingsService.getPublicSettings().subscribe({
      next: (response) => {
        if (response.data.featureToggles?.enableAppeals === false) {
          this.router.navigate([this.isEmployerView ? '/employer/dashboard' : '/student/jobs']);
          return;
        }

        this.loadTickets();
      },
      error: () => {
        this.loadTickets();
      }
    });
  }

  get isEmployerView(): boolean {
    return this.router.url.startsWith('/employer/');
  }

  get pageContainerClasses(): string {
    return this.isEmployerView
      ? 'min-h-screen bg-[#F7FAFC] px-6 py-8 md:px-8 lg:ml-64'
      : 'min-h-screen bg-[#F7FAFC] px-6 py-8';
  }

  loadTickets(): void {
    this.loading = true;
    this.errorMessage = '';

    this.ticketService.getMyTickets(this.statusFilter, this.typeFilter).subscribe({
      next: (res) => {
        this.tickets = res.data || [];
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err.error?.message || '加载申诉工单失败，请稍后重试。';
      }
    });
  }

  onFilterChange(): void {
    this.loadTickets();
  }

  submitTicket(): void {
    if (!this.form.title.trim() || !this.form.description.trim() || this.creating) {
      return;
    }

    this.creating = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.ticketService.createTicket({
      title: this.form.title.trim(),
      description: this.form.description.trim(),
      type: this.form.type,
      priority: this.form.priority,
      relatedVerificationId: this.form.relatedVerificationId,
      relatedJobId: this.form.relatedJobId,
      relatedSettlementId: this.form.relatedSettlementId
    }).subscribe({
      next: () => {
        this.creating = false;
        this.successMessage = '申诉工单已提交，管理员处理后会在这里同步状态。';
        this.form = {
          title: '',
          description: '',
          type: 'manual_review',
          priority: 'medium',
          relatedVerificationId: null,
          relatedJobId: null,
          relatedSettlementId: null
        };
        this.loadTickets();
      },
      error: (err) => {
        this.creating = false;
        this.errorMessage = err.error?.message || '提交申诉失败，请稍后重试。';
      }
    });
  }

  getTypeLabel(type: FrontTicketType): string {
    return this.typeOptions.find((item) => item.value === type)?.label || type;
  }

  getPriorityLabel(priority: FrontTicketPriority): string {
    return this.priorityOptions.find((item) => item.value === priority)?.label || priority;
  }

  getPriorityClass(priority: FrontTicketPriority): string {
    const map: Record<FrontTicketPriority, string> = {
      high: 'bg-red-100 text-red-700',
      medium: 'bg-amber-100 text-amber-700',
      low: 'bg-slate-100 text-slate-700'
    };

    return map[priority] || 'bg-slate-100 text-slate-700';
  }

  getStatusLabel(status: FrontTicketStatus): string {
    return this.statusOptions.find((item) => item.value === status)?.label || status;
  }

  getStatusClass(status: FrontTicketStatus): string {
    const map: Record<FrontTicketStatus, string> = {
      open: 'bg-orange-100 text-orange-700',
      in_progress: 'bg-sky-100 text-sky-700',
      resolved: 'bg-emerald-100 text-emerald-700',
      rejected: 'bg-rose-100 text-rose-700'
    };

    return map[status] || 'bg-slate-100 text-slate-700';
  }

  getRelatedSummary(ticket: FrontTicketRecord): string {
    if (ticket.relatedVerification) {
      return `关联认证：${ticket.relatedVerification.companyName}`;
    }

    if (ticket.relatedJob) {
      return `关联岗位：${ticket.relatedJob.title}`;
    }

    if (ticket.relatedSettlement) {
      return `关联结算：#${ticket.relatedSettlement.id}`;
    }

    return '未关联具体业务对象';
  }

  formatDate(value?: string | null): string {
    if (!value) {
      return '-';
    }

    const date = new Date(value);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  getHeaderTitle(): string {
    return this.isEmployerView ? '企业申诉 / 工单' : '学生申诉 / 工单';
  }

  getHeaderDescription(): string {
    return this.isEmployerView
      ? '当企业对认证、岗位审核、结算争议或其他平台处理结果有异议时，可以在这里提交申诉并跟踪处理进度。'
      : '当学生对岗位、沟通、结算或其他平台处理结果有异议时，可以在这里提交申诉并跟踪处理进度。';
  }

  getSubmitterRoleLabel(role: FrontTicketRecord['sourceRole']): string {
    const map: Record<FrontTicketRecord['sourceRole'], string> = {
      student: '学生',
      employer: '企业',
      admin: '管理员',
      system: '系统'
    };

    return map[role] || role;
  }
}
