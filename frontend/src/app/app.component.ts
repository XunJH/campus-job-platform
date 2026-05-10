import { CommonModule } from '@angular/common';
import { Component, ComponentRef, OnDestroy, OnInit, ViewChild, ViewContainerRef } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Subject, Subscription, filter, takeUntil } from 'rxjs';
import { PersonalityProfile } from './core/services/ai-personality.service';
import { AuthService } from './core/services/auth.service';
import { PersonalityProfileService } from './core/services/personality-profile.service';
import { User } from './models/user.model';
import type { PersonalityProfileModalComponent } from './shared/components/personality-profile-modal/personality-profile-modal.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet],
  templateUrl: './app.component.html',
  styles: []
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'campus-job-platform';
  showModal = false;
  modalSubmitting = false;
  currentUser: User | null = null;

  @ViewChild('modalHost', { read: ViewContainerRef, static: true })
  private modalHost!: ViewContainerRef;

  private destroy$ = new Subject<void>();
  private modalRef: ComponentRef<PersonalityProfileModalComponent> | null = null;
  private modalSubscriptions: Subscription[] = [];

  constructor(
    private authService: AuthService,
    private personalityProfileService: PersonalityProfileService
  ) {}

  ngOnInit(): void {
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
    this.destroyModal();
    this.destroy$.next();
    this.destroy$.complete();
  }

  private checkAndShowModal(user: User): void {
    if (user.role !== 'student') {
      this.showModal = false;
      this.destroyModal();
      return;
    }

    if (user.personalityProfileCompletedAt) {
      this.showModal = false;
      this.destroyModal();
      return;
    }

    if (this.personalityProfileService.isInCooldown(user.id)) {
      this.showModal = false;
      this.destroyModal();
      return;
    }

    this.showModal = true;
    void this.updateModal();
  }

  onModalSubmitted(profile: PersonalityProfile): void {
    if (!this.currentUser) {
      return;
    }

    this.modalSubmitting = true;
    this.syncModalInputs();

    this.personalityProfileService.submit(profile).subscribe({
      next: () => {
        this.modalSubmitting = false;
        this.showModal = false;
        this.destroyModal();

        const updatedUser = {
          ...this.currentUser!,
          personalityProfileCompletedAt: new Date().toISOString(),
          personalityProfile: profile
        };

        this.authService.updateCurrentUser(updatedUser);
      },
      error: (err) => {
        this.modalSubmitting = false;
        this.syncModalInputs();
        console.error('提交人格画像失败:', err);
        alert(err.message || '提交失败，请稍后重试');
      }
    });
  }

  onModalDismissed(): void {
    this.showModal = false;
    this.destroyModal();
  }

  onModalSnoozed(): void {
    this.showModal = false;
    this.destroyModal();

    if (this.currentUser) {
      this.personalityProfileService.setDismissed(this.currentUser.id);
    }
  }

  private async updateModal(): Promise<void> {
    if (!this.showModal || !this.currentUser) {
      this.destroyModal();
      return;
    }

    if (this.modalRef) {
      this.syncModalInputs();
      return;
    }

    const { PersonalityProfileModalComponent } = await import(
      './shared/components/personality-profile-modal/personality-profile-modal.component'
    );

    if (!this.showModal || !this.currentUser) {
      return;
    }

    if (this.modalRef) {
      this.syncModalInputs();
      return;
    }

    this.modalRef = this.modalHost.createComponent(PersonalityProfileModalComponent);
    this.modalSubscriptions = [
      this.modalRef.instance.submitted.subscribe((profile) => this.onModalSubmitted(profile)),
      this.modalRef.instance.dismissed.subscribe(() => this.onModalDismissed()),
      this.modalRef.instance.snoozed.subscribe(() => this.onModalSnoozed())
    ];

    this.syncModalInputs();
  }

  private syncModalInputs(): void {
    if (!this.modalRef || !this.currentUser) {
      return;
    }

    this.modalRef.setInput('userId', this.currentUser.id);
    this.modalRef.setInput('loading', this.modalSubmitting);
  }

  private destroyModal(): void {
    for (const subscription of this.modalSubscriptions) {
      subscription.unsubscribe();
    }

    this.modalSubscriptions = [];
    this.modalRef?.destroy();
    this.modalRef = null;
    this.modalHost?.clear();
  }
}
