import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { VerificationService, VerificationStatus } from '../../../../core/services/verification.service';

@Component({
  selector: 'app-employer-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class EmployerDashboardComponent implements OnInit {
  verificationStatus: VerificationStatus | null = null;
  isLoading = true;

  constructor(
    private authService: AuthService,
    private verificationService: VerificationService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.verificationService.getStatus().subscribe({
      next: (res) => {
        this.verificationStatus = res.data;
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
      }
    });
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/auth/login']);
  }
}
