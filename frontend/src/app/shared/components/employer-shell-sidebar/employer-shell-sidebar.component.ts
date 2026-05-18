import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { Subscription, interval, startWith } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { ConversationService } from '../../../core/services/conversation.service';
import { NotificationService } from '../../../core/services/notification.service';
import { PlatformSettingsService } from '../../../core/services/platform-settings.service';

@Component({
  selector: 'app-employer-shell-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './employer-shell-sidebar.component.html'
})
export class EmployerShellSidebarComponent implements OnInit, OnDestroy {
  unreadMessageCount = 0;
  unreadNotificationCount = 0;
  appealsEnabled = true;
  aiAssistantEnabled = true;
  conversationReminderEnabled = true;
  private pollingSubscription?: Subscription;

  constructor(
    private readonly authService: AuthService,
    private readonly conversationService: ConversationService,
    private readonly notificationService: NotificationService,
    private readonly platformSettingsService: PlatformSettingsService,
    private readonly router: Router
  ) {}

  ngOnInit(): void {
    this.platformSettingsService.getPublicSettings().subscribe({
      next: (response) => {
        const toggles = response.data.featureToggles;
        this.appealsEnabled = toggles.enableAppeals !== false;
        this.aiAssistantEnabled = toggles.enableAiAssistant !== false;
        this.conversationReminderEnabled = toggles.enableConversationReminder !== false;
      },
      error: () => {}
    });

    this.pollingSubscription = interval(10000)
      .pipe(startWith(0))
      .subscribe(() => {
        if (this.conversationReminderEnabled) {
          this.loadUnreadMessages();
        } else {
          this.unreadMessageCount = 0;
        }
        this.loadUnreadNotifications();
      });
  }

  ngOnDestroy(): void {
    this.pollingSubscription?.unsubscribe();
  }

  isActive(
    section:
      | 'dashboard'
      | 'post-job'
      | 'jobs'
      | 'applications'
      | 'notifications'
      | 'messages'
      | 'tickets'
      | 'wallet'
      | 'ai'
      | 'profile'
      | 'verification'
  ): boolean {
    const url = this.router.url;

    switch (section) {
      case 'dashboard':
        return url.startsWith('/employer/dashboard');
      case 'post-job':
        return url.startsWith('/employer/jobs/post') || url.startsWith('/employer/jobs/edit');
      case 'jobs':
        return url === '/employer/jobs';
      case 'applications':
        return url.startsWith('/employer/applications');
      case 'notifications':
        return url.startsWith('/employer/notifications');
      case 'messages':
        return url.startsWith('/employer/messages');
      case 'tickets':
        return url.startsWith('/employer/tickets');
      case 'wallet':
        return url.startsWith('/employer/wallet');
      case 'ai':
        return url.startsWith('/employer/ai');
      case 'profile':
        return url.startsWith('/employer/profile');
      case 'verification':
        return url.startsWith('/employer/verification');
      default:
        return false;
    }
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/auth/login']);
  }

  private loadUnreadMessages(): void {
    this.conversationService.getUnreadSummary().subscribe({
      next: (res) => {
        this.unreadMessageCount = res.data?.totalUnread || 0;
      },
      error: () => {
        this.unreadMessageCount = 0;
      }
    });
  }

  private loadUnreadNotifications(): void {
    this.notificationService.getMyNotifications('', true).subscribe({
      next: (res) => {
        this.unreadNotificationCount = res.data?.unreadCount || 0;
      },
      error: () => {
        this.unreadNotificationCount = 0;
      }
    });
  }
}
