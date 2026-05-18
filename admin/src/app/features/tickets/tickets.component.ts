import { Component, OnInit } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
  TicketPriority,
  TicketRecord,
  TicketService,
  TicketStatus,
  TicketSummary,
  TicketType
} from '../../core/services/ticket.service';

@Component({
  selector: 'app-tickets',
  templateUrl: './tickets.component.html',
  styleUrls: ['./tickets.component.scss']
})
export class TicketsComponent implements OnInit {
  tickets: TicketRecord[] = [];
  summary: TicketSummary = {
    total: 0,
    open: 0,
    inProgress: 0,
    resolved: 0,
    rejected: 0,
    highPriority: 0,
    disputes: 0
  };

  total = 0;
  page = 1;
  limit = 10;
  totalPages = 1;
  isLoading = false;

  statusFilter: TicketStatus | '' = '';
  typeFilter: TicketType | '' = '';
  priorityFilter: TicketPriority | '' = '';
  searchText = '';

  createForm = {
    title: '',
    description: '',
    type: 'manual_review' as TicketType,
    priority: 'medium' as TicketPriority
  };
  creating = false;

  readonly typeOptions: Array<{ value: TicketType; label: string }> = [
    { value: 'manual_review', label: '人工复核' },
    { value: 'complaint_report', label: '投诉举报' },
    { value: 'verification_appeal', label: '认证申诉' },
    { value: 'job_appeal', label: '岗位申诉' },
    { value: 'settlement_dispute', label: '结算争议' }
  ];

  readonly statusOptions: Array<{ value: TicketStatus; label: string }> = [
    { value: 'open', label: '待受理' },
    { value: 'in_progress', label: '处理中' },
    { value: 'resolved', label: '已解决' },
    { value: 'rejected', label: '已驳回' }
  ];

  readonly priorityOptions: Array<{ value: TicketPriority; label: string }> = [
    { value: 'high', label: '高' },
    { value: 'medium', label: '中' },
    { value: 'low', label: '低' }
  ];

  constructor(
    private readonly ticketService: TicketService,
    private readonly snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadTickets();
  }

  loadTickets(): void {
    this.isLoading = true;

    this.ticketService.getAdminTickets(
      this.page,
      this.limit,
      this.statusFilter,
      this.typeFilter,
      this.priorityFilter,
      this.searchText || undefined
    ).subscribe({
      next: (res) => {
        this.tickets = res.data.tickets || [];
        this.summary = res.data.summary;
        this.total = res.data.pagination.total;
        this.page = res.data.pagination.page;
        this.limit = res.data.pagination.limit;
        this.totalPages = res.data.pagination.totalPages || 1;
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
        this.snackBar.open('加载工单列表失败，请稍后重试。', '关闭', { duration: 3000 });
      }
    });
  }

  onFilterChange(): void {
    this.page = 1;
    this.loadTickets();
  }

  onSearch(): void {
    this.page = 1;
    this.loadTickets();
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages) {
      return;
    }

    this.page = page;
    this.loadTickets();
  }

  createTicket(): void {
    if (!this.createForm.title.trim() || !this.createForm.description.trim() || this.creating) {
      return;
    }

    this.creating = true;

    this.ticketService.createTicket({
      title: this.createForm.title.trim(),
      description: this.createForm.description.trim(),
      type: this.createForm.type,
      priority: this.createForm.priority
    }).subscribe({
      next: () => {
        this.creating = false;
        this.createForm = {
          title: '',
          description: '',
          type: 'manual_review',
          priority: 'medium'
        };
        this.snackBar.open('工单已创建。', '关闭', { duration: 3000 });
        this.loadTickets();
      },
      error: (err) => {
        this.creating = false;
        this.snackBar.open(err.error?.message || '创建工单失败。', '关闭', { duration: 3000 });
      }
    });
  }

  markInProgress(ticket: TicketRecord): void {
    this.updateTicketStatus(ticket, 'in_progress', '管理员已接单，正在处理中。');
  }

  resolveTicket(ticket: TicketRecord): void {
    const note = prompt(`请输入“${ticket.title}”的处理结果：`, ticket.resolutionNote || '');
    if (note === null) {
      return;
    }

    this.updateTicketStatus(ticket, 'resolved', note.trim() || '管理员已确认处理完成。');
  }

  rejectTicket(ticket: TicketRecord): void {
    const note = prompt(`请输入“${ticket.title}”的驳回说明：`, ticket.resolutionNote || '');
    if (note === null) {
      return;
    }

    this.updateTicketStatus(ticket, 'rejected', note.trim() || '管理员驳回了该工单。');
  }

  getStatusLabel(status: TicketStatus): string {
    const map: Record<TicketStatus, string> = {
      open: '待受理',
      in_progress: '处理中',
      resolved: '已解决',
      rejected: '已驳回'
    };

    return map[status] || status;
  }

  getStatusClass(status: TicketStatus): string {
    const map: Record<TicketStatus, string> = {
      open: 'bg-orange-100 text-orange-700',
      in_progress: 'bg-sky-100 text-sky-700',
      resolved: 'bg-emerald-100 text-emerald-700',
      rejected: 'bg-rose-100 text-rose-700'
    };

    return map[status] || 'bg-slate-100 text-slate-700';
  }

  getPriorityLabel(priority: TicketPriority): string {
    const map: Record<TicketPriority, string> = {
      high: '高',
      medium: '中',
      low: '低'
    };

    return map[priority] || priority;
  }

  getPriorityClass(priority: TicketPriority): string {
    const map: Record<TicketPriority, string> = {
      high: 'bg-red-100 text-red-700',
      medium: 'bg-amber-100 text-amber-700',
      low: 'bg-slate-100 text-slate-700'
    };

    return map[priority] || 'bg-slate-100 text-slate-700';
  }

  getTypeLabel(type: TicketType): string {
    const match = this.typeOptions.find((item) => item.value === type);
    return match ? match.label : type;
  }

  getSourceRoleLabel(role: TicketRecord['sourceRole']): string {
    const map: Record<TicketRecord['sourceRole'], string> = {
      student: '学生',
      employer: '企业',
      admin: '管理员',
      system: '系统'
    };

    return map[role] || role;
  }

  getRelatedLabel(ticket: TicketRecord): string {
    if (ticket.relatedVerification) {
      return `认证 #${ticket.relatedVerification.id}`;
    }

    if (ticket.relatedJob) {
      return `岗位 #${ticket.relatedJob.id}`;
    }

    if (ticket.relatedSettlement) {
      return `结算 #${ticket.relatedSettlement.id}`;
    }

    return '无关联对象';
  }

  getRelatedRoute(ticket: TicketRecord): string | null {
    if (ticket.relatedVerification) {
      return `/verification-review/${ticket.relatedVerification.id}`;
    }

    if (ticket.relatedJob) {
      return '/jobs';
    }

    if (ticket.relatedSettlement) {
      return '/settlements';
    }

    return null;
  }

  formatDate(dateStr?: string | null): string {
    if (!dateStr) {
      return '-';
    }

    const date = new Date(dateStr);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  private updateTicketStatus(ticket: TicketRecord, status: TicketStatus, resolutionNote?: string): void {
    this.ticketService.updateTicketStatus(ticket.id, status, resolutionNote).subscribe({
      next: () => {
        this.snackBar.open('工单状态已更新。', '关闭', { duration: 3000 });
        this.loadTickets();
      },
      error: (err) => {
        this.snackBar.open(err.error?.message || '更新工单状态失败。', '关闭', { duration: 3000 });
      }
    });
  }
}
