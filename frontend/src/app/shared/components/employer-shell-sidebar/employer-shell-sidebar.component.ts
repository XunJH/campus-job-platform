import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { Subscription, interval, startWith } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { ConversationService } from '../../../core/services/conversation.service';

@Component({
  selector: 'app-employer-shell-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './employer-shell-sidebar.component.html'
})
export class EmployerShellSidebarComponent implements OnInit, OnDestroy {
  unreadCount = 0;
  private unreadSubscription?: Subscription;

  constructor(
    private authService: AuthService,
    private conversationService: ConversationService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.unreadSubscription = interval(10000)
      .pipe(startWith(0))
      .subscribe(() => this.loadUnreadSummary());
  }

  ngOnDestroy(): void {
    this.unreadSubscription?.unsubscribe();
  }

  isActive(section: 'dashboard' | 'post-job' | 'jobs' | 'applications' | 'messages' | 'wallet' | 'ai' | 'profile' | 'verification'): boolean {
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
      case 'messages':
        return url.startsWith('/employer/messages');
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

  private loadUnreadSummary(): void {
    this.conversationService.getUnreadSummary().subscribe({
      next: (res) => {
        this.unreadCount = res.data?.totalUnread || 0;
      },
      error: () => {
        this.unreadCount = 0;
      }
    });
  }
}
