import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { UserService } from '../../../../core/services/user.service';
import { AuthService } from '../../../../core/services/auth.service';
import { User } from '../../../../models/user.model';
import { StudentShellHeaderComponent } from '../../../../shared/components/student-shell-header/student-shell-header.component';

interface WorkExperience {
  title: string;
  company: string;
  period: string;
  description: string;
  skills: string[];
}

interface Education {
  school: string;
  degree: string;
  gpa: string;
  graduationYear: string;
  status: string;
  courses: string;
  honors: string;
}

type ProfileSection = 'basic' | 'education' | 'experience' | 'skills';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, StudentShellHeaderComponent],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss']
})
export class ProfileComponent implements OnInit {
  profileForm!: FormGroup;
  isLoading = false;
  isEditing = false;
  activeSection: ProfileSection = 'basic';
  user: User | null = null;
  message = '';
  error = false;

  avatarPreviewUrl = '';
  selectedAvatarDataUrl = '';
  avatarMessage = '';
  avatarError = false;

  resumePreviewUrl = '';
  selectedResumeDataUrl = '';
  resumeMessage = '';
  resumeError = false;
  resumeRemoved = false;

  readonly maxAvatarFileSize = 2 * 1024 * 1024;
  readonly maxResumeFileSize = 4 * 1024 * 1024;

  readonly sections: Array<{ id: ProfileSection; label: string; icon: string }> = [
    { id: 'basic', label: '基本信息', icon: 'person' },
    { id: 'education', label: '教育背景', icon: 'school' },
    { id: 'experience', label: '经历项目', icon: 'work' },
    { id: 'skills', label: '技能工具', icon: 'code' }
  ];

  constructor(
    private fb: FormBuilder,
    private userService: UserService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadProfile();
  }

  get workExperienceList(): WorkExperience[] {
    return this.user?.personalityProfile?.workExperience || [];
  }

  get educationList(): Education[] {
    return this.user?.personalityProfile?.education || [];
  }

  get technicalSkills(): string[] {
    return this.user?.personalityProfile?.technicalSkills || [];
  }

  get toolsList(): string[] {
    return this.user?.personalityProfile?.tools || [];
  }

  get languages(): string {
    return this.user?.personalityProfile?.languages || '';
  }

  get workExperienceArray(): FormArray {
    return this.profileForm.get('workExperience') as FormArray;
  }

  get educationArray(): FormArray {
    return this.profileForm.get('education') as FormArray;
  }

  get avatarDisplayUrl(): string {
    return this.avatarPreviewUrl || this.profileForm?.value.avatar || this.user?.avatar || '';
  }

  get resumeDisplayUrl(): string {
    return this.resumePreviewUrl || this.user?.personalityProfile?.resumeImage || '';
  }

  private loadProfile(): void {
    this.userService.getProfile().subscribe({
      next: (res) => {
        const mappedUser = {
          ...res.data,
          nickname: res.data.nickname || res.data.username || ''
        } as User;

        this.user = mappedUser;
        this.authService.updateCurrentUser(mappedUser);
        this.initForm(mappedUser);
      },
      error: () => {
        this.error = true;
        this.message = '加载个人资料失败，请稍后重试。';
      }
    });
  }

  private initForm(user: User): void {
    const profile = user.personalityProfile || {};

    this.profileForm = this.fb.group({
      nickname: [user.nickname || user.username || ''],
      email: [user.email || ''],
      phone: [user.phone || ''],
      avatar: [user.avatar || ''],
      bio: [user.bio || ''],
      workExperience: this.fb.array(
        (profile.workExperience || []).map((experience: WorkExperience) => this.createExperienceGroup(experience))
      ),
      education: this.fb.array(
        (profile.education || []).map((education: Education) => this.createEducationGroup(education))
      ),
      technicalSkills: [(profile.technicalSkills || []).join('、')],
      tools: [(profile.tools || []).join('、')],
      languages: [profile.languages || '']
    });

    this.avatarPreviewUrl = '';
    this.selectedAvatarDataUrl = '';
    this.avatarMessage = '';
    this.avatarError = false;

    this.resumePreviewUrl = '';
    this.selectedResumeDataUrl = '';
    this.resumeMessage = '';
    this.resumeError = false;
    this.resumeRemoved = false;
  }

  private createExperienceGroup(experience?: WorkExperience): FormGroup {
    return this.fb.group({
      title: [experience?.title || ''],
      company: [experience?.company || ''],
      period: [experience?.period || ''],
      description: [experience?.description || ''],
      skills: [(experience?.skills || []).join('、')]
    });
  }

  private createEducationGroup(education?: Education): FormGroup {
    return this.fb.group({
      school: [education?.school || ''],
      degree: [education?.degree || ''],
      gpa: [education?.gpa || ''],
      graduationYear: [education?.graduationYear || ''],
      status: [education?.status || '在读'],
      courses: [education?.courses || ''],
      honors: [education?.honors || '']
    });
  }

