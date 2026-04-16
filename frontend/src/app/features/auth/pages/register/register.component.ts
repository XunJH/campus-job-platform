import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { UserRole } from '../../../../models/user.model';

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
  
  userRoles = [
    { value: UserRole.STUDENT, label: '学生' },
    { value: UserRole.EMPLOYER, label: '企业' }
  ];

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.initForm();
  }

  private initForm(): void {
    this.registerForm = this.fb.group({
      username: ['', [
        Validators.required,
        Validators.minLength(3),
        Validators.maxLength(50),
        Validators.pattern(/^[a-zA-Z0-9_\u4e00-\u9fa5]+$/)
      ]],
      email: ['', [
        Validators.required,
        Validators.email
      ]],
      password: ['', [
        Validators.required,
        Validators.minLength(6),
        Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      ]],
      confirmPassword: ['', [
        Validators.required
      ]],
      role: [UserRole.STUDENT, [
        Validators.required
      ]]
    }, {
      validators: this.passwordMatchValidator
    });
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
      delete (errors as any).passwordMismatch;
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
        // 注册成功后根据角色跳转到对应首页
        const target = user.role === 'employer' ? '/employer/dashboard' : '/student/jobs';
        this.router.navigate([target]);
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage = error.message || '注册失败，请稍后重试';
      }
    });
  }

  selectRole(role: string): void {
    this.registerForm.patchValue({ role });
  }

  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  toggleConfirmPassword(): void {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  get f() {
    return this.registerForm.controls;
  }
}
