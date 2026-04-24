import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { UserService } from '../../../../core/services/user.service';
import { AuthService } from '../../../../core/services/auth.service';
import { VerificationService, VerificationStatus } from '../../../../core/services/verification.service';
import { JobService, EmployerStats, Job } from '../../../../core/services/job.service';
import { User } from '../../../../models/user.model';

@Component({
  selector: 'app-employer-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss']
})
export class EmployerProfileComponent implements OnInit {
  profileForm!: FormGroup;
  isLoading = false;
  isEditing = false;
  user: User | null = null;
  verification: VerificationStatus | null = null;
  stats: EmployerStats = { activeJobsCount: 0, totalJobsCount: 0, recentJobs: [] };
  message = '';
  error = false;

  // Default/placeholder data for fields not yet populated
  defaultIndustry = '互联网 / 科技';
  defaultScale = '50-200人';
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
        this.message = '加载用户信息失败';
      }
    });
  }

  private loadVerificationAndStats(): void {
    this.verificationService.getStatus().subscribe({
      next: (vRes) => {
        this.verification = vRes.data;
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
      next: (sRes) => {
        this.isLoading = false;
        this.stats = sRes.data;
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
  }

  private initFormWithVerification(): void {
    if (!this.profileForm || !this.verification) return;
    const v = this.verification;
    this.profileForm.patchValue({
      companyName: v.companyName || this.profileForm.value.companyName || '',
      city: v.city || '',
      address: v.address || '',
      industry: v.industry || '',
      scale: v.scale || '',
      website: v.website || ''
    });
  }

  get isApproved(): boolean {
    return this.verification?.status === 'approved';
  }

  get joinedAt(): string {
    if (this.user?.createdAt) {
      const d = new Date(this.user.createdAt);
      return `${d.getFullYear()}年${d.getMonth() + 1}月`;
    }
    return '--';
  }

  get lastActiveAt(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
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
    const updateData = {
      username: formValue.companyName,
      email: formValue.email,
      phone: formValue.phone,
      avatar: formValue.avatar,
      bio: formValue.bio
    };
    this.userService.updateProfile(updateData).subscribe({
      next: (res) => {
        this.isLoading = false;
        this.error = false;
        this.message = '保存成功';
        this.isEditing = false;
        const mappedUser = { ...res.data, nickname: res.data.username || '' } as User;
        this.user = mappedUser;
        this.initForm(mappedUser);
        this.initFormWithVerification();
      },
      error: (err) => {
        this.isLoading = false;
        this.error = true;
        let msg = '保存失败';
        if (err.error?.errors && Array.isArray(err.error.errors) && err.error.errors.length > 0) {
          msg = err.error.errors.map((e: any) => e.msg || e.message || JSON.stringify(e)).join('；');
        } else {
          msg = err.error?.message || err.message || '保存失败';
        }
        this.message = msg;
      }
    });
  }

  trackByJobId(index: number, job: Job): number {
    return job.id;
  }
}
