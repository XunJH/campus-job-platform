import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-employer-shell-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './employer-shell-sidebar.component.html'
})
export class EmployerShellSidebarComponent {
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  isActive(section: 'dashboard' | 'post-job' | 'jobs' | 'applications' | 'wallet' | 'ai' | 'profile' | 'verification'): boolean {
    const url = this.router.url;

    switch (section) {
      case 'dashboard':
        return url.startsWith('/employer/dashboard');
      case 'post-job':
        return url.startsWith('/employer/jobs/post') || url.startsWith('/employer/jobs/edit');
      case 'jobs':
        return url === '/employer/jobs';
      case 'applications':
        return url.startsWith('/employer/applications');
      case 'wallet':
        return url.startsWith('/employer/wallet');
      case 'ai':
        return url.startsWith('/employer/ai');
      case 'profile':
        return url.startsWith('/employer/profile');
      case 'verification':
        return url.startsWith('/employer/verification');
      default:
        return false;
    }
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/auth/login']);
  }
}
