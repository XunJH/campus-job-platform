/**
 * AI对话助手服务

 * 提供聊天和意图识别功能
 */

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private apiUrl = 'http://localhost:8000';

  constructor(private http: HttpClient) {}

  /**
   * 发送消息，获取AI回复
   *
   * @param userId 用户ID
   * @param message 用户消息
   * @param history 对话历史（用于多轮对话）
   */
  sendMessage(
    userId: string,
    message: string,
    history: any[] = []
  ): Observable<any> {
    return this.http.post(`${this.apiUrl}/chat/send`, {
      user_id: userId,
      message: message,
      history: history
    });
  }

  /**
   * 意图识别
   *
   * 分析用户消息的意图，返回结构化结果
   */
  analyzeIntent(message: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/chat/intent`, {
      message: message
    });
  }
}
