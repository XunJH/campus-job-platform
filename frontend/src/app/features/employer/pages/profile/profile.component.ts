import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { UserService } from '../../../../core/services/user.service';
import { AuthService } from '../../../../core/services/auth.service';
import { VerificationService, VerificationStatus } from '../../../../core/services/verification.service';
import { JobService, EmployerStats, Job } from '../../../../core/services/job.service';
import { User } from '../../../../models/user.model';
import { EmployerShellSidebarComponent } from '../../../../shared/components/employer-shell-sidebar/employer-shell-sidebar.component';

@Component({
  selector: 'app-employer-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, EmployerShellSidebarComponent],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss']
})
export class EmployerProfileComponent implements OnInit {
  profileForm!: FormGroup;
  isLoading = false;
  isEditing = false;
  user: User | null = null;
  verification: VerificationStatus | null = null;
  stats: EmployerStats = {
    activeJobsCount: 0,
    totalJobsCount: 0,
    recentJobs: [],
    totalApplications: 0,
    pendingApplications: 0,
    recentApplications: []
  };
  message = '';
  error = false;
  avatarPreviewUrl = '';
  selectedAvatarDataUrl = '';
  avatarMessage = '';
  avatarError = false;
  readonly maxAvatarFileSize = 2 * 1024 * 1024;

  defaultIndustry = '互联网 / 科技';
  defaultScale = '50-200 人';
  defaultRating = 4.8;
  defaultReviews = 12;

  constructor(
    private fb: FormBuilder,
    private userService: UserService,
    private authService: AuthService,
    private verificationService: VerificationService,
    private jobService: JobService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  private loadData(): void {
    this.isLoading = true;
    this.userService.getProfile().subscribe({
      next: (res) => {
        const mappedUser = { ...res.data, nickname: res.data.username || '' } as User;
        this.user = mappedUser;
        this.initForm(mappedUser);
        this.loadVerificationAndStats();
      },
      error: () => {
        this.isLoading = false;
        this.error = true;
        this.message = '加载企业资料失败。';
      }
    });
  }

  private loadVerificationAndStats(): void {
    this.verificationService.getStatus().subscribe({
      next: (response) => {
        this.verification = response.data;
        this.initFormWithVerification();
        this.loadStats();
      },
      error: () => {
        this.verification = { status: 'unsubmitted' };
        this.initFormWithVerification();
        this.loadStats();
      }
    });
  }

  private loadStats(): void {
    this.jobService.getEmployerStats().subscribe({
      next: (response) => {
        this.isLoading = false;
        this.stats = response.data;
      },
      error: () => {
        this.isLoading = false;
      }
    });
  }

  private initForm(user: User): void {
    this.profileForm = this.fb.group({
      companyName: [user.nickname || ''],
      email: [user.email || '', [Validators.email]],
      phone: [user.phone || ''],
      avatar: [user.avatar || ''],
      bio: [user.bio || ''],
      city: [''],
      address: [''],
      industry: [''],
      scale: [''],
      website: ['']
    });

    this.avatarPreviewUrl = '';
    this.selectedAvatarDataUrl = '';
    this.avatarMessage = '';
    this.avatarError = false;
  }

  private initFormWithVerification(): void {
    if (!this.profileForm || !this.verification) return;

    const verification = this.verification;
    this.profileForm.patchValue({
      companyName: verification.companyName || this.profileForm.value.companyName || '',
      city: verification.city || '',
      address: verification.address || '',
      industry: verification.industry || '',
      scale: verification.scale || '',
      website: verification.website || ''
    });
  }

  get isApproved(): boolean {
    return this.verification?.status === 'approved';
  }

  get joinedAt(): string {
    if (!this.user?.createdAt) {
      return '--';
    }

    const date = new Date(this.user.createdAt);
    return `${date.getFullYear()}年${date.getMonth() + 1}月`;
  }

  get lastActiveAt(): string {
    const date = new Date();
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  getVerificationBadge(): { label: string; className: string } {
    switch (this.verification?.status) {
      case 'approved':
        return { label: '已认证', className: 'bg-emerald-100 text-emerald-700' };
      case 'pending':
        return { label: '审核中', className: 'bg-amber-100 text-amber-700' };
      case 'rejected':
        return { label: '未通过', className: 'bg-rose-100 text-rose-700' };
      default:
        return { label: '未提交', className: 'bg-slate-100 text-slate-700' };
    }
  }

  getRecentJobStatusLabel(job: Job): string {
    if (job.status === 'active' && job.auditStatus === 'approved') {
      return '招聘中';
    }
    if (job.auditStatus === 'pending') {
      return '待审核';
    }
    if (job.auditStatus === 'rejected') {
      return '审核拒绝';
    }
    return '未开放';
  }

  formatRecentJobMeta(job: Job): string {
    const salary = `￥${Number(job.salary || 0)}`;
    const views = job.views || 0;
    const applications = job.applicationsCount || 0;
    return `${job.location || '地点待定'} · ${salary} · ${views} 次浏览 · ${applications} 份申请`;
  }

  get avatarDisplayUrl(): string {
    return this.avatarPreviewUrl || this.profileForm?.value.avatar || this.user?.avatar || '';
  }

  onAvatarSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) {
      return;
    }

    if (!file.type.startsWith('image/')) {
      this.avatarError = true;
      this.avatarMessage = '请选择图片文件';
      input.value = '';
      return;
    }

    if (file.size > this.maxAvatarFileSize) {
      this.avatarError = true;
      this.avatarMessage = 'Logo 图片不能超过 2MB';
      input.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      this.avatarPreviewUrl = result;
      this.selectedAvatarDataUrl = result;
      this.avatarError = false;
      this.avatarMessage = '已选择本地图片';
    };
    reader.onerror = () => {
      this.avatarError = true;
      this.avatarMessage = '读取图片失败，请重试';
    };
    reader.readAsDataURL(file);
  }

