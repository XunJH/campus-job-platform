import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, shareReplay } from 'rxjs';

export interface PublicPlatformSettings {
  jobCategories: string[];
  workLocationOptions: string[];
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
}

@Injectable({
  providedIn: 'root'
})
export class PlatformSettingsService {
  private settingsRequest$?: Observable<{ success: boolean; data: PublicPlatformSettings }>;

  constructor(private readonly http: HttpClient) {}

  getPublicSettings(forceRefresh: boolean = false): Observable<{ success: boolean; data: PublicPlatformSettings }> {
    if (!this.settingsRequest$ || forceRefresh) {
      this.settingsRequest$ = this.http
        .get<{ success: boolean; data: PublicPlatformSettings }>('/api/v1/platform-settings/public')
        .pipe(shareReplay(1));
    }

    return this.settingsRequest$;
  }
}
