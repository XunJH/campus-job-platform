import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { Subscription, interval, startWith } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { ConversationService } from '../../../core/services/conversation.service';

@Component({
  selector: 'app-student-shell-header',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './student-shell-header.component.html'
})
export class StudentShellHeaderComponent implements OnInit, OnDestroy {
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

  isActive(section: 'jobs' | 'applications' | 'favorites' | 'messages' | 'wallet' | 'resume' | 'ai'): boolean {
    const url = this.router.url;

    switch (section) {
      case 'jobs':
        return url.startsWith('/student/jobs');
      case 'applications':
        return url.startsWith('/student/applications');
      case 'favorites':
        return url.startsWith('/student/favorites');
      case 'messages':
        return url.startsWith('/student/messages');
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

  get unreadLabel(): string {
    return this.unreadCount > 99 ? '99+' : String(this.unreadCount);
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
