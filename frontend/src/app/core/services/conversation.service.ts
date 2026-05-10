import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ConversationParticipant {
  id: number;
  username: string;
  avatar?: string;
}

export interface ConversationApplication {
  id: number;
  status: 'pending' | 'approved' | 'rejected' | 'withdrawn';
  appliedAt: string;
  reviewedAt?: string | null;
  resume?: string | null;
  coverLetter?: string | null;
  notes?: string | null;
}

export interface ConversationJob {
  id: number;
  title: string;
  location?: string;
  salary?: number;
  salaryType?: string;
  status?: string;
  auditStatus?: string;
}

export interface ConversationMessage {
  id: number;
  conversationId: number;
  senderId: number;
  senderRole: 'student' | 'employer' | 'admin';
  messageType: 'text' | 'resume' | 'system';
  content?: string | null;
  attachmentUrl?: string | null;
  createdAt: string;
  sender?: ConversationParticipant;
}

export interface ConversationSummary {
  id: number;
  applicationId: number;
  jobId: number;
  studentId: number;
  employerId: number;
  status: 'active' | 'closed';
  unreadCount?: number;
  lastMessagePreview?: string | null;
  lastMessageAt?: string | null;
  application?: ConversationApplication;
  job?: ConversationJob;
  student?: ConversationParticipant;
  employer?: ConversationParticipant;
}

export interface ConversationDetail extends ConversationSummary {
  messages: ConversationMessage[];
}

export interface ConversationUnreadSummary {
  totalUnread: number;
  unreadConversations: number;
}

@Injectable({ providedIn: 'root' })
export class ConversationService {
  private readonly API_URL = '/api/v1/conversations';

  constructor(private http: HttpClient) {}

  getMyConversations(
    applicationId?: number | null
  ): Observable<{ success: boolean; data: ConversationSummary[]; meta?: { totalUnread: number } }> {
    let params = new HttpParams();

    if (applicationId) {
      params = params.set('applicationId', applicationId.toString());
    }

    return this.http.get<{ success: boolean; data: ConversationSummary[]; meta?: { totalUnread: number } }>(
      this.API_URL,
      { params }
    );
  }

  getUnreadSummary(): Observable<{ success: boolean; data: ConversationUnreadSummary }> {
    return this.http.get<{ success: boolean; data: ConversationUnreadSummary }>(`${this.API_URL}/summary/unread`);
  }

  getConversationDetail(id: number): Observable<{ success: boolean; data: ConversationDetail }> {
    return this.http.get<{ success: boolean; data: ConversationDetail }>(`${this.API_URL}/${id}`);
  }

  sendMessage(id: number, content: string): Observable<{ success: boolean; message: string; data: ConversationMessage }> {
    return this.http.post<{ success: boolean; message: string; data: ConversationMessage }>(
      `${this.API_URL}/${id}/messages`,
      { content }
    );
  }
}
