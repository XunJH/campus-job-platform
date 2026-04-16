import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';

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
    if (!role) {
      this.router.navigate([this.returnUrl]);
      return;
    }
    
    const normalizedRole = role.toLowerCase().trim();
    
    const routes: Record<string, string> = {
      'student': '/student/jobs',
      'employer': '/employer/dashboard'
    };
    
    const targetRoute = routes[normalizedRole];
    
    if (targetRoute) {
      this.router.navigate([targetRoute]);
    } else {
      this.router.navigate([this.returnUrl]);
    }
  }

  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  get f() {
    return this.loginForm.controls;
  }
}