  private parseListInput(value: string): string[] {
    return (value || '')
      .split(/[、,，]/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  selectSection(section: ProfileSection): void {
    this.activeSection = section;
  }

  addExperience(): void {
    this.workExperienceArray.push(this.createExperienceGroup());
  }

  removeExperience(index: number): void {
    this.workExperienceArray.removeAt(index);
  }

  addEducation(): void {
    this.educationArray.push(this.createEducationGroup());
  }

  removeEducation(index: number): void {
    this.educationArray.removeAt(index);
  }

  onAvatarSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) {
      return;
    }

    if (!file.type.startsWith('image/')) {
      this.avatarError = true;
      this.avatarMessage = '请选择 PNG、JPG 或 WEBP 图片。';
      input.value = '';
      return;
    }

    if (file.size > this.maxAvatarFileSize) {
      this.avatarError = true;
      this.avatarMessage = '头像图片不能超过 2MB。';
      input.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      this.avatarPreviewUrl = result;
      this.selectedAvatarDataUrl = result;
      this.avatarError = false;
      this.avatarMessage = '已选择新的头像图片，保存后生效。';
    };
    reader.onerror = () => {
      this.avatarError = true;
      this.avatarMessage = '读取头像图片失败，请重试。';
    };
    reader.readAsDataURL(file);
  }

  removeAvatar(): void {
    this.avatarPreviewUrl = '';
    this.selectedAvatarDataUrl = '';
    this.profileForm.patchValue({ avatar: '' });
    this.avatarError = false;
    this.avatarMessage = '当前头像会在保存后移除。';
  }

  onResumeSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) {
      return;
    }

    if (!file.type.startsWith('image/')) {
      this.resumeError = true;
      this.resumeMessage = '请选择 PNG、JPG 或 WEBP 格式的简历图片。';
      input.value = '';
      return;
    }

    if (file.size > this.maxResumeFileSize) {
      this.resumeError = true;
      this.resumeMessage = '简历图片不能超过 4MB。';
      input.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      this.resumePreviewUrl = result;
      this.selectedResumeDataUrl = result;
      this.resumeRemoved = false;
      this.resumeError = false;
      this.resumeMessage = '已选择简历图片。投递岗位后会自动发送给企业。';
    };
    reader.onerror = () => {
      this.resumeError = true;
      this.resumeMessage = '读取简历图片失败，请重试。';
    };
    reader.readAsDataURL(file);
  }

  removeResume(): void {
    this.resumePreviewUrl = '';
    this.selectedResumeDataUrl = '';
    this.resumeRemoved = true;
    this.resumeError = false;
    this.resumeMessage = '当前简历图片会在保存后移除。';
  }

  toggleEdit(): void {
    this.isEditing = !this.isEditing;
    this.activeSection = 'basic';

    if (!this.isEditing && this.user) {
      this.initForm(this.user);
    }
  }

  startPersonalityTest(): void {
    this.router.navigate(['/student/ai'], { queryParams: { tab: 'test' } });
  }

  onSubmit(): void {
    if (this.profileForm.invalid) {
      return;
    }

    this.isLoading = true;
    const formValue = this.profileForm.value;
    const existingProfile = this.user?.personalityProfile || {};

    const updateData: any = {
      username: formValue.nickname,
      email: formValue.email,
      phone: formValue.phone,
      avatar: formValue.avatar,
      bio: formValue.bio,
      personalityProfile: {
        ...existingProfile,
        workExperience: (formValue.workExperience || []).map((experience: any) => ({
          ...experience,
          skills: this.parseListInput(experience.skills || '')
        })),
        education: formValue.education || [],
        technicalSkills: this.parseListInput(formValue.technicalSkills || ''),
        tools: this.parseListInput(formValue.tools || ''),
        languages: formValue.languages || '',
        resumeImage: this.resumeRemoved ? '' : (existingProfile.resumeImage || '')
      }
    };

    if (this.selectedAvatarDataUrl) {
      updateData.avatarUpload = this.selectedAvatarDataUrl;
    }

    if (this.selectedResumeDataUrl) {
      updateData.resumeImageUpload = this.selectedResumeDataUrl;
    }

    if (this.resumeRemoved) {
      updateData.resumeImageRemoved = true;
    }

    this.userService.updateProfile(updateData).subscribe({
      next: (res) => {
        const mappedUser = {
          ...res.data,
          nickname: res.data.nickname || res.data.username || ''
        } as User;

        this.isLoading = false;
        this.error = false;
        this.message = '个人资料已保存。';
        this.isEditing = false;
        this.user = mappedUser;
        this.authService.updateCurrentUser(mappedUser);
        this.initForm(mappedUser);
      },
      error: (err) => {
        this.isLoading = false;
        this.error = true;

        if (Array.isArray(err.error?.errors) && err.error.errors.length > 0) {
          this.message = err.error.errors
            .map((item: any) => item.msg || item.message || JSON.stringify(item))
            .join('；');
          return;
        }

        this.message = err.error?.message || err.message || '保存资料失败，请稍后重试。';
      }
    });
  }
}
