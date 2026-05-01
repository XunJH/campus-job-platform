import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormArray, ReactiveFormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { UserService } from '../../../../core/services/user.service';
import { AuthService } from '../../../../core/services/auth.service';
import { User } from '../../../../models/user.model';

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

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss']
})
export class ProfileComponent implements OnInit {
  profileForm!: FormGroup;
  isLoading = false;
  isEditing = false;
  activeSection = 'basic';
  user: User | null = null;
  message = '';
  error = false;

  sections = [
    { id: 'basic', label: '基本信息', icon: 'person' },
    { id: 'education', label: '教育背景', icon: 'school' },
    { id: 'experience', label: '工作经历', icon: 'work' },
    { id: 'skills', label: '技能与工具', icon: 'code' }
  ];

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

  constructor(
    private fb: FormBuilder,
    private userService: UserService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadProfile();
  }

  private loadProfile(): void {
    this.userService.getProfile().subscribe({
      next: (res) => {
        const mappedUser = {
          ...res.data,
          nickname: res.data.username || ''
        } as User;
        this.user = mappedUser;
        this.initForm(mappedUser);
      },
      error: () => {
        this.error = true;
        this.message = '加载用户信息失败';
      }
    });
  }

  private initForm(user: User): void {
    const profile = user.personalityProfile || {};
    const workExp = profile.workExperience || this.workExperienceList;
    const eduList = profile.education || this.educationList;

    this.profileForm = this.fb.group({
      nickname: [user.nickname || ''],
      email: [user.email || ''],
      phone: [user.phone || ''],
      avatar: [user.avatar || ''],
      bio: [user.bio || ''],
      workExperience: this.fb.array(workExp.map((e: WorkExperience) => this.createExperienceGroup(e))),
      education: this.fb.array(eduList.map((e: Education) => this.createEducationGroup(e))),
      technicalSkills: [(profile.technicalSkills || this.technicalSkills).join('、')],
      tools: [(profile.tools || this.toolsList).join('、')],
      languages: [profile.languages || this.languages]
    });
  }

  private createExperienceGroup(exp?: WorkExperience): FormGroup {
    return this.fb.group({
      title: [exp?.title || ''],
      company: [exp?.company || ''],
      period: [exp?.period || ''],
      description: [exp?.description || ''],
      skills: [exp?.skills?.join('、') || '']
    });
  }

  private createEducationGroup(edu?: Education): FormGroup {
    return this.fb.group({
      school: [edu?.school || ''],
      degree: [edu?.degree || ''],
      gpa: [edu?.gpa || ''],
      graduationYear: [edu?.graduationYear || ''],
      status: [edu?.status || '在读'],
      courses: [edu?.courses || ''],
      honors: [edu?.honors || '']
    });
  }

  get workExperienceArray(): FormArray {
    return this.profileForm.get('workExperience') as FormArray;
  }

  get educationArray(): FormArray {
    return this.profileForm.get('education') as FormArray;
  }

  selectSection(section: string): void {
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

  toggleEdit(): void {
    this.isEditing = !this.isEditing;
    this.activeSection = 'basic';
    if (!this.isEditing && this.user) {
      this.initForm(this.user);
    }
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/auth/login']);
  }

  startPersonalityTest(): void {
    this.router.navigate(['/student/ai'], { queryParams: { tab: 'test' } });
  }

  onSubmit(): void {
    if (this.profileForm.invalid) return;

    this.isLoading = true;

    const formValue = this.profileForm.value;
    const workExperience = (formValue.workExperience || []).map((e: any) => ({
      ...e,
      skills: e.skills ? e.skills.split('、').map((s: string) => s.trim()).filter(Boolean) : []
    }));
    const education = formValue.education || [];

    // 保留原有人格画像字段，防止被简历数据覆盖
    const existingProfile = this.user?.personalityProfile || {};
    const updateData = {
      username: formValue.nickname,
      email: formValue.email,
      phone: formValue.phone,
      avatar: formValue.avatar,
      bio: formValue.bio,
      personalityProfile: {
        // 先保留所有原有字段（人格画像 + 可能存在的其他字段）
        ...existingProfile,
        // 简历字段：更新为新值
        workExperience,
        education,
        technicalSkills: formValue.technicalSkills ? formValue.technicalSkills.split('、').map((s: string) => s.trim()).filter(Boolean) : [],
        tools: formValue.tools ? formValue.tools.split('、').map((s: string) => s.trim()).filter(Boolean) : [],
        languages: formValue.languages || ''
      }
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
}
