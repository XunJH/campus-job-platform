import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import {
  JobService,
  SettlementRecord,
  SettlementStatus,
  SettlementSummary
} from '../../../../core/services/job.service';
import { StudentShellHeaderComponent } from '../../../../shared/components/student-shell-header/student-shell-header.component';

@Component({
  selector: 'app-student-wallet',
  standalone: true,
  imports: [CommonModule, RouterModule, StudentShellHeaderComponent],
  templateUrl: './wallet.component.html',
  styleUrls: ['./wallet.component.scss']
})
export class StudentWalletComponent implements OnInit {
  settlements: SettlementRecord[] = [];
  summary: SettlementSummary = {
    total: 0,
    pending: 0,
    paid: 0,
    disputed: 0
  };
  loading = false;
  errorMessage = '';

  constructor(
    private authService: AuthService,
    private jobService: JobService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadSettlements();
  }

  get totalPendingAmount(): number {
    return this.sumByStatus('pending');
  }

  get totalPaidAmount(): number {
    return this.sumByStatus('paid');
  }

  loadSettlements(): void {
    this.loading = true;
    this.errorMessage = '';

    this.jobService.getMySettlements().subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.settlements = res.data.settlements || [];
          this.summary = res.data.summary || this.summary;
        } else {
          this.errorMessage = '加载收入记录失败';
        }
        this.loading = false;
      },
      error: (err) => {
        this.errorMessage = err.error?.message || '加载收入记录失败，请稍后重试';
        this.loading = false;
      }
    });
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/auth/login']);
  }

  formatAmount(amount?: number | string | null): string {
    const value = Number(amount || 0);
    return `¥${value.toFixed(2)}`;
  }

  formatAmountWithType(settlement: SettlementRecord): string {
    const typeMap: Record<string, string> = {
      hourly: '时薪',
      daily: '日薪',
      weekly: '周薪',
      monthly: '月薪'
    };

    return `${typeMap[settlement.salaryType] || '薪资'} ${this.formatAmount(settlement.amount)}`;
  }

  formatDate(value?: string | null): string {
    if (!value) {
      return '暂无';
    }

    const date = new Date(value);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  getStatusLabel(status: SettlementStatus): string {
    const labels: Record<SettlementStatus, string> = {
      pending: '待结算',
      paid: '已结算',
      disputed: '申诉中'
    };

    return labels[status] || status;
  }

  getStatusClass(status: SettlementStatus): string {
    const classes: Record<SettlementStatus, string> = {
      pending: 'bg-amber-50 text-amber-700 border-amber-100',
      paid: 'bg-emerald-50 text-emerald-700 border-emerald-100',
      disputed: 'bg-rose-50 text-rose-700 border-rose-100'
    };

    return classes[status] || classes.pending;
  }

  private sumByStatus(status: SettlementStatus): number {
    return this.settlements
      .filter((settlement) => settlement.status === status)
      .reduce((sum, settlement) => sum + Number(settlement.amount || 0), 0);
  }
}
