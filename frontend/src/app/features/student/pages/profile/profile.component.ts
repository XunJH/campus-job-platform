import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { UserService } from '../../../../core/services/user.service';
import { AuthService } from '../../../../core/services/auth.service';
import { User } from '../../../../models/user.model';

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
  user: User | null = null;
  message = '';
  error = false;

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
    this.profileForm = this.fb.group({
      nickname: [user.nickname || ''],
      email: [user.email || ''],
      phone: [user.phone || ''],
      avatar: [user.avatar || ''],
      bio: [user.bio || '']
    });
  }

  toggleEdit(): void {
    this.isEditing = !this.isEditing;
    if (!this.isEditing && this.user) {
      this.initForm(this.user);
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
    username: formValue.nickname,
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
      this.user = res.data;
      this.initForm(res.data);
    },
    error: () => {
      this.isLoading = false;
      this.error = true;
      this.message = '保存失败';
    }
  });
}
}