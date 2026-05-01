/**
 * @功能 AI悬浮对话窗组件
 * @说明 右下角悬浮按钮，点击弹出AI对话框，支持学生版/企业版
 * @用法 <app-ai-fab [mode]="'student'"></app-ai-fab>
 */

import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AiApiService } from '../../../core/services/ai-api.service';
import { AuthService } from '../../../core/services/auth.service';

interface ChatMessage {
  role: 'user' | 'assistant' | 'warning';
  content: string;
  time: string;
  canForce?: boolean;
  jobs?: any[];
}

@Component({
  selector: 'app-ai-fab',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <!-- 悬浮按钮 -->
    <button class="ai-fab-btn" (click)="toggleChat()" [title]="mode === 'student' ? '小兼 AI助手' : '小招 AI助手'">
      <span *ngIf="!isOpen" class="material-symbols-outlined text-[28px]">smart_toy</span>
      <span *ngIf="isOpen" class="material-symbols-outlined text-[24px]">close</span>
    </button>

    <!-- 对话浮窗 -->
    <div class="ai-chat-panel" [class.open]="isOpen">
      <!-- 头部 -->
      <div class="chat-header">
        <div class="header-avatar">{{ mode === 'student' ? '兼' : '招' }}</div>
        <div class="header-info">
          <div class="header-name">{{ mode === 'student' ? '小兼' : '小招' }} AI助手</div>
          <div class="header-desc">{{ mode === 'student' ? '你的求职小助手' : 'HR智能助手' }}</div>
        </div>
        <button class="clear-btn" (click)="clearChat()" title="清空对话">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/>
          </svg>
        </button>
      </div>

      <!-- 消息列表 -->
      <div class="chat-messages" #msgContainer>
        <!-- 欢迎语 -->
        <div class="msg-row assistant" *ngIf="messages.length === 0">
          <div class="msg-avatar">{{ mode === 'student' ? '兼' : '招' }}</div>
          <div class="msg-bubble">
            <div class="msg-text">{{ mode === 'student'
              ? '你好！我是小兼，你的专属求职助手 😊 可以帮你推荐岗位、解答求职问题，有什么想问的吗？'
              : '你好！我是小招，你的HR助手 👋 可以帮你写岗位描述、分析候选人，有什么需要吗？' }}
            </div>
          </div>
        </div>

        <!-- 历史消息 -->
        <div class="msg-row" *ngFor="let msg of messages" [class.user]="msg.role === 'user'" [class.assistant]="msg.role === 'assistant'" [class.warning]="msg.role === 'warning'">
          <div class="msg-avatar" *ngIf="msg.role === 'assistant'">{{ mode === 'student' ? '兼' : '招' }}</div>
          <div class="msg-avatar warn-avatar" *ngIf="msg.role === 'warning'">⚠</div>
          <div class="msg-bubble" [class.warn-bubble]="msg.role === 'warning'">
            <div class="msg-text" [innerHTML]="formatMsg(msg.content)"></div>
            <!-- 岗位推荐卡片 -->
            <div *ngIf="msg.jobs && msg.jobs.length" class="job-cards mt-2">
              <div *ngFor="let job of msg.jobs" class="job-card" (click)="goToJob(job.job?.title || '')">
                <div class="job-card-title">{{ job.job?.title || '岗位' }}</div>
                <div class="job-card-company">{{ job.job?.company || '' }}</div>
                <div class="job-card-match">匹配度 {{ job.match_score }}%</div>
                <div class="job-card-reasons">
                  <span *ngFor="let r of job.match_reasons">{{ r }}</span>
                </div>
                <div class="job-card-hint">点击查看相关岗位 →</div>
              </div>
            </div>
            <div class="msg-time">{{ msg.time }}</div>
            <!-- 高危警告时显示"仍然发送"按钮 -->
            <button class="force-send-btn" *ngIf="msg.role === 'warning' && msg['canForce']" (click)="forceSend()">仍然发送</button>
          </div>
          <div class="msg-avatar user-avatar" *ngIf="msg.role === 'user'">我</div>
        </div>

        <!-- 加载中 -->
        <div class="msg-row assistant" *ngIf="isLoading">
          <div class="msg-avatar">{{ mode === 'student' ? '兼' : '招' }}</div>
          <div class="msg-bubble">
            <div class="typing-dots"><span></span><span></span><span></span></div>
          </div>
        </div>
      </div>

      <!-- 输入框 -->
      <div class="chat-input-area">
        <textarea
          [(ngModel)]="inputText"
          (keydown.enter)="onEnter($event)"
          placeholder="{{ mode === 'student' ? '问我任何求职问题…' : '输入你的问题…' }}"
          rows="1"
          [disabled]="isLoading"
        ></textarea>
        <button class="send-btn" (click)="sendMessage()" [disabled]="!inputText.trim() || isLoading">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M2 21L23 12 2 3v7l15 2-15 2z"/>
          </svg>
        </button>
      </div>
    </div>
  `,
  styles: [`
    /* 悬浮按钮 */
    .ai-fab-btn {
      position: fixed;
      bottom: 32px;
      right: 32px;
      width: 56px;
      height: 56px;
      border-radius: 50%;
      background: #1A365D;
      color: #fff;
      border: none;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 16px rgba(26,54,93,0.35);
      cursor: pointer;
      z-index: 1100;
      transition: all 0.3s ease;

      &:hover { transform: scale(1.12); box-shadow: 0 8px 24px rgba(26,54,93,0.45); }
    }

    /* 对话面板 */
    .ai-chat-panel {
      position: fixed;
      bottom: 100px;
      right: 24px;
      width: 360px;
      height: 520px;
      background: #fff;
      border-radius: 20px;
      box-shadow: 0 12px 48px rgba(0,0,0,0.18);
      display: flex;
      flex-direction: column;
      z-index: 1099;
      overflow: hidden;
      transform: scale(0.85) translateY(20px);
      opacity: 0;
      pointer-events: none;
      transform-origin: bottom right;
      transition: all 0.25s cubic-bezier(0.34,1.56,0.64,1);

      &.open {
        transform: scale(1) translateY(0);
        opacity: 1;
        pointer-events: all;
      }
    }

    /* 头部 */
    .chat-header {
      background: #1A365D;
      padding: 14px 16px;
      display: flex;
      align-items: center;
      gap: 10px;
      color: #fff;
      flex-shrink: 0;
    }
    .header-avatar {
      width: 38px; height: 38px;
      background: rgba(255,255,255,0.15);
      border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-weight: 700; font-size: 16px;
      border: 2px solid rgba(255,255,255,0.3);
    }
    .header-info { flex: 1; }
    .header-name { font-weight: 600; font-size: 15px; }
    .header-desc { font-size: 11px; opacity: 0.8; margin-top: 1px; }
    .clear-btn {
      background: rgba(255,255,255,0.15); border: none; color: #fff;
      border-radius: 8px; padding: 6px; cursor: pointer;
      &:hover { background: rgba(255,255,255,0.25); }
    }

    /* 消息区 */
    .chat-messages {
      flex: 1;
      overflow-y: auto;
      padding: 14px 12px;
      display: flex;
      flex-direction: column;
      gap: 10px;
      background: #f8f9ff;

      &::-webkit-scrollbar { width: 4px; }
      &::-webkit-scrollbar-thumb { background: #d4d4f7; border-radius: 4px; }
    }

    .msg-row {
      display: flex;
      align-items: flex-end;
      gap: 7px;
      &.user { flex-direction: row-reverse; }
    }

    .msg-avatar {
      width: 30px; height: 30px;
      border-radius: 50%;
      background: #1A365D;
      color: #fff;
      font-size: 11px;
      font-weight: 700;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
    }
    .user-avatar { background: #64748b; }

    .msg-bubble {
      max-width: 280px;
    }
    .job-cards {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .job-card {
      background: #f1f5f9;
      border-radius: 12px;
      padding: 10px 12px;
      border: 1px solid #e2e8f0;
    }
    .job-card-title {
      font-size: 13px;
      font-weight: 600;
      color: #1A365D;
      margin-bottom: 2px;
    }
    .job-card-company {
      font-size: 11px;
      color: #64748b;
      margin-bottom: 4px;
    }
    .job-card-match {
      font-size: 11px;
      font-weight: 600;
      color: #1A365D;
      margin-bottom: 4px;
    }
    .job-card-reasons {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
    }
    .job-card-reasons span {
      font-size: 10px;
      background: #fff;
      color: #1A365D;
      padding: 2px 8px;
      border-radius: 6px;
      border: 1px solid #cbd5e1;
    }
    .job-card-hint {
      font-size: 10px;
      color: #64748b;
      margin-top: 4px;
      text-align: right;
    }
    .job-card {
      cursor: pointer;
      transition: transform 0.15s, box-shadow 0.15s;
    }
    .job-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    }
    .msg-text {
      padding: 9px 13px;
      border-radius: 16px;
      font-size: 13.5px;
      line-height: 1.55;
      word-break: break-word;

      .assistant & {
        background: #fff;
        color: #1f2937;
        border-bottom-left-radius: 4px;
        box-shadow: 0 1px 4px rgba(0,0,0,0.08);
      }
      .user & {
        background: linear-gradient(135deg, #6366f1, #8b5cf6);
        color: #fff;
        border-bottom-right-radius: 4px;
      }
    }
    .msg-time {
      font-size: 10px;
      color: #9ca3af;
      margin-top: 3px;
      .user & { text-align: right; }
    }

    /* 警告消息 */
    .warn-avatar {
      background: linear-gradient(135deg, #f59e0b, #d97706) !important;
      font-size: 14px;
    }
    .warn-bubble {
      .msg-text {
        background: #fffbeb !important;
        color: #92400e !important;
        border: 1.5px solid #fcd34d !important;
        border-bottom-left-radius: 4px !important;
      }
    }
    .force-send-btn {
      margin-top: 6px;
      padding: 4px 12px;
      border: 1.5px solid #f59e0b;
      background: #fff;
      color: #b45309;
      border-radius: 8px;
      font-size: 11px;
      cursor: pointer;
      transition: all 0.2s;
      &:hover { background: #fef3c7; }
    }

    /* 打字动画 */
    .typing-dots {
      display: flex; gap: 4px; align-items: center; padding: 4px 2px;
      span {
        width: 7px; height: 7px; border-radius: 50%;
        background: #1A365D;
        animation: bounce 1.2s infinite;
        &:nth-child(2) { animation-delay: 0.2s; }
        &:nth-child(3) { animation-delay: 0.4s; }
      }
    }
    @keyframes bounce {
      0%,60%,100% { transform: translateY(0); opacity:0.4; }
      30% { transform: translateY(-6px); opacity:1; }
    }

    /* 输入区 */
    .chat-input-area {
      display: flex;
      align-items: flex-end;
      gap: 8px;
      padding: 10px 12px;
      border-top: 1px solid #e9e9f7;
      background: #fff;
      flex-shrink: 0;

      textarea {
        flex: 1;
        border: 1.5px solid #e5e7eb;
        border-radius: 12px;
        padding: 9px 12px;
        font-size: 13.5px;
        resize: none;
        outline: none;
        font-family: inherit;
        max-height: 96px;
        line-height: 1.5;
        transition: border-color 0.2s;
        &:focus { border-color: #1A365D; }
        &::placeholder { color: #9ca3af; }
      }
    }

    .send-btn {
      width: 38px; height: 38px;
      border-radius: 12px;
      background: #1A365D;
      border: none;
      color: #fff;
      display: flex; align-items: center; justify-content: center;
      cursor: pointer;
      flex-shrink: 0;
      transition: all 0.2s;
      &:hover:not(:disabled) { transform: scale(1.08); background: #234876; }
      &:disabled { opacity: 0.4; cursor: not-allowed; }
    }
  `]
})
export class AiFabComponent implements OnInit {
  /** 模式：student=学生版 employer=企业版 */
  @Input() mode: 'student' | 'employer' = 'student';
  /** 当前登录用户ID */
  @Input() userId: string = 'user_001';

  isOpen = false;
  isLoading = false;
  inputText = '';
  messages: ChatMessage[] = [];

  // 对话历史（传给后端）
  private history: { role: string; content: string }[] = [];

  // 被拦截的待发送消息（用户确认后仍可发送）
  private pendingMessage: string | null = null;

  constructor(private aiApi: AiApiService, private authService: AuthService, private router: Router) {}

  ngOnInit() {}

  toggleChat() {
    this.isOpen = !this.isOpen;
  }

  clearChat() {
    this.messages = [];
    this.history = [];
  }

  onEnter(event: any) {
    if (!event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  sendMessage() {
    const text = this.inputText.trim();
    if (!text || this.isLoading) return;

    this.inputText = '';
    this.isLoading = true;

    // 先调用消息安全检测
    this.aiApi.messageGuard(text, this.mode === 'student' ? 'student' : 'employer').subscribe({
      next: (res: any) => {
        const guardData = res?.data;
        // 高危内容：拦截并显示警告
        if (guardData && !guardData.is_safe && guardData.risk_level === 'high') {
          this.isLoading = false;
          const warnMsg: any = {
            role: 'warning',
            content: `⚠️ 安全警告：${guardData.warning_message || '该消息可能包含不当内容'}`,
            time: this.getTime(),
            canForce: true
          };
          this.messages.push(warnMsg);
          this.pendingMessage = text;  // 记录被拦截的消息
          this.scrollToBottom();
          return;
        }
        // 中危内容：显示提示但继续发送
        if (guardData && guardData.risk_level === 'medium' && guardData.warning_message) {
          this.messages.push({
            role: 'warning',
            content: `💡 温馨提示：${guardData.warning_message}`,
            time: this.getTime()
          });
        }
        // 安全或中危，继续发送
        this.doSend(text);
      },
      error: () => {
        // 检测服务异常，默认放行
        this.doSend(text);
      }
    });
  }

  /** 用户确认后强制发送被拦截的消息 */
  forceSend() {
    if (this.pendingMessage) {
      const text = this.pendingMessage;
      this.pendingMessage = null;
      // 移除警告的 canForce 标记
      const lastWarn = this.messages.find((m: any) => m['canForce']);
      if (lastWarn) delete lastWarn['canForce'];
      this.isLoading = true;
      this.doSend(text);
    }
  }

  /** 判断是否是推荐岗位类请求 */
  private isJobRecommendRequest(text: string): boolean {
    const hasRecommend = /推荐|介绍|有没有|哪些|什么|适合|匹配/i.test(text);
    const hasJob = /岗位|兼职|工作|职位|机会/i.test(text);
    const hasFind = /找|求|想要|需要/i.test(text);
    return (hasRecommend && hasJob) || (hasFind && hasJob);
  }

  /** 实际发送消息到AI */
  private doSend(text: string) {
    // 添加用户消息
    this.messages.push({
      role: 'user',
      content: text,
      time: this.getTime()
    });
    this.scrollToBottom();

    // 调用对应的AI接口
    const apiCall = this.mode === 'student'
      ? this.aiApi.studentChat(this.userId, text, this.history)
      : this.aiApi.employerChat(this.userId, text, 'hr', this.history);

    apiCall.subscribe({
      next: (res: any) => {
        const reply = res.data?.reply || res.data?.response || res.response || res.message || '收到，请稍后再试~';

        // 如果是推荐岗位请求，同时调用推荐接口
        if (this.mode === 'student' && this.isJobRecommendRequest(text)) {
          this.fetchAndShowJobs(reply, text);
        } else {
          this.messages.push({
            role: 'assistant',
            content: reply,
            time: this.getTime()
          });
          this.isLoading = false;
          this.scrollToBottom();
        }

        // 更新历史
        this.history.push({ role: 'user', content: text });
        this.history.push({ role: 'assistant', content: reply });
        if (this.history.length > 20) this.history = this.history.slice(-20);
      },
      error: () => {
        this.messages.push({
          role: 'assistant',
          content: '网络连接异常，请检查AI后端是否启动（端口8000）',
          time: this.getTime()
        });
        this.isLoading = false;
        this.scrollToBottom();
      }
    });
  }

  /** 获取岗位推荐并显示在聊天中 */
  private fetchAndShowJobs(aiReply: string, userText: string): void {
    const user = this.authService.getCurrentUser();
    const profile = user?.personalityProfile || {};

    // 先显示AI文字回复
    this.messages.push({
      role: 'assistant',
      content: aiReply,
      time: this.getTime()
    });

    // 尝试人格画像推荐，失败则回退到全部岗位列表
    this.aiApi.recommendJobs(this.userId, profile, 5).subscribe({
      next: (res: any) => {
        const jobs = res.data?.recommendations || [];
        this.showJobCards(jobs);
      },
      error: () => {
        // 推荐接口失败，回退到全部岗位
        this.aiApi.getAllJobs().subscribe({
          next: (res: any) => {
            const allJobs = res.data?.jobs || [];
            // 包装成推荐格式
            const jobs = allJobs.slice(0, 5).map((job: any) => ({
              job,
              match_score: 85,
              match_reasons: job.tags?.slice(0, 2) || ['校园兼职']
            }));
            this.showJobCards(jobs);
          },
          error: () => {
            this.isLoading = false;
            this.scrollToBottom();
          }
        });
      }
    });
  }

  /** 在聊天中显示岗位卡片 */
  private showJobCards(jobs: any[]): void {
    if (jobs.length > 0) {
      this.messages.push({
        role: 'assistant',
        content: `为你找到 ${jobs.length} 个岗位：`,
        time: this.getTime(),
        jobs: jobs
      });
    }
    this.isLoading = false;
    this.scrollToBottom();
  }

  /** 点击岗位卡片跳转到岗位列表 */
  goToJob(title: string): void {
    this.isOpen = false;
    this.router.navigate(['/student/jobs'], { queryParams: { search: title } });
  }

  formatMsg(text: string): string {
    // 简单格式化：换行转<br>
    return text.replace(/\n/g, '<br>');
  }

  private getTime(): string {
    return new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  }

  private scrollToBottom() {
    setTimeout(() => {
      const el = document.querySelector('.chat-messages');
      if (el) el.scrollTop = el.scrollHeight;
    }, 50);
  }
}
