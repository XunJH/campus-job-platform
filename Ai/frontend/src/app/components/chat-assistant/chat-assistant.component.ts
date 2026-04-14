/**
 * AI对话助手组件

 * 用户可以和AI助手聊天，获取兼职相关的帮助
 */

import { Component } from '@angular/core';

@Component({
  selector: 'app-chat-assistant',
  template: `
    <div class="chat-container">
      <!-- 聊天标题 -->
      <div class="chat-header">
        <h2>AI助手 小兼</h2>
        <span class="status">在线</span>
      </div>

      <!-- 消息列表 -->
      <div class="messages">
        <!-- AI欢迎消息 -->
        <div class="message ai-message">
          <div class="avatar">🤖</div>
          <div class="content">
            你好！我是AI助手小兼 🤗
            <br><br>
            我可以帮你：
            <br>• 推荐适合你的兼职
            <br>• 解答兼职相关问题
            <br>• 提供简历优化建议
            <br>• 提醒你注意兼职安全
            <br><br>
            有什么想问的吗？
          </div>
        </div>

        <!-- 用户消息 -->
        <div
          *ngFor="let msg of messages"
          class="message"
          [class.user-message]="msg.role === 'user'"
          [class.ai-message]="msg.role === 'ai'"
        >
          <div class="avatar">{{ msg.role === 'user' ? '👤' : '🤖' }}</div>
          <div class="content">{{ msg.content }}</div>
        </div>

        <!-- 加载中 -->
        <div *ngIf="isLoading" class="message ai-message">
          <div class="avatar">🤖</div>
          <div class="content loading">
            <span>思考中</span><span class="dots">...</span>
          </div>
        </div>
      </div>

      <!-- 输入框 -->
      <div class="input-area">
        <input
          type="text"
          [(ngModel)]="inputMessage"
          (keyup.enter)="sendMessage()"
          placeholder="输入你的问题..."
          [disabled]="isLoading"
        />
        <button (click)="sendMessage()" [disabled]="isLoading || !inputMessage.trim()">
          发送
        </button>
      </div>
    </div>
  `,
  styles: [`
    .chat-container {
      width: 100%;
      max-width: 600px;
      margin: 0 auto;
      border: 1px solid #ddd;
      border-radius: 10px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      height: 500px;
    }

    .chat-header {
      background: #2196F3;
      color: white;
      padding: 15px;
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .status {
      font-size: 12px;
      background: #4CAF50;
      padding: 2px 8px;
      border-radius: 10px;
    }

    .messages {
      flex: 1;
      overflow-y: auto;
      padding: 15px;
    }

    .message {
      display: flex;
      gap: 10px;
      margin-bottom: 15px;
    }

    .avatar {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: #e0e0e0;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
    }

    .content {
      background: #f5f5f5;
      padding: 10px 15px;
      border-radius: 10px;
      max-width: 70%;
      line-height: 1.5;
    }

    .user-message {
      flex-direction: row-reverse;
    }

    .user-message .content {
      background: #2196F3;
      color: white;
    }

    .input-area {
      display: flex;
      padding: 15px;
      border-top: 1px solid #ddd;
      gap: 10px;
    }

    .input-area input {
      flex: 1;
      padding: 10px 15px;
      border: 1px solid #ddd;
      border-radius: 20px;
      outline: none;
    }

    .input-area button {
      padding: 10px 20px;
      background: #2196F3;
      color: white;
      border: none;
      border-radius: 20px;
      cursor: pointer;
    }

    .input-area button:disabled {
      background: #ccc;
      cursor: not-allowed;
    }

    .loading .dots {
      animation: dots 1.5s infinite;
    }

    @keyframes dots {
      0%, 20% { content: '.'; }
      40% { content: '..'; }
      60%, 100% { content: '...'; }
    }
  `]
})
export class ChatAssistantComponent {
  messages: any[] = [];
  inputMessage = '';
  isLoading = false;
  userId = 'demo-user';  // TODO: 从登录状态获取

  constructor(private chatService: ChatService) {}

  sendMessage() {
    if (!this.inputMessage.trim() || this.isLoading) return;

    const userMessage = this.inputMessage.trim();
    this.messages.push({
      role: 'user',
      content: userMessage
    });

    this.inputMessage = '';
    this.isLoading = true;

    // 调用AI服务
    this.chatService.sendMessage(this.userId, userMessage).subscribe({
      next: (response) => {
        this.messages.push({
          role: 'ai',
          content: response.data.reply
        });
        this.isLoading = false;
      },
      error: (error) => {
        this.messages.push({
          role: 'ai',
          content: '抱歉，我遇到了一点问题，请稍后再试。'
        });
        this.isLoading = false;
      }
    });
  }
}
