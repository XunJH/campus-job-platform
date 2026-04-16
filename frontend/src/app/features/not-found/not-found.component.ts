import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="min-h-screen flex flex-col items-center justify-center text-center bg-gray-50 px-4">
      <div class="text-[120px] font-bold text-gray-900 leading-none tracking-tighter">404</div>
      <h1 class="mt-4 text-2xl font-semibold text-gray-900">页面未找到</h1>
      <p class="mt-2 text-gray-500 mb-6">抱歉，您访问的页面不存在或已被移除。</p>
      <a
        [routerLink]="homeLink"
        class="inline-flex items-center justify-center h-10 px-6 rounded-full bg-gray-900 text-white text-sm font-medium hover:bg-black transition-colors"
      >
        返回首页
      </a>
    </div>
  `,
  styles: []
})
export class NotFoundComponent {
  homeLink = '/auth/login';

  constructor(private authService: AuthService) {
    const user = this.authService.getCurrentUser();
    if (user?.role === 'employer') {
      this.homeLink = '/employer/dashboard';
    } else if (user?.role === 'student') {
      this.homeLink = '/student/jobs';
    } else if (this.authService.isAuthenticated()) {
      this.homeLink = '/student/jobs';
    } else {
      this.homeLink = '/auth/login';
    }
  }
}
