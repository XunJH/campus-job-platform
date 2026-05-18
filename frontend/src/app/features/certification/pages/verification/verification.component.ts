import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import {
  VerificationApplyData,
  VerificationService,
  VerificationStatus
} from '../../../../core/services/verification.service';
import { EmployerShellSidebarComponent } from '../../../../shared/components/employer-shell-sidebar/employer-shell-sidebar.component';
import { StudentShellHeaderComponent } from '../../../../shared/components/student-shell-header/student-shell-header.component';

@Component({
  selector: 'app-verification',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    StudentShellHeaderComponent,
    EmployerShellSidebarComponent
  ],
  templateUrl: './verification.component.html',
  styleUrls: ['./verification.component.scss']
})
export class VerificationComponent implements OnInit {
  status: VerificationStatus | null = null;
  isLoading = false;
  isSubmitting = false;
  message = '';
  applyForm!: FormGroup;
  homeLink = '/student/jobs';
  isEmployer = false;
  licenseImagePreviewUrl = '';
  selectedLicenseImageDataUrl = '';
  licenseImageMessage = '';
  licenseImageError = false;

  readonly maxLicenseImageFileSize = 4 * 1024 * 1024;

  constructor(
    private readonly fb: FormBuilder,
    private readonly verificationService: VerificationService,
    private readonly authService: AuthService,
    private readonly router: Router
  ) {}

  get isStudent(): boolean {
    return !this.isEmployer;
  }

  get canApply(): boolean {
    return !this.status || this.status.status === 'unsubmitted' || this.status.status === 'rejected';
  }

  get licenseImagePreview(): string {
    return this.selectedLicenseImageDataUrl || this.licenseImagePreviewUrl || this.applyForm?.get('licenseImage')?.value || '';
  }

  get hasLicenseImage(): boolean {
    return Boolean(this.selectedLicenseImageDataUrl || this.applyForm?.get('licenseImage')?.value);
  }

  ngOnInit(): void {
    this.setHomeLink();
    this.initForm();
    this.loadStatus();
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/auth/login']);
  }

  refresh(): void {
    this.loadStatus();
  }

  onSubmit(): void {
    if (this.applyForm.invalid || !this.hasLicenseImage) {
      this.applyForm.markAllAsTouched();

      if (!this.hasLicenseImage) {
        this.licenseImageError = true;
        this.licenseImageMessage = '请先上传营业执照图片，再提交认证申请。';
      }

      return;
    }

    this.isSubmitting = true;
    this.message = '';
    const data: VerificationApplyData = {
      ...this.applyForm.getRawValue(),
      licenseImageUpload: this.selectedLicenseImageDataUrl || undefined
    };

    this.verificationService.apply(data).subscribe({
      next: (res) => {
        this.isSubmitting = false;
        this.message = res.message;
        this.loadStatus();
      },
      error: (err) => {
        this.isSubmitting = false;
        this.message = err.error?.message || '提交失败';
      }
    });
  }

  onLicenseImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) {
      return;
    }

    if (!file.type.startsWith('image/')) {
      this.licenseImageError = true;
      this.licenseImageMessage = '请选择 PNG、JPG 或 WEBP 格式的营业执照图片。';
      input.value = '';
      return;
    }

    if (file.size > this.maxLicenseImageFileSize) {
      this.licenseImageError = true;
      this.licenseImageMessage = '营业执照图片不能超过 4MB。';
      input.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      this.selectedLicenseImageDataUrl = result;
      this.licenseImagePreviewUrl = result;
      this.licenseImageError = false;
      this.licenseImageMessage = '已选择新的营业执照图片，提交申请后会自动上传。';
    };
    reader.onerror = () => {
      this.licenseImageError = true;
      this.licenseImageMessage = '读取营业执照图片失败，请重试。';
    };
    reader.readAsDataURL(file);
  }

  removeLicenseImage(): void {
    this.selectedLicenseImageDataUrl = '';
    this.licenseImagePreviewUrl = '';
    this.applyForm.patchValue({ licenseImage: '' });
    this.licenseImageError = false;
    this.licenseImageMessage = '当前营业执照图片已移除，请重新上传后再提交。';
  }

  createAppeal(): void {
    if (!this.status || this.status.status === 'unsubmitted') {
      return;
    }

    const baseRoute = this.isEmployer ? '/employer/tickets' : '/student/tickets';
    const queryParams: Record<string, string | number> = {
      type: 'verification_appeal',
      title: `认证申诉：${this.status.companyName || '当前认证记录'}`
    };

    if (this.status.rejectionReason) {
      queryParams['description'] = `我对当前认证结果有异议。驳回原因：${this.status.rejectionReason}。请平台协助复核。`;
    }

    if (this.status.id) {
      queryParams['relatedVerificationId'] = this.status.id;
    }

    this.router.navigate([baseRoute], { queryParams });
  }

  private setHomeLink(): void {
    const user = this.authService.getCurrentUser();
    this.isEmployer = user?.role === 'employer';
    this.homeLink = this.isEmployer ? '/employer/dashboard' : '/student/jobs';
  }

  private loadStatus(): void {
    this.isLoading = true;

    this.verificationService.getStatus().subscribe({
      next: (res) => {
        this.isLoading = false;
        this.status = res.data;
        if (this.canApply) {
          this.initForm();
        }
      },
      error: () => {
        this.isLoading = false;
        this.message = '加载认证状态失败';
      }
    });
  }

  private initForm(): void {
    const existingData = this.status?.status === 'rejected' ? this.status : null;

    this.selectedLicenseImageDataUrl = '';
    this.licenseImagePreviewUrl = existingData?.licenseImage || '';
    this.licenseImageMessage = '';
    this.licenseImageError = false;

    this.applyForm = this.fb.group({
      companyName: [existingData?.companyName || '', [Validators.required]],
      licenseNumber: [existingData?.licenseNumber || '', [Validators.required]],
      contactName: [existingData?.contactName || '', [Validators.required]],
      contactPhone: [
        existingData?.contactPhone || '',
        [Validators.required, Validators.pattern(/^1[3-9]\d{9}$/)]
      ],
      licenseImage: [existingData?.licenseImage || ''],
      address: [existingData?.address || ''],
      city: [existingData?.city || ''],
      industry: [existingData?.industry || ''],
      scale: [existingData?.scale || ''],
      website: [existingData?.website || ''],
      otherQualifications: [existingData?.otherQualifications || '']
    });
  }
}
