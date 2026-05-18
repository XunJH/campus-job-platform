import { Component, OnInit } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
  AdminNotificationRecord,
  AdminNotificationTargetRole,
  AdminNotificationType,
  NotificationService
} from '../../core/services/notification.service';

@Component({
  selector: 'app-admin-notifications',
  templateUrl: './notifications.component.html',
  styleUrls: ['./notifications.component.scss']
})
export class NotificationsComponent implements OnInit {
  notifications: AdminNotificationRecord[] = [];

  isLoading = false;
  creating = false;
  unreadCount = 0;
  total = 0;
  page = 1;
  limit = 10;
  totalPages = 1;

  typeFilter: AdminNotificationType | '' = '';
  targetRoleFilter: AdminNotificationTargetRole | '' = '';
  searchText = '';

  form = {
    title: '',
    content: '',
    type: 'announcement' as AdminNotificationType,
    targetRole: 'all' as AdminNotificationTargetRole,
    targetUserId: null as number | null,
    actionUrl: '',
    isPinned: false
  };

  readonly typeOptions: Array<{ value: AdminNotificationType; label: string }> = [
    { value: 'announcement', label: '平台公告' },
    { value: 'audit_result', label: '审核结果' },
    { value: 'ticket_update', label: '工单进度' },
    { value: 'settlement', label: '结算通知' },
    { value: 'system', label: '系统通知' }
  ];

  readonly roleOptions: Array<{ value: AdminNotificationTargetRole; label: string }> = [
    { value: 'all', label: '全体用户' },
    { value: 'student', label: '仅学生' },
    { value: 'employer', label: '仅企业' },
    { value: 'admin', label: '仅管理员' }
  ];

  constructor(
    private readonly notificationService: NotificationService,
    private readonly snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadNotifications();
  }

  loadNotifications(): void {
    this.isLoading = true;

    this.notificationService.getAdminNotifications(
      this.page,
      this.limit,
      this.typeFilter,
      this.targetRoleFilter,
      this.searchText || undefined
    ).subscribe({
      next: (res) => {
        this.notifications = res.data.notifications || [];
        this.unreadCount = res.data.meta.unreadCount || 0;
        this.total = res.data.meta.total || 0;
        this.page = res.data.meta.page;
        this.limit = res.data.meta.limit;
        this.totalPages = res.data.meta.totalPages || 1;
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
        this.snackBar.open('加载系统通知失败，请稍后重试。', '关闭', { duration: 3000 });
      }
    });
  }

  onFilterChange(): void {
    this.page = 1;
    this.loadNotifications();
  }

  onSearch(): void {
    this.page = 1;
    this.loadNotifications();
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages) {
      return;
    }

    this.page = page;
    this.loadNotifications();
  }

  createNotification(): void {
    if (!this.form.title.trim() || !this.form.content.trim() || this.creating) {
      return;
    }

    this.creating = true;
    this.notificationService.createAdminNotification({
      title: this.form.title.trim(),
      content: this.form.content.trim(),
      type: this.form.type,
      targetRole: this.form.targetRole,
      targetUserId: this.form.targetUserId,
      actionUrl: this.form.actionUrl.trim() || null,
      isPinned: this.form.isPinned
    }).subscribe({
      next: () => {
        this.creating = false;
        this.form = {
          title: '',
          content: '',
          type: 'announcement',
          targetRole: 'all',
          targetUserId: null,
          actionUrl: '',
          isPinned: false
        };
        this.snackBar.open('系统通知已创建。', '关闭', { duration: 3000 });
        this.loadNotifications();
      },
      error: (err) => {
        this.creating = false;
        this.snackBar.open(err.error?.message || '创建系统通知失败。', '关闭', { duration: 3000 });
      }
    });
  }

  markVisibleAsRead(): void {
    const unreadIds = this.notifications.map((item) => item.id);

    if (!unreadIds.length) {
      return;
    }

    this.notificationService.markNotificationsRead(unreadIds).subscribe({
      next: () => {
        this.snackBar.open('可见通知已标记为已读。', '关闭', { duration: 2500 });
        this.loadNotifications();
      },
      error: () => {
        this.snackBar.open('标记通知失败，请稍后重试。', '关闭', { duration: 3000 });
      }
    });
  }

  getTypeLabel(type: AdminNotificationType): string {
    return this.typeOptions.find((item) => item.value === type)?.label || type;
  }

  getTargetRoleLabel(role: AdminNotificationTargetRole): string {
    return this.roleOptions.find((item) => item.value === role)?.label || role;
  }

  getTypeClass(type: AdminNotificationType): string {
    const map: Record<AdminNotificationType, string> = {
      announcement: 'bg-amber-100 text-amber-700',
      audit_result: 'bg-sky-100 text-sky-700',
      ticket_update: 'bg-violet-100 text-violet-700',
      settlement: 'bg-emerald-100 text-emerald-700',
      system: 'bg-slate-100 text-slate-700'
    };

    return map[type] || 'bg-slate-100 text-slate-700';
  }

  formatDate(value?: string | null): string {
    if (!value) {
      return '-';
    }

    const date = new Date(value);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  }
}
