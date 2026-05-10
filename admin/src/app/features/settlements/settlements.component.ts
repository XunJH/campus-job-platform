import { Component, OnInit } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
  SettlementRecord,
  SettlementService,
  SettlementStatus,
  SettlementSummary
} from '../../core/services/settlement.service';

@Component({
  selector: 'app-settlements',
  templateUrl: './settlements.component.html',
  styleUrls: ['./settlements.component.scss']
})
export class SettlementsComponent implements OnInit {
  settlements: SettlementRecord[] = [];
  summary: SettlementSummary = {
    total: 0,
    pending: 0,
    paid: 0,
    disputed: 0
  };
  total = 0;
  page = 1;
  limit = 10;
  isLoading = false;
  statusFilter: SettlementStatus | '' = '';

  constructor(
    private settlementService: SettlementService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadSettlements();
  }

  loadSettlements(): void {
    this.isLoading = true;
    this.settlementService.getSettlements(this.page, this.limit, this.statusFilter).subscribe({
      next: (res) => {
        this.settlements = res.data.settlements;
        this.summary = res.data.summary;
        this.total = res.data.pagination.total;
        this.page = res.data.pagination.page;
        this.limit = res.data.pagination.limit;
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
        this.snackBar.open('获取账目记录失败', '关闭', { duration: 3000 });
      }
    });
  }

  onFilterChange(): void {
    this.page = 1;
    this.loadSettlements();
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages) {
      return;
    }

    this.page = page;
    this.loadSettlements();
  }

  get totalPages(): number {
    return Math.ceil(this.total / this.limit) || 1;
  }

  getStatusText(status: SettlementStatus): string {
    const map: Record<SettlementStatus, string> = {
      pending: '待结算',
      paid: '已结算',
      disputed: '争议中'
    };

    return map[status] || status;
  }

  getStatusClass(status: SettlementStatus): string {
    const map: Record<SettlementStatus, string> = {
      pending: 'bg-orange-100 text-orange-700',
      paid: 'bg-green-100 text-green-700',
      disputed: 'bg-red-100 text-red-700'
    };

    return map[status] || 'bg-gray-100 text-gray-700';
  }

  formatAmount(amount?: number | string | null): string {
    const value = Number(amount || 0);
    return `¥${value.toFixed(2)}`;
  }

  formatAmountWithType(record: SettlementRecord): string {
    const map: Record<string, string> = {
      hourly: '时薪',
      daily: '日薪',
      weekly: '周薪',
      monthly: '月薪'
    };

    return `${map[record.salaryType] || '薪资'} ${this.formatAmount(record.amount)}`;
  }

  formatDate(dateStr?: string | null): string {
    if (!dateStr) {
      return '-';
    }

    const d = new Date(dateStr);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
}