  removeAvatar(): void {
    this.avatarPreviewUrl = '';
    this.selectedAvatarDataUrl = '';
    this.profileForm.patchValue({ avatar: '' });
    this.avatarError = false;
    this.avatarMessage = '当前 Logo 将在保存后移除';
  }

  toggleEdit(): void {
    this.isEditing = !this.isEditing;
    if (!this.isEditing && this.user) {
      this.initForm(this.user);
      this.initFormWithVerification();
    }
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/auth/login']);
  }

  onSubmit(): void {
    if (this.profileForm.invalid) return;

    this.isLoading = true;
    const formValue = this.profileForm.value;
    const updateData: any = {
      username: formValue.companyName,
      email: formValue.email,
      phone: formValue.phone,
      avatar: formValue.avatar,
      bio: formValue.bio
    };

    if (this.selectedAvatarDataUrl) {
      updateData.avatarUpload = this.selectedAvatarDataUrl;
    }

    this.userService.updateProfile(updateData).subscribe({
      next: (res) => {
        this.isLoading = false;
        this.error = false;
        this.message = '保存成功。';
        this.isEditing = false;
        const mappedUser = { ...res.data, nickname: res.data.username || '' } as User;
        this.user = mappedUser;
        this.authService.updateCurrentUser(mappedUser);
        this.initForm(mappedUser);
        this.initFormWithVerification();
      },
      error: (err) => {
        this.isLoading = false;
        this.error = true;
        let message = '保存失败。';
        if (err.error?.errors && Array.isArray(err.error.errors) && err.error.errors.length > 0) {
          message = err.error.errors.map((item: any) => item.msg || item.message || JSON.stringify(item)).join('；');
        } else {
          message = err.error?.message || err.message || '保存失败。';
        }
        this.message = message;
      }
    });
  }

  trackByJobId(index: number, job: Job): number {
    return job.id;
  }
}
