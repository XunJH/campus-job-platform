import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { UserRole } from '../../../../models/user.model';

interface RegisterRoleMeta {
  badge: string;
  heroTitleLine1: string;
  heroTitleLine2: string;
  heroDescription: string;
  chips: string[];
  steps: Array<{ title: string; description: string }>;
  metricValue: string;
  metricLabel: string;
  secondaryTitle: string;
  secondaryDescription: string;
  cardTitle: string;
  cardSubtitle: string;
}

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss']
})
export class RegisterComponent implements OnInit {
  registerForm!: FormGroup;
  isLoading = false;
  errorMessage = '';
  showPassword = false;
  showConfirmPassword = false;

  readonly userRoles: Array<{
    value: UserRole.STUDENT | UserRole.EMPLOYER;
    label: string;
    icon: string;
    hint: string;
  }> = [
    { value: UserRole.STUDENT, label: '学生', icon: 'school', hint: '创建求职账号' },
    { value: UserRole.EMPLOYER, label: '企业', icon: 'business_center', hint: '进入招聘工作台' }
  ];

  private readonly studentMeta: RegisterRoleMeta = {
    badge: '学生注册',
    heroTitleLine1: '建立你的求职档案',
    heroTitleLine2: '从第一份实习开始',
    heroDescription:
      '完成基础注册后，你可以完善画像、收藏岗位、管理投递进度，并获得 AI 推荐与面试辅助。',
    chips: ['岗位浏览', '投递追踪', 'AI 辅助'],
    steps: [
      {
        title: '选择学生身份',
        description: '先完成基础账号注册，后续再补充学校、专业和技能信息。'
      },
      {
        title: '完善个人资料',
        description: '补充简历、项目经验和求职偏好，提升岗位匹配效果。'
      },
      {
        title: '开始收藏与投递',
        description: '登录后即可浏览岗位、收藏目标职位并追踪投递状态。'
      }
    ],
    metricValue: '3',
    metricLabel: '分钟完成基础注册',
    secondaryTitle: '注册后可立即使用',
    secondaryDescription: '岗位收藏、投递记录、AI 匹配推荐与面试辅助。',
    cardTitle: '创建你的学生账号',
    cardSubtitle: '先完成基础信息，登录后继续完善简历与求职画像。'
  };

  private readonly employerMeta: RegisterRoleMeta = {
    badge: '企业入驻',
    heroTitleLine1: '搭建你的招聘工作台',
    heroTitleLine2: '更快触达合适学生',
    heroDescription:
      '企业账号用于发布岗位、管理投递、查看 AI 辅助结果和维护结算记录，适合校园招聘全流程。',
    chips: ['岗位发布', '投递管理', 'AI 招聘'],
    steps: [
      {
        title: '创建企业账号',
        description: '先完成基础注册，建立企业端专属招聘工作台。'
      },
      {
        title: '完善企业资料',
        description: '补充公司信息、联系人和招聘方向，便于后续认证审核。'
      },
      {
        title: '完成认证发岗',
        description: '登录后提交企业认证，通过后即可发布岗位并管理申请。'
      }
    ],
    metricValue: '1',
    metricLabel: '套统一招聘后台',
    secondaryTitle: '注册后建议继续',
    secondaryDescription: '完善企业资料、完成认证流程并开始发布岗位。',
    cardTitle: '创建企业招聘账号',
    cardSubtitle: '先注册企业账号，登录后继续完善资料与认证信息。'
  };

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.initForm();
  }

  private initForm(): void {
    this.registerForm = this.fb.group(
      {
        username: [
          '',
          [
            Validators.required,
            Validators.minLength(3),
            Validators.maxLength(50),
            Validators.pattern(/^[a-zA-Z0-9_\u4e00-\u9fa5]+$/)
          ]
        ],
        email: ['', [Validators.required, Validators.email]],
        password: [
          '',
          [Validators.required, Validators.minLength(6), Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)]
        ],
        confirmPassword: ['', [Validators.required]],
        role: [UserRole.STUDENT, [Validators.required]]
      },
      {
        validators: this.passwordMatchValidator
      }
    );
  }

  private passwordMatchValidator(form: FormGroup): null | { passwordMismatch: boolean } {
    const password = form.get('password')?.value;
    const confirmPassword = form.get('confirmPassword')?.value;
    const ctrl = form.get('confirmPassword');

    if (password !== confirmPassword) {
      const errors = { ...(ctrl?.errors || {}), passwordMismatch: true };
      ctrl?.setErrors(errors);
      return { passwordMismatch: true };
    }

    if (ctrl?.errors) {
      const errors = { ...ctrl.errors };
      delete (errors as { passwordMismatch?: boolean }).passwordMismatch;
      ctrl.setErrors(Object.keys(errors).length ? errors : null);
    }

    return null;
  }

  onSubmit(): void {
    this.registerForm.markAllAsTouched();

    if (this.registerForm.invalid) {
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    const { confirmPassword, ...registerData } = this.registerForm.value;

    this.authService.register(registerData).subscribe({
      next: (user) => {
        this.isLoading = false;
        const target = user.role === 'employer' ? '/employer/dashboard' : '/student/jobs';
        this.router.navigate([target]);
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage = error.message || '注册失败，请稍后重试。';
      }
    });
  }

  selectRole(role: UserRole.STUDENT | UserRole.EMPLOYER): void {
    this.registerForm.patchValue({ role });
  }

  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  toggleConfirmPassword(): void {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  get currentRole(): UserRole.STUDENT | UserRole.EMPLOYER {
    return this.registerForm?.value?.role === UserRole.EMPLOYER ? UserRole.EMPLOYER : UserRole.STUDENT;
  }

  get selectedRoleMeta(): RegisterRoleMeta {
    return this.currentRole === UserRole.EMPLOYER ? this.employerMeta : this.studentMeta;
  }

  get f() {
    return this.registerForm.controls;
  }
}
