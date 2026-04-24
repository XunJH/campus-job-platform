import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AdminVerificationService, Verification } from '../../core/services/admin-verification.service';

@Component({
  selector: 'app-verification-detail',
  templateUrl: './verification-detail.component.html',
  styleUrls: ['./verification-detail.component.scss']
})
export class VerificationDetailComponent implements OnInit {
  verification: Verification | null = null;
  pendingList: Verification[] = [];
  isLoading = false;
  aiAuditLoading = false;
  aiAuditDetail: any = null;
  rejectionReason = '';
  selectedId: number | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private verificationService: AdminVerificationService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.selectedId = +id;
      this.loadDetail(+id);
    }
    this.loadPendingList();
  }

  loadDetail(id: number): void {
    this.isLoading = true;
    this.verificationService.getVerificationDetail(id).subscribe({
      next: (res) => {
        this.verification = res.data;
        this.rejectionReason = res.data.rejectionReason || '';
        this.isLoading = false;
        this.loadAiAudit(id);
      },
      error: () => {
        this.isLoading = false;
        this.snackBar.open('获取认证详情失败', '关闭', { duration: 3000 });
      }
    });
  }

  loadPendingList(): void {
    this.verificationService.getPendingList(1, 20).subscribe({
      next: (res) => {
        this.pendingList = res.data.list;
      },
      error: () => {}
    });
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

  selectItem(item: Verification): void {
    this.selectedId = item.id;
    this.router.navigate(['/verification-review', item.id]);
    this.loadDetail(item.id);
  }

  approve(): void {
    if (!this.verification) return;
    if (confirm(`确定通过 "${this.verification.companyName}" 的认证申请？`)) {
      this.verificationService.approve(this.verification.id).subscribe({
        next: () => {
          this.snackBar.open('已通过认证', '关闭', { duration: 3000 });
          this.loadDetail(this.verification!.id);
          this.loadPendingList();
        },
        error: () => {
          this.snackBar.open('操作失败', '关闭', { duration: 3000 });
        }
      });
    }
  }

  reject(): void {
    if (!this.verification) return;
    const reason = this.rejectionReason.trim() || '资料不符合要求';
    if (!this.rejectionReason.trim()) {
      this.snackBar.open('请填写拒绝原因', '关闭', { duration: 3000 });
      return;
    }
    this.verificationService.reject(this.verification.id, reason).subscribe({
      next: () => {
        this.snackBar.open('已拒绝认证', '关闭', { duration: 3000 });
        this.loadDetail(this.verification!.id);
        this.loadPendingList();
      },
      error: (err) => {
        const msg = err.error?.message || err.error?.errors?.[0]?.msg || '操作失败';
        this.snackBar.open(msg, '关闭', { duration: 3000 });
      }
    });
  }

  getAiRiskLabel(): string {
    const level = this.aiAuditDetail?.risk_level;
    if (level === 'high') return '高风险';
    if (level === 'medium') return '中风险';
    if (level === 'low') return '低风险';
    return '未检测';
  }

  getAiRiskClass(): string {
    const level = this.aiAuditDetail?.risk_level;
    if (level === 'high') return 'bg-red-100 text-red-700';
    if (level === 'medium') return 'bg-orange-100 text-orange-700';
    if (level === 'low') return 'bg-green-100 text-green-700';
    return 'bg-gray-100 text-gray-700';
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
