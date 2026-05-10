import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { Subscription, interval } from 'rxjs';
import {
  ConversationDetail,
  ConversationMessage,
  ConversationService,
  ConversationSummary
} from '../../../../core/services/conversation.service';
import { EmployerShellSidebarComponent } from '../../../../shared/components/employer-shell-sidebar/employer-shell-sidebar.component';

@Component({
  selector: 'app-employer-messages',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, EmployerShellSidebarComponent],
  templateUrl: './messages.component.html'
})
export class EmployerMessagesComponent implements OnInit, OnDestroy {
  conversations: ConversationSummary[] = [];
  selectedConversation: ConversationDetail | null = null;
  loading = false;
  detailLoading = false;
  sending = false;
  errorMessage = '';
  draftMessage = '';
  applicationId: number | null = null;

  private querySubscription?: Subscription;
  private pollSubscription?: Subscription;

  constructor(
    private route: ActivatedRoute,
    private conversationService: ConversationService
  ) {}

  ngOnInit(): void {
    this.querySubscription = this.route.queryParamMap.subscribe((params) => {
      const value = params.get('applicationId');
      this.applicationId = value ? Number(value) : null;
      this.loadConversations(true);
    });

    this.pollSubscription = interval(8000).subscribe(() => {
      this.loadConversations(false);
    });
  }

  ngOnDestroy(): void {
    this.querySubscription?.unsubscribe();
    this.pollSubscription?.unsubscribe();
  }

  loadConversations(autoSelectFirst: boolean): void {
    if (autoSelectFirst) {
      this.loading = true;
    }

    const selectedId = this.selectedConversation?.id || null;

    this.conversationService.getMyConversations(this.applicationId).subscribe({
      next: (res) => {
        this.loading = false;
        this.conversations = this.sortConversations(res.data || []);

        if (!this.conversations.length) {
          this.selectedConversation = null;
          return;
        }

        const target = selectedId
          ? this.conversations.find((item) => item.id === selectedId) || this.conversations[0]
          : this.conversations[0];

        const selectedChanged = !this.selectedConversation || this.selectedConversation.id !== target.id;
        const hasUnread = (target.unreadCount || 0) > 0;
        const messageChanged = this.selectedConversation?.lastMessageAt !== target.lastMessageAt;

        if (selectedChanged || hasUnread || messageChanged || autoSelectFirst) {
          this.selectConversation(target);
        }
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err.error?.message || '加载沟通记录失败，请稍后重试。';
      }
    });
  }

  selectConversation(conversation: ConversationSummary): void {
    this.detailLoading = true;
    this.errorMessage = '';

    this.conversationService.getConversationDetail(conversation.id).subscribe({
      next: (res) => {
        this.detailLoading = false;
        this.selectedConversation = res.data;
        this.conversations = this.sortConversations(
          this.conversations.map((item) =>
            item.id === conversation.id
              ? {
                  ...item,
                  unreadCount: 0,
                  lastMessageAt: res.data.lastMessageAt || item.lastMessageAt,
                  lastMessagePreview: res.data.lastMessagePreview || item.lastMessagePreview
                }
              : item
          )
        );
      },
      error: (err) => {
        this.detailLoading = false;
        this.errorMessage = err.error?.message || '加载会话详情失败，请稍后重试。';
      }
    });
  }

  sendMessage(): void {
    if (!this.selectedConversation || !this.draftMessage.trim() || this.sending) {
      return;
    }

    this.sending = true;
    const content = this.draftMessage.trim();

    this.conversationService.sendMessage(this.selectedConversation.id, content).subscribe({
      next: (res) => {
        this.sending = false;
        this.draftMessage = '';

        const message = res.data;
        this.selectedConversation = {
          ...this.selectedConversation!,
          messages: [...this.selectedConversation!.messages, message],
          lastMessagePreview: message.content || this.selectedConversation!.lastMessagePreview,
          lastMessageAt: message.createdAt,
          unreadCount: 0
        };

        this.conversations = this.sortConversations(
          this.conversations.map((item) =>
            item.id === this.selectedConversation!.id
              ? {
                  ...item,
                  unreadCount: 0,
                  lastMessagePreview: message.content || item.lastMessagePreview,
                  lastMessageAt: message.createdAt
                }
              : item
          )
        );
      },
      error: (err) => {
        this.sending = false;
        this.errorMessage = err.error?.message || '发送消息失败，请稍后重试。';
      }
    });
  }

  getConversationTitle(conversation: ConversationSummary | ConversationDetail): string {
    return conversation.job?.title || '岗位沟通';
  }

  getCounterpartName(conversation: ConversationSummary | ConversationDetail): string {
    return conversation.student?.username || '学生';
  }

  getStatusLabel(status?: string): string {
    const map: Record<string, string> = {
      pending: '待处理',
      approved: '已通过',
      rejected: '已拒绝',
      withdrawn: '已撤回'
    };

    return status ? (map[status] || status) : '进行中';
  }

  getSenderLabel(message: ConversationMessage): string {
    const roleMap: Record<ConversationMessage['senderRole'], string> = {
      student: '学生',
      employer: '企业',
      admin: '管理员'
    };

    const username = message.sender?.username ? ` · ${message.sender.username}` : '';
    return `${roleMap[message.senderRole]}${username}`;
  }

  formatDate(value?: string | null): string {
    if (!value) return '--';
    const date = new Date(value);
    return `${date.getMonth() + 1}-${date.getDate()} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  }

  isMyMessage(message: ConversationMessage): boolean {
    return message.senderRole === 'employer';
  }

  private sortConversations(conversations: ConversationSummary[]): ConversationSummary[] {
    return [...conversations].sort((left, right) => {
      if ((right.unreadCount || 0) !== (left.unreadCount || 0)) {
        return (right.unreadCount || 0) - (left.unreadCount || 0);
      }

      const rightTime = right.lastMessageAt ? new Date(right.lastMessageAt).getTime() : 0;
      const leftTime = left.lastMessageAt ? new Date(left.lastMessageAt).getTime() : 0;
      return rightTime - leftTime;
    });
  }
}
