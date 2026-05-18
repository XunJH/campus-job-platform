import { Component, OnDestroy, OnInit } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { Subscription, interval, startWith } from 'rxjs';
import { filter } from 'rxjs/operators';
import { AuthService } from '../core/services/auth.service';
import { NotificationService } from '../core/services/notification.service';

interface NavItem {
  path: string;
  label: string;
  icon: string;
  badgeKey?: 'notifications';
}

@Component({
  selector: 'app-layout',
  templateUrl: './layout.component.html',
  styleUrls: ['./layout.component.scss']
})
export class LayoutComponent implements OnInit, OnDestroy {
  navItems: NavItem[] = [
    { path: '/dashboard', label: '数据概览', icon: 'dashboard' },
    { path: '/reports', label: '运营报表', icon: 'bar_chart' },
    { path: '/platform-settings', label: '平台配置', icon: 'tune' },
    { path: '/risk-center', label: '风险监控', icon: 'shield_person' },
    { path: '/notifications', label: '系统通知', icon: 'notifications', badgeKey: 'notifications' },
    { path: '/admin-operation-logs', label: '操作日志', icon: 'history' },
    { path: '/tickets', label: '申诉工单', icon: 'support_agent' },
    { path: '/users', label: '用户管理', icon: 'people' },
    { path: '/verification-review', label: '认证审核', icon: 'verified' },
    { path: '/jobs', label: '岗位管理', icon: 'work' },
    { path: '/settlements', label: '账目查询', icon: 'payments' }
  ];

  username = '';
  pageTitle = '数据概览';
  unreadNotificationCount = 0;

  private routerSubscription?: Subscription;
  private unreadSubscription?: Subscription;

  constructor(
    private readonly authService: AuthService,
    private readonly notificationService: NotificationService,
    private readonly router: Router
  ) {
    this.username = this.authService.getUser()?.username || '管理员';
  }

  ngOnInit(): void {
    this.pageTitle = this.resolveTitle();

    this.routerSubscription = this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe(() => {
        this.pageTitle = this.resolveTitle();
      });

    this.unreadSubscription = interval(15000)
      .pipe(startWith(0))
      .subscribe(() => this.loadUnreadNotifications());
  }

  ngOnDestroy(): void {
    this.routerSubscription?.unsubscribe();
    this.unreadSubscription?.unsubscribe();
  }

  getTitle(): string {
    return this.pageTitle;
  }

  getBadge(item: NavItem): string | null {
    if (item.badgeKey === 'notifications' && this.unreadNotificationCount > 0) {
      return this.unreadNotificationCount > 99 ? '99+' : String(this.unreadNotificationCount);
    }

    return null;
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  private loadUnreadNotifications(): void {
    this.notificationService.getAdminNotifications(1, 1).subscribe({
      next: (res) => {
        this.unreadNotificationCount = res.data.meta.unreadCount || 0;
      },
      error: () => {
        this.unreadNotificationCount = 0;
      }
    });
  }

  private resolveTitle(): string {
    const url = this.router.url;
    const item = this.navItems.find((navItem) => url.startsWith(navItem.path));
    return item ? item.label : '管理后台';
  }
}
