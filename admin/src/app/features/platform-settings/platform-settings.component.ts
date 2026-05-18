import { Component, OnInit } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { finalize } from 'rxjs/operators';
import {
  PlatformSettingService,
  PlatformSettings,
  PlatformSettingsPayload
} from '../../core/services/platform-setting.service';

interface SettingsFormModel {
  jobCategoriesText: string;
  workLocationOptionsText: string;
  sensitiveWordsText: string;
  verificationHighRisk: number;
  jobHighRisk: number;
  conversationWarningRisk: number;
  batchApplyLimit: number;
  reportWindowDays: number;
  ticketResponseHours: number;
  enableBatchApply: boolean;
  enableAiAssistant: boolean;
  enableAppeals: boolean;
  requireResumeImageBeforeApply: boolean;
  enableConversationReminder: boolean;
}

@Component({
  selector: 'app-platform-settings',
  templateUrl: './platform-settings.component.html',
  styleUrls: ['./platform-settings.component.scss']
})
export class PlatformSettingsComponent implements OnInit {
  isLoading = false;
  isSaving = false;
  form: SettingsFormModel = this.createEmptyForm();
  lastUpdatedAt = '';

  constructor(
    private readonly platformSettingService: PlatformSettingService,
    private readonly snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadSettings();
  }

  loadSettings(): void {
    this.isLoading = true;

    this.platformSettingService.getSettings()
      .pipe(finalize(() => {
        this.isLoading = false;
      }))
      .subscribe({
        next: (response) => {
          this.applySettings(response.data);
        },
        error: () => {
          this.snackBar.open('获取平台配置失败，请稍后重试', '关闭', { duration: 3000 });
        }
      });
  }

  save(): void {
    this.isSaving = true;
    const payload = this.buildPayload();

    this.platformSettingService.updateSettings(payload)
      .pipe(finalize(() => {
        this.isSaving = false;
      }))
      .subscribe({
        next: (response) => {
          this.applySettings(response.data);
          this.snackBar.open('平台配置已保存', '关闭', { duration: 2500 });
        },
        error: () => {
          this.snackBar.open('保存平台配置失败，请稍后重试', '关闭', { duration: 3000 });
        }
      });
  }

  private applySettings(settings: PlatformSettings): void {
    this.form = {
      jobCategoriesText: settings.jobCategories.join('\n'),
      workLocationOptionsText: settings.workLocationOptions.join('\n'),
      sensitiveWordsText: settings.sensitiveWords.join('\n'),
      verificationHighRisk: settings.aiRiskThresholds.verificationHighRisk,
      jobHighRisk: settings.aiRiskThresholds.jobHighRisk,
      conversationWarningRisk: settings.aiRiskThresholds.conversationWarningRisk,
      batchApplyLimit: settings.operationRules.batchApplyLimit,
      reportWindowDays: settings.operationRules.reportWindowDays,
      ticketResponseHours: settings.operationRules.ticketResponseHours,
      enableBatchApply: settings.featureToggles.enableBatchApply,
      enableAiAssistant: settings.featureToggles.enableAiAssistant,
      enableAppeals: settings.featureToggles.enableAppeals,
      requireResumeImageBeforeApply: settings.featureToggles.requireResumeImageBeforeApply,
      enableConversationReminder: settings.featureToggles.enableConversationReminder
    };
    this.lastUpdatedAt = settings.updatedAt || '';
  }

  private buildPayload(): PlatformSettingsPayload {
    return {
      jobCategories: this.parseLines(this.form.jobCategoriesText),
      workLocationOptions: this.parseLines(this.form.workLocationOptionsText),
      sensitiveWords: this.parseLines(this.form.sensitiveWordsText),
      aiRiskThresholds: {
        verificationHighRisk: this.form.verificationHighRisk,
        jobHighRisk: this.form.jobHighRisk,
        conversationWarningRisk: this.form.conversationWarningRisk
      },
      featureToggles: {
        enableBatchApply: this.form.enableBatchApply,
        enableAiAssistant: this.form.enableAiAssistant,
        enableAppeals: this.form.enableAppeals,
        requireResumeImageBeforeApply: this.form.requireResumeImageBeforeApply,
        enableConversationReminder: this.form.enableConversationReminder
      },
      operationRules: {
        batchApplyLimit: this.form.batchApplyLimit,
        reportWindowDays: this.form.reportWindowDays,
        ticketResponseHours: this.form.ticketResponseHours
      }
    };
  }

  private parseLines(value: string): string[] {
    return [...new Set(
      value
        .split(/\n|,|，/)
        .map((item) => item.trim())
        .filter(Boolean)
    )];
  }

  private createEmptyForm(): SettingsFormModel {
    return {
      jobCategoriesText: '',
      workLocationOptionsText: '',
      sensitiveWordsText: '',
      verificationHighRisk: 80,
      jobHighRisk: 75,
      conversationWarningRisk: 70,
      batchApplyLimit: 100,
      reportWindowDays: 7,
      ticketResponseHours: 24,
      enableBatchApply: true,
      enableAiAssistant: true,
      enableAppeals: true,
      requireResumeImageBeforeApply: true,
      enableConversationReminder: true
    };
  }
}
