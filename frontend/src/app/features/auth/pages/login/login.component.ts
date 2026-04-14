import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';

/**
 * @功能 登录页面组件
 * @说明 处理用户登录表单提交及登录成功后的角色跳转
 */
@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit {
  
  loginForm!: FormGroup;
  isLoading = false;
  errorMessage = '';
  showPassword = false;
  returnUrl: string = '/';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.loadRememberedCredentials();
    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/';
    
    if (this.authService.isAuthenticated()) {
      const user = this.authService.getCurrentUser();
      if (user) {
        this.redirectByRole(user.role as string);
      }
    }
  }

  private initForm(): void {
    this.loginForm = this.fb.group({
      username: ['', [Validators.required]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      remember: [false]
    });
  }

  private loadRememberedCredentials(): void {
    const remembered = this.authService.getRememberCredentials();
    if (remembered) {
      this.loginForm.patchValue({
        username: remembered.username,
        password: remembered.password,
        remember: true
      });
    }
  }

  onSubmit(): void {
    this.loginForm.markAllAsTouched();
    
    if (this.loginForm.invalid) {
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    const credentials = this.loginForm.value;

    this.authService.login(credentials).subscribe({
      next: (user) => {
        console.log('登录成功，user:', user);
        this.isLoading = false;
        this.redirectByRole(user.role as string);
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage = error.message || '登录失败，请检查用户名和密码';
      }
    });
  }

  private redirectByRole(role: string | undefined): void {
    console.log('role:', role);
    if (!role) {
      this.router.navigate([this.returnUrl]);
      return;
    }
    
    const routes: Record<string, string> = {
      'student': '/student/jobs',
      'employer': '/employer/dashboard',
      'admin': '/admin/users'
    };
    
    this.router.navigate([routes[role] || this.returnUrl]);
  }

  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  get f() {
    return this.loginForm.controls;
  }
}
