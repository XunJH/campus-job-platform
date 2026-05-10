import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../../core/services/auth.service';
import { AiApiService } from '../../../../core/services/ai-api.service';
import { EmployerShellSidebarComponent } from '../../../../shared/components/employer-shell-sidebar/employer-shell-sidebar.component';

@Component({
  selector: 'app-employer-ai',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, EmployerShellSidebarComponent],
  templateUrl: './ai.component.html',
  styleUrls: ['./ai.component.scss']
})
export class EmployerAiComponent implements OnInit {
  activeTab: 'chat' | 'reverse' = 'chat';

  chatMessages: { role: string; content: string }[] = [];
  chatInput = '';
  chatLoading = false;

  jobTitleInput = '';
  jobTagsInput = '';
  jobRequirementsInput = '';
  reverseResults: any[] = [];
  reverseLoading = false;

  constructor(
    private authService: AuthService,
    private aiApi: AiApiService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.route.queryParams.subscribe((params) => {
      const tab = params['tab'];
      if (tab === 'reverse' || tab === 'chat') {
        this.activeTab = tab;
      } else {
        this.activeTab = 'chat';
      }
    });
  }

  private getUserId(): string {
    const user = this.authService.getCurrentUser();
    return String(user?.id || 'employer');
  }

  switchTab(tab: 'chat' | 'reverse'): void {
    this.activeTab = tab;
  }

  sendChat(): void {
    if (!this.chatInput.trim() || this.chatLoading) {
      return;
    }

    const message = this.chatInput.trim();
    this.chatMessages.push({ role: 'user', content: message });
    this.chatInput = '';
    this.chatLoading = true;

    this.aiApi.employerChat(this.getUserId(), message, 'hr', this.chatMessages.slice(-10)).subscribe({
      next: (res) => {
        this.chatMessages.push({
          role: 'assistant',
          content: res.data?.reply || '抱歉，我暂时无法给出建议，请稍后再试。'
        });
        this.chatLoading = false;
      },
      error: () => {
        this.chatMessages.push({
          role: 'assistant',
          content: '网络异常，请稍后再试。'
        });
        this.chatLoading = false;
      }
    });
  }

  reverseRecommend(): void {
    if (!this.jobTitleInput.trim()) {
      return;
    }

    this.reverseLoading = true;

    const tags = this.jobTagsInput
      ? this.jobTagsInput.split(/[，,、]/).map((item) => item.trim()).filter(Boolean)
      : [];

    const requirements = this.jobRequirementsInput
      ? this.jobRequirementsInput.split(/[，,、]/).map((item) => item.trim()).filter(Boolean)
      : [];

    this.aiApi.reverseRecommend(this.jobTitleInput.trim(), tags, requirements, 5).subscribe({
      next: (res) => {
        this.reverseResults = res.data?.recommendations || [];
        this.reverseLoading = false;
      },
      error: () => {
        this.reverseLoading = false;
      }
    });
  }

  formatArray(value: string[] | null | undefined): string {
    return Array.isArray(value) && value.length ? value.join('、') : '暂无';
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/auth/login']);
  }
}
