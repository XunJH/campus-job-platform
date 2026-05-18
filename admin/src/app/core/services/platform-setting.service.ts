import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface PlatformSettings {
  id: number;
  scope: string;
  jobCategories: string[];
  workLocationOptions: string[];
  sensitiveWords: string[];
  aiRiskThresholds: {
    verificationHighRisk: number;
    jobHighRisk: number;
    conversationWarningRisk: number;
  };
  featureToggles: {
    enableBatchApply: boolean;
    enableAiAssistant: boolean;
    enableAppeals: boolean;
    requireResumeImageBeforeApply: boolean;
    enableConversationReminder: boolean;
  };
  operationRules: {
    batchApplyLimit: number;
    reportWindowDays: number;
    ticketResponseHours: number;
  };
  updatedBy?: number | null;
  updatedAt?: string;
}

export interface PlatformSettingsPayload {
  jobCategories: string[];
  workLocationOptions: string[];
  sensitiveWords: string[];
  aiRiskThresholds: PlatformSettings['aiRiskThresholds'];
  featureToggles: PlatformSettings['featureToggles'];
  operationRules: PlatformSettings['operationRules'];
}

@Injectable({
  providedIn: 'root'
})
export class PlatformSettingService {
  private readonly apiUrl = `${environment.apiBaseUrl}/platform-settings`;

  constructor(private readonly http: HttpClient) {}

  getSettings(): Observable<{ success: boolean; data: PlatformSettings }> {
    return this.http.get<{ success: boolean; data: PlatformSettings }>(this.apiUrl);
  }

  updateSettings(payload: PlatformSettingsPayload): Observable<{ success: boolean; message: string; data: PlatformSettings }> {
    return this.http.put<{ success: boolean; message: string; data: PlatformSettings }>(this.apiUrl, payload);
  }
}
