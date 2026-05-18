import { Component, OnInit } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
  AdminOperationLogRecord,
  AdminOperationLogService
} from '../../core/services/admin-operation-log.service';

@Component({
  selector: 'app-admin-operation-logs',
  templateUrl: './admin-operation-logs.component.html',
  styleUrls: ['./admin-operation-logs.component.scss']
})
export class AdminOperationLogsComponent implements OnInit {
  logs: AdminOperationLogRecord[] = [];
  actionTypeSummary: Array<{ actionType: string; count: number | string }> = [];

  isLoading = false;
  total = 0;
  page = 1;
  limit = 10;
  totalPages = 1;

  actionTypeFilter = '';
  targetTypeFilter = '';
  searchText = '';

  constructor(
    private readonly adminOperationLogService: AdminOperationLogService,
    private readonly snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadLogs();
  }

  loadLogs(): void {
    this.isLoading = true;

    this.adminOperationLogService.getLogs(
      this.page,
      this.limit,
      this.actionTypeFilter || undefined,
      this.targetTypeFilter || undefined,
      undefined,
      this.searchText || undefined
    ).subscribe({
      next: (res) => {
        this.logs = res.data.logs || [];
        this.actionTypeSummary = res.data.actionTypeSummary || [];
        this.total = res.data.pagination.total;
        this.page = res.data.pagination.page;
        this.limit = res.data.pagination.limit;
        this.totalPages = res.data.pagination.totalPages || 1;
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
        this.snackBar.open('加载管理员操作日志失败，请稍后重试。', '关闭', { duration: 3000 });
      }
    });
  }

  onFilterChange(): void {
    this.page = 1;
    this.loadLogs();
  }

  onSearch(): void {
    this.page = 1;
    this.loadLogs();
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages) {
      return;
    }

    this.page = page;
    this.loadLogs();
  }

  getActionLabel(actionType: string): string {
    const labels: Record<string, string> = {
      notification_create: '创建通知',
      job_approve: '通过岗位',
      job_reject: '驳回岗位',
      ticket_create: '创建工单',
      ticket_status_update: '更新工单',
      verification_approve: '通过认证',
      verification_reject: '驳回认证',
      user_status_update: '更新用户状态',
      user_delete: '删除用户'
    };

    return labels[actionType] || actionType;
  }

  getActionClass(actionType: string): string {
    if (actionType.includes('reject') || actionType.includes('delete')) {
      return 'bg-rose-100 text-rose-700';
    }

    if (actionType.includes('approve') || actionType.includes('create')) {
      return 'bg-emerald-100 text-emerald-700';
    }

    if (actionType.includes('update')) {
      return 'bg-sky-100 text-sky-700';
    }

    return 'bg-slate-100 text-slate-700';
  }

  formatDate(value?: string | null): string {
    if (!value) {
      return '-';
    }

    const date = new Date(value);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  }
}
