import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { Subscription, interval, startWith } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { ConversationService } from '../../../core/services/conversation.service';
import { NotificationService } from '../../../core/services/notification.service';
import { PlatformSettingsService } from '../../../core/services/platform-settings.service';

@Component({
  selector: 'app-student-shell-header',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './student-shell-header.component.html'
})
export class StudentShellHeaderComponent implements OnInit, OnDestroy {
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

  isActive(section: 'jobs' | 'applications' | 'favorites' | 'notifications' | 'messages' | 'tickets' | 'wallet' | 'resume' | 'ai'): boolean {
    const url = this.router.url;

    switch (section) {
      case 'jobs':
        return url.startsWith('/student/jobs');
      case 'applications':
        return url.startsWith('/student/applications');
      case 'favorites':
        return url.startsWith('/student/favorites');
      case 'notifications':
        return url.startsWith('/student/notifications');
      case 'messages':
        return url.startsWith('/student/messages');
      case 'tickets':
        return url.startsWith('/student/tickets');
      case 'wallet':
        return url.startsWith('/student/wallet');
      case 'resume':
        return url.startsWith('/student/profile') || url.startsWith('/student/resume');
      case 'ai':
        return url.startsWith('/student/ai');
      default:
        return false;
    }
  }

  get unreadMessageLabel(): string {
    return this.unreadMessageCount > 99 ? '99+' : String(this.unreadMessageCount);
  }

  get unreadNotificationLabel(): string {
    return this.unreadNotificationCount > 99 ? '99+' : String(this.unreadNotificationCount);
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
