import { Component, OnInit } from '@angular/core';
import { PageEvent } from '@angular/material/paginator';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AdminVerificationService } from '../../core/services/admin-verification.service';

@Component({
  selector: 'app-verification-review',
  templateUrl: './verification-review.component.html',
  styleUrls: ['./verification-review.component.scss']
})
export class VerificationReviewComponent implements OnInit {
  displayedColumns: string[] = ['id', 'username', 'realName', 'idNumber', 'status', 'actions'];
  list: any[] = [];
  total = 0;
  page = 1;
  limit = 10;
  statusFilter = 'pending';
  isLoading = false;
  searchText = '';

  constructor(private verificationService: AdminVerificationService, private snackBar: MatSnackBar) {}

  ngOnInit(): void {
    this.loadList();
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

  onFilterChange(): void {
    this.page = 1;
    this.loadList();
  }

  onSearch(): void {
    this.page = 1;
    this.loadList();
  }

  approve(item: any): void {
    if (confirm(`确定通过 "${item.user?.username || ''}" 的实名认证申请？`)) {
      this.verificationService.approve(item.id).subscribe({
        next: () => {
          this.snackBar.open('已通过认证', '关闭', { duration: 3000 });
          this.loadList();
        },
        error: () => {
          this.snackBar.open('操作失败', '关闭', { duration: 3000 });
        }
      });
    }
  }

  reject(item: any): void {
    const reason = prompt(`请输入拒绝 "${item.user?.username || ''}" 认证申请的理由：`);
    if (reason === null) return;
    this.verificationService.reject(item.id, reason || '资料不符合要求').subscribe({
      next: () => {
        this.snackBar.open('已拒绝认证', '关闭', { duration: 3000 });
        this.loadList();
      },
      error: () => {
        this.snackBar.open('操作失败', '关闭', { duration: 3000 });
      }
    });
  }

  getStatusText(status: string): string {
    const map: Record<string, string> = { pending: '待审核', approved: '已通过', rejected: '已拒绝' };
    return map[status] || status;
  }

  getStatusClass(status: string): string {
    const map: Record<string, string> = {
      pending: 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-50 text-orange-700',
      approved: 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700',
      rejected: 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700',
    };
    return map[status] || 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700';
  }
}
