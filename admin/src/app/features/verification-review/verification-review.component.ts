import { Component, OnInit } from '@angular/core';
import { PageEvent } from '@angular/material/paginator';
import { MatSnackBar } from '@angular/material/snack-bar';
import { forkJoin } from 'rxjs';
import { AdminVerificationService } from '../../core/services/admin-verification.service';

@Component({
  selector: 'app-verification-review',
  templateUrl: './verification-review.component.html',
  styleUrls: ['./verification-review.component.scss']
})
export class VerificationReviewComponent implements OnInit {
  list: any[] = [];
  total = 0;
  page = 1;
  limit = 10;
  statusFilter = '';
  isLoading = false;
  searchText = '';
  expandedItem: any | null = null;
  aiAuditLoading = false;
  aiAuditDetail: any = null;
  rejectionInputs: Record<number, string> = {};

  pendingCount = 0;
  approvedCount = 0;

  recentActivities = [
    { action: 'approve', title: '通过了 Acme Corp 的认证申请', time: '15 分钟前', icon: 'check_circle' },
    { action: 'reject', title: '拒绝了 Ghost Tech 的认证申请', time: '45 分钟前', icon: 'cancel' },
  ];

  constructor(private verificationService: AdminVerificationService, private snackBar: MatSnackBar) {}

  ngOnInit(): void {
    this.loadStats();
    this.loadList();
  }

  loadStats(): void {
    forkJoin({
      pending: this.verificationService.getPendingList(1, 1),
      all: this.verificationService.getAll(1, 100)
    }).subscribe({
      next: ({ pending, all }) => {
        this.pendingCount = pending.data.pagination.total;
        this.approvedCount = all.data.list.filter((v: any) => v.status === 'approved').length;
      },
      error: () => {}
    });
  }

  loadList(): void {
    this.isLoading = true;
    this.verificationService.getAll(this.page, this.limit, this.statusFilter || undefined, this.searchText || undefined).subscribe({
      next: (res) => {
        this.list = res.data.list || [];
        this.total = res.data.pagination.total;
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
        this.snackBar.open('获取认证列表失败', '关闭', { duration: 3000 });
      }
    });
  }

  onPageChange(event: PageEvent): void {
    this.page = event.pageIndex + 1;
    this.limit = event.pageSize;
    this.loadList();
  }

  goToPage(p: number): void {
    this.page = p;
    this.loadList();
  }

  get totalPages(): number {
    return Math.ceil(this.total / this.limit) || 1;
  }

  onFilterChange(): void {
    this.page = 1;
    this.loadList();
  }

  onSearch(): void {
    this.page = 1;
    this.loadList();
  }

  approve(item: any): void {
    if (confirm(`确定通过 "${item.companyName || item.user?.username || ''}" 的实名认证申请？`)) {
      this.verificationService.approve(item.id).subscribe({
        next: () => {
          this.snackBar.open('已通过认证', '关闭', { duration: 3000 });
          this.loadList();
          this.loadStats();
        },
        error: () => {
          this.snackBar.open('操作失败', '关闭', { duration: 3000 });
        }
      });
    }
  }

  reject(item: any): void {
    const reason = this.rejectionInputs[item.id] || prompt(`请输入拒绝 "${item.companyName || item.user?.username || ''}" 认证申请的理由：`);
    if (reason === null) return;
    const trimmedReason = (reason || '资料不符合要求').trim();
    if (!trimmedReason) {
      this.snackBar.open('拒绝原因不能为空', '关闭', { duration: 3000 });
      return;
    }
    this.verificationService.reject(item.id, trimmedReason).subscribe({
      next: () => {
        this.snackBar.open('已拒绝认证', '关闭', { duration: 3000 });
        this.rejectionInputs[item.id] = '';
        this.loadList();
        this.loadStats();
      },
      error: (err) => {
        const msg = err.error?.message || err.error?.errors?.[0]?.msg || '操作失败';
        this.snackBar.open(msg, '关闭', { duration: 3000 });
      }
    });
  }

  getStatusText(status: string): string {
    const map: Record<string, string> = { pending: '待审核', approved: '已通过', rejected: '已拒绝' };
    return map[status] || status;
  }

  getStatusClass(status: string): string {
    const map: Record<string, string> = {
      pending: 'bg-orange-100 text-orange-700',
      approved: 'bg-green-100 text-green-700',
      rejected: 'bg-red-100 text-red-700',
    };
    return map[status] || 'bg-gray-100 text-gray-700';
  }

  getAiRiskLevel(item: any): string {
    return item.aiAuditResult?.risk_level || '-';
  }

  getAiRiskClass(item: any): string {
    const level = item.aiAuditResult?.risk_level;
    if (level === 'high') return 'bg-red-100 text-red-700';
    if (level === 'medium') return 'bg-orange-100 text-orange-700';
    if (level === 'low') return 'bg-green-100 text-green-700';
    return 'bg-gray-100 text-gray-700';
  }

  getAiRiskLabel(item: any): string {
    const level = item.aiAuditResult?.risk_level;
    if (level === 'high') return '高风险';
    if (level === 'medium') return '中风险';
    if (level === 'low') return '低风险';
    return '未检测';
  }

  toggleExpand(item: any): void {
    if (this.expandedItem && this.expandedItem.id === item.id) {
      this.expandedItem = null;
      this.aiAuditDetail = null;
      return;
    }
    this.expandedItem = item;
    this.aiAuditDetail = item.aiAuditResult || null;
    if (!this.aiAuditDetail) {
      this.loadAiAudit(item.id);
    }
  }

  loadAiAudit(id: number): void {
    this.aiAuditLoading = true;
    this.verificationService.getAiAudit(id).subscribe({
      next: (res) => {
        this.aiAuditLoading = false;
        this.aiAuditDetail = res.data?.aiAuditResult || null;
      },
      error: () => {
        this.aiAuditLoading = false;
        this.aiAuditDetail = null;
      }
    });
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  timeAgo(dateStr: string): string {
    if (!dateStr) return '';
    const diff = Date.now() - new Date(dateStr).getTime();
    const hours = Math.floor(diff / 3600000);
    if (hours < 1) return '刚刚';
    if (hours < 24) return `${hours} 小时前`;
    return `${Math.floor(hours / 24)} 天前`;
  }
}
