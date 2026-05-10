import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-student-shell-header',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './student-shell-header.component.html'
})
export class StudentShellHeaderComponent {
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  isActive(section: 'jobs' | 'applications' | 'favorites' | 'wallet' | 'resume' | 'ai'): boolean {
    const url = this.router.url;

    switch (section) {
      case 'jobs':
        return url.startsWith('/student/jobs');
      case 'applications':
        return url.startsWith('/student/applications');
      case 'favorites':
        return url.startsWith('/student/favorites');
      case 'wallet':
        return url.startsWith('/student/wallet');
      case 'resume':
        return url.startsWith('/student/profile') || url.startsWith('/student/resume');
      case 'ai':
        return url.startsWith('/student/ai');
      default:
        return false;
    }
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/auth/login']);
  }
}
