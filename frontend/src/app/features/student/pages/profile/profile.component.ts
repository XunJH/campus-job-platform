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
  activeSection = 'basic';
  user: User | null = null;
  message = '';
  error = false;

  sections = [
    { id: 'basic', label: '基本信息', icon: 'person' },
    { id: 'education', label: '教育背景', icon: 'school' },
    { id: 'experience', label: '工作经历', icon: 'work' },
    { id: 'skills', label: '技能工具', icon: 'code' }
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
    const educationList = profile.education || this.educationList;

    this.profileForm = this.fb.group({
      nickname: [user.nickname || ''],
      email: [user.email || ''],
      phone: [user.phone || ''],
      avatar: [user.avatar || ''],
      bio: [user.bio || ''],
      workExperience: this.fb.array(workExp.map((experience: WorkExperience) => this.createExperienceGroup(experience))),
      education: this.fb.array(educationList.map((education: Education) => this.createEducationGroup(education))),
      technicalSkills: [(profile.technicalSkills || this.technicalSkills).join('、')],
      tools: [(profile.tools || this.toolsList).join('、')],
      languages: [profile.languages || this.languages]
    });
  }

  private createExperienceGroup(experience?: WorkExperience): FormGroup {
    return this.fb.group({
      title: [experience?.title || ''],
      company: [experience?.company || ''],
      period: [experience?.period || ''],
      description: [experience?.description || ''],
      skills: [experience?.skills?.join('、') || '']
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
    if (this.profileForm.invalid) {
      return;
    }

    this.isLoading = true;

    const formValue = this.profileForm.value;
    const workExperience = (formValue.workExperience || []).map((experience: any) => ({
      ...experience,
      skills: experience.skills ? experience.skills.split(/[、,，]/).map((item: string) => item.trim()).filter(Boolean) : []
    }));
    const education = formValue.education || [];

    const existingProfile = this.user?.personalityProfile || {};
    const updateData = {
      username: formValue.nickname,
      email: formValue.email,
      phone: formValue.phone,
      avatar: formValue.avatar,
      bio: formValue.bio,
      personalityProfile: {
        ...existingProfile,
        workExperience,
        education,
        technicalSkills: formValue.technicalSkills ? formValue.technicalSkills.split(/[、,，]/).map((item: string) => item.trim()).filter(Boolean) : [],
        tools: formValue.tools ? formValue.tools.split(/[、,，]/).map((item: string) => item.trim()).filter(Boolean) : [],
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
          msg = err.error.errors.map((item: any) => item.msg || item.message || JSON.stringify(item)).join('；');
        } else {
          msg = err.error?.message || err.message || '保存失败';
        }
        this.message = msg;
      }
    });
  }
}
