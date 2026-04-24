import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil, filter } from 'rxjs';
import { AuthService } from './core/services/auth.service';
import { PersonalityProfileService } from './core/services/personality-profile.service';
import { PersonalityProfileModalComponent } from './shared/components/personality-profile-modal/personality-profile-modal.component';
import { User } from './models/user.model';
import { PersonalityProfile } from './core/services/ai-personality.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, PersonalityProfileModalComponent],
  templateUrl: './app.component.html',
  styles: []
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'campus-job-platform';
  showModal = false;
  modalSubmitting = false;
  currentUser: User | null = null;

  private destroy$ = new Subject<void>();

  constructor(
    private authService: AuthService,
    private personalityProfileService: PersonalityProfileService
  ) {}

  ngOnInit(): void {
    // 监听登录状态变化
    this.authService.currentUser$
      .pipe(
        takeUntil(this.destroy$),
        filter((user): user is User => user !== null)
      )
      .subscribe((user) => {
        this.currentUser = user;
        this.checkAndShowModal(user);
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private checkAndShowModal(user: User): void {
    // 只有学生端需要人格画像
    if (user.role !== 'student') {
      this.showModal = false;
      return;
    }

    // 如果用户已完成人格画像，不显示
    if (user.personalityProfileCompletedAt) {
      this.showModal = false;
      return;
    }

    // 检查是否在免打扰期内（24小时）
    if (this.personalityProfileService.isInCooldown(user.id)) {
      this.showModal = false;
      return;
    }

    // 显示弹窗
    this.showModal = true;
  }

  onModalSubmitted(profile: PersonalityProfile): void {
    if (!this.currentUser) return;

    this.modalSubmitting = true;
    this.personalityProfileService.submit(profile).subscribe({
      next: () => {
        this.modalSubmitting = false;
        this.showModal = false;
        // 更新本地用户状态，标记为已完成
        const updatedUser = {
          ...this.currentUser!,
          personalityProfileCompletedAt: new Date().toISOString(),
          personalityProfile: profile
        };
        this.authService.updateCurrentUser(updatedUser);
      },
      error: (err) => {
        this.modalSubmitting = false;
        console.error('提交人格画像失败:', err);
        alert(err.message || '提交失败，请稍后重试');
      }
    });
  }

  onModalDismissed(): void {
    this.showModal = false;
    // 仅关闭弹窗，不设置免打扰，下次登录仍会弹出
  }

  onModalSnoozed(): void {
    this.showModal = false;
    if (this.currentUser) {
      this.personalityProfileService.setDismissed(this.currentUser.id);
    }
  }
}
