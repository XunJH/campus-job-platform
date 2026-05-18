import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import {
  EmployerSettlementsPayload,
  JobService,
  SettlementRecord,
  SettlementStatus
} from '../../../../core/services/job.service';
import { EmployerShellSidebarComponent } from '../../../../shared/components/employer-shell-sidebar/employer-shell-sidebar.component';

@Component({
  selector: 'app-employer-wallet',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, EmployerShellSidebarComponent],
  templateUrl: './wallet.component.html',
  styleUrls: ['./wallet.component.scss']
})
export class EmployerWalletComponent implements OnInit {
  loading = false;
  errorMessage = '';
  successMessage = '';
  selectedStatus: SettlementStatus | '' = '';
  selectedJobId: number | null = null;
  updatingId: number | null = null;

  payload: EmployerSettlementsPayload = {
    settlements: [],
    jobs: [],
    summary: {
      total: 0,
      pending: 0,
      paid: 0,
      disputed: 0
    }
  };

  constructor(
    private readonly authService: AuthService,
    private readonly jobService: JobService,
    private readonly router: Router
  ) {}

  ngOnInit(): void {
    this.loadSettlements();
  }

  get settlements(): SettlementRecord[] {
    return this.payload.settlements;
  }

  get pendingAmount(): number {
    return this.sumByStatus('pending');
  }

  get paidAmount(): number {
    return this.sumByStatus('paid');
  }

  loadSettlements(): void {
    this.loading = true;
    this.errorMessage = '';

    this.jobService.getEmployerSettlements(this.selectedStatus, this.selectedJobId).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.payload = res.data;
        } else {
          this.errorMessage = '加载结算记录失败。';
        }
        this.loading = false;
      },
      error: (err) => {
        this.errorMessage = err.error?.message || '加载结算记录失败，请稍后重试。';
        this.loading = false;
      }
    });
  }

  applyFilters(): void {
    this.loadSettlements();
  }

  clearFilters(): void {
    this.selectedStatus = '';
    this.selectedJobId = null;
    this.loadSettlements();
  }

  updateStatus(settlement: SettlementRecord, status: SettlementStatus): void {
    if (!settlement.id || this.updatingId) {
      return;
    }

    this.updatingId = settlement.id;
    this.errorMessage = '';
    this.successMessage = '';

    this.jobService.updateSettlementStatus(settlement.id, status, settlement.notes || undefined).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.successMessage = res.message || '结算状态已更新。';
          this.payload.settlements = this.payload.settlements.map((item) =>
            item.id === settlement.id ? res.data : item
          );
          this.refreshSummary();
        } else {
          this.errorMessage = res.message || '更新结算状态失败。';
        }
        this.updatingId = null;
      },
      error: (err) => {
        this.errorMessage = err.error?.message || '更新结算状态失败，请稍后重试。';
        this.updatingId = null;
      }
    });
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/auth/login']);
  }

  getStatusLabel(status: SettlementStatus): string {
    const labels: Record<SettlementStatus, string> = {
      pending: '待结算',
      paid: '已支付',
      disputed: '争议中'
    };

    return labels[status] || status;
  }

  getStatusClass(status: SettlementStatus): string {
    const classes: Record<SettlementStatus, string> = {
      pending: 'bg-amber-50 text-amber-700',
      paid: 'bg-emerald-50 text-emerald-700',
      disputed: 'bg-rose-50 text-rose-700'
    };

    return classes[status] || classes.pending;
  }

  createSettlementAppeal(settlement: SettlementRecord): void {
    this.router.navigate(['/employer/tickets'], {
      queryParams: {
        type: 'settlement_dispute',
        title: `结算争议：${this.getJobTitle(settlement)}`,
        description: `我对学生 ${this.getStudentName(settlement)} 的这条结算记录有异议，请平台协助复核。`,
        relatedSettlementId: settlement.id
      }
    });
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

  getStudentName(settlement: SettlementRecord): string {
    return settlement.student?.username || '未命名学生';
  }

  getStudentContact(settlement: SettlementRecord): string {
    return settlement.student?.email || settlement.student?.phone || '暂无联系方式';
  }

  getJobTitle(settlement: SettlementRecord): string {
    return settlement.job?.title || '岗位信息缺失';
  }

  getJobLocation(settlement: SettlementRecord): string {
    return settlement.job?.location || '地点待定';
  }

  private sumByStatus(status: SettlementStatus): number {
    return this.payload.settlements
      .filter((settlement) => settlement.status === status)
      .reduce((sum, settlement) => sum + Number(settlement.amount || 0), 0);
  }

  private refreshSummary(): void {
    const nextSummary = {
      total: this.payload.settlements.length,
      pending: 0,
      paid: 0,
      disputed: 0
    };

    for (const settlement of this.payload.settlements) {
      nextSummary[settlement.status] += 1;
    }

    this.payload = {
      ...this.payload,
      summary: nextSummary
    };
  }
}
