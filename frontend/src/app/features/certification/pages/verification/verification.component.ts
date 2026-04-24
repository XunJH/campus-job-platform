import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { VerificationService, VerificationStatus, VerificationApplyData } from '../../../../core/services/verification.service';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-verification',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
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

  constructor(
    private fb: FormBuilder,
    private verificationService: VerificationService,
    private authService: AuthService,
    private router: Router
  ) {}

  get isStudent(): boolean {
    return !this.isEmployer;
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/auth/login']);
  }

  ngOnInit(): void {
    this.setHomeLink();
    this.initForm();
    this.loadStatus();
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
    this.applyForm = this.fb.group({
      companyName: [existingData?.companyName || '', [Validators.required]],
      licenseNumber: [existingData?.licenseNumber || '', [Validators.required]],
      contactName: [existingData?.contactName || '', [Validators.required]],
      contactPhone: [existingData?.contactPhone || '', [Validators.required, Validators.pattern(/^1[3-9]\d{9}$/)]],
      licenseImage: [existingData?.licenseImage || '', [Validators.required]],
      address: [existingData?.address || ''],
      city: [existingData?.city || ''],
      industry: [existingData?.industry || ''],
      scale: [existingData?.scale || ''],
      website: [existingData?.website || ''],
      otherQualifications: [existingData?.otherQualifications || '']
    });
  }

  get canApply(): boolean {
    return !this.status || this.status.status === 'unsubmitted' || this.status.status === 'rejected';
  }

  get statusText(): string {
    const map: Record<string, string> = {
      'unsubmitted': '未提交认证',
      'pending': '审核中',
      'approved': '已通过认证',
      'rejected': '认证被拒绝'
    };
    return map[this.status?.status || 'unsubmitted'];
  }

  get statusClass(): string {
    return `status-${this.status?.status || 'unsubmitted'}`;
  }

  onSubmit(): void {
    if (this.applyForm.invalid) {
      this.applyForm.markAllAsTouched();
      return;
    }
    this.isSubmitting = true;
    this.message = '';
    const data: VerificationApplyData = this.applyForm.value;
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

  refresh(): void {
    this.loadStatus();
  }
}
