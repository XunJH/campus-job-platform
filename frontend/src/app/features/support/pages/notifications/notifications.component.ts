import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import {
  FrontNotificationRecord,
  FrontNotificationType,
  NotificationService
} from '../../../../core/services/notification.service';
import { AuthService } from '../../../../core/services/auth.service';
import { EmployerShellSidebarComponent } from '../../../../shared/components/employer-shell-sidebar/employer-shell-sidebar.component';
import { StudentShellHeaderComponent } from '../../../../shared/components/student-shell-header/student-shell-header.component';

@Component({
  selector: 'app-support-notifications',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    EmployerShellSidebarComponent,
    StudentShellHeaderComponent
  ],
  templateUrl: './notifications.component.html',
  styleUrls: ['./notifications.component.scss']
})
export class SupportNotificationsComponent implements OnInit {
  notifications: FrontNotificationRecord[] = [];
  loading = false;
  errorMessage = '';

  typeFilter: FrontNotificationType | '' = '';
  unreadOnly = false;

  readonly typeOptions: Array<{ value: FrontNotificationType; label: string }> = [
    { value: 'announcement', label: '平台公告' },
    { value: 'audit_result', label: '审核结果' },
    { value: 'ticket_update', label: '工单进度' },
    { value: 'settlement', label: '结算通知' },
    { value: 'system', label: '系统通知' }
  ];

  constructor(
    private readonly authService: AuthService,
    private readonly notificationService: NotificationService,
    private readonly router: Router
  ) {}

  ngOnInit(): void {
    this.loadNotifications();
  }

  get isEmployerView(): boolean {
    return this.router.url.startsWith('/employer/');
  }

  get pageContainerClasses(): string {
    return this.isEmployerView
      ? 'min-h-screen bg-[#F7FAFC] px-6 py-8 md:px-8 lg:ml-64'
      : 'min-h-screen bg-[#F7FAFC] px-6 py-8';
  }

  get unreadCount(): number {
    return this.notifications.filter((item) => !item.isRead).length;
  }

  get currentUsername(): string {
    return this.authService.getCurrentUser()?.username || '当前用户';
  }

  loadNotifications(): void {
    this.loading = true;
    this.errorMessage = '';

    this.notificationService.getMyNotifications(this.typeFilter, this.unreadOnly).subscribe({
      next: (res) => {
        this.notifications = res.data.notifications || [];
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err.error?.message || '加载系统通知失败，请稍后重试。';
      }
    });
  }

  onFilterChange(): void {
    this.loadNotifications();
  }

  markAllAsRead(): void {
    const unreadIds = this.notifications.filter((item) => !item.isRead).map((item) => item.id);
    if (!unreadIds.length) {
      return;
    }

    this.notificationService.markNotificationsRead(unreadIds).subscribe({
      next: () => {
        this.loadNotifications();
      },
      error: () => {
        this.errorMessage = '标记通知失败，请稍后重试。';
      }
    });
  }

  openNotification(notification: FrontNotificationRecord): void {
    const idsToRead = notification.isRead ? [] : [notification.id];

    if (!idsToRead.length) {
      this.navigateToNotification(notification);
      return;
    }

    this.notificationService.markNotificationsRead(idsToRead).subscribe({
      next: () => {
        this.navigateToNotification(notification);
      },
      error: () => {
        this.navigateToNotification(notification);
      }
    });
  }

  getTypeLabel(type: FrontNotificationType): string {
    return this.typeOptions.find((item) => item.value === type)?.label || type;
  }

  getTypeClass(type: FrontNotificationType): string {
    const map: Record<FrontNotificationType, string> = {
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

  getHeaderTitle(): string {
    return this.isEmployerView ? '企业系统通知' : '学生系统通知';
  }

  getHeaderDescription(): string {
    return this.isEmployerView
      ? '统一查看岗位审核、工单进度、结算提醒和平台公告，避免错过关键处理节点。'
      : '统一查看审核结果、工单进度、结算提醒和平台公告，及时了解平台最新状态。';
  }

  private navigateToNotification(notification: FrontNotificationRecord): void {
    notification.isRead = true;
    if (notification.actionUrl) {
      this.router.navigateByUrl(notification.actionUrl);
      return;
    }

    this.loadNotifications();
  }
}
