import { Component, OnInit } from '@angular/core';
import { PageEvent } from '@angular/material/paginator';
import { MatSnackBar } from '@angular/material/snack-bar';
import { UserService } from '../../core/services/user.service';
import { User } from '../../models/user.model';

@Component({
  selector: 'app-users',
  templateUrl: './users.component.html',
  styleUrls: ['./users.component.scss']
})
export class UsersComponent implements OnInit {
  users: User[] = [];
  total = 0;
  page = 1;
  limit = 10;
  isLoading = false;
  searchText = '';
  roleFilter = '';
  statusFilter = '';

  // Stats
  totalUsers = 0;
  activeStudents = 0;
  employerPartners = 0;
  pendingApprovals = 0;

  recentActivities = [
    { action: 'success', title: '系统管理员', desc: '批量启用了 42 个学生账号', time: '12:45', color: 'bg-green-500' },
    { action: 'warning', title: '安全警报', desc: '检测到管理员账号异常登录尝试', time: '10:12', color: 'bg-orange-500' },
    { action: 'info', title: '系统更新', desc: '数据库同步成功完成', time: '08:00', color: 'bg-blue-500' },
  ];

  constructor(private userService: UserService, private snackBar: MatSnackBar) {}

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(): void {
    this.isLoading = true;
    this.userService.getUsers(this.page, this.limit, this.searchText || undefined).subscribe({
      next: (res) => {
        this.users = res.users;
        this.total = res.total;
        this.isLoading = false;
        this.computeStats(res.users);
      },
      error: () => {
        this.isLoading = false;
        this.snackBar.open('获取用户列表失败', '关闭', { duration: 3000 });
      }
    });
  }

  computeStats(users: User[]): void {
    this.totalUsers = this.total;
    this.activeStudents = users.filter(u => u.role === 'student' && u.status === 'active').length;
    this.employerPartners = users.filter(u => u.role === 'employer').length;
    this.pendingApprovals = users.filter(u => u.status === 'inactive').length;
  }

  onPageChange(event: PageEvent): void {
    this.page = event.pageIndex + 1;
    this.limit = event.pageSize;
    this.loadUsers();
  }

  goToPage(p: number): void {
    this.page = p;
    this.loadUsers();
  }

  get totalPages(): number {
    return Math.ceil(this.total / this.limit) || 1;
  }

  onSearch(): void {
    this.page = 1;
    this.loadUsers();
  }

  onFilterChange(): void {
    this.page = 1;
    this.loadUsers();
  }

  get filteredUsers(): User[] {
    let result = this.users;
    if (this.roleFilter) {
      result = result.filter(u => u.role === this.roleFilter);
    }
    if (this.statusFilter) {
      result = result.filter(u => u.status === this.statusFilter);
    }
    return result;
  }

  toggleStatus(user: User): void {
    const newStatus = user.status === 'active' ? 'inactive' : 'active';
    this.userService.updateUserStatus(user.id, newStatus).subscribe({
      next: (res) => {
        const index = this.users.findIndex(u => u.id === user.id);
        if (index !== -1) {
          this.users[index] = res.user;
          this.users = [...this.users];
        }
        this.snackBar.open('用户状态已更新', '关闭', { duration: 3000 });
      },
      error: () => {
        this.snackBar.open('更新用户状态失败', '关闭', { duration: 3000 });
      }
    });
  }

  deleteUser(userId: number, username: string): void {
    if (confirm(`确定要删除用户 "${username}" 吗？`)) {
      this.userService.deleteUser(userId).subscribe({
        next: () => {
          this.snackBar.open('用户已删除', '关闭', { duration: 3000 });
          this.loadUsers();
        },
        error: () => {
          this.snackBar.open('删除用户失败', '关闭', { duration: 3000 });
        }
      });
    }
  }

  getRoleText(role: string): string {
    const map: Record<string, string> = { student: '学生', employer: '企业', admin: '管理员' };
    return map[role] || role;
  }

  getRoleClass(role: string): string {
    const map: Record<string, string> = {
      student: 'bg-blue-50 text-blue-700 border border-blue-100',
      employer: 'bg-purple-50 text-purple-700 border border-purple-100',
      admin: 'bg-orange-50 text-orange-700 border border-orange-100',
    };
    return map[role] || 'bg-gray-50 text-gray-700 border border-gray-100';
  }

  getStatusClass(status: string): string {
    const map: Record<string, string> = {
      active: 'bg-green-50 text-green-700 border border-green-100',
      inactive: 'bg-slate-100 text-slate-500 border border-slate-200',
      banned: 'bg-red-50 text-red-700 border border-red-100',
    };
    return map[status] || 'bg-gray-50 text-gray-700 border border-gray-100';
  }

  getStatusText(status: string): string {
    const map: Record<string, string> = { active: '正常', inactive: '禁用', banned: '封禁' };
    return map[status] || status;
  }

  formatDate(dateStr: string | undefined): string {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
}
