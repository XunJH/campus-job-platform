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
  displayedColumns: string[] = ['id', 'username', 'email', 'role', 'status', 'actions'];
  users: User[] = [];
  total = 0;
  page = 1;
  limit = 10;
  isLoading = false;
  searchText = '';

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
      },
      error: () => {
        this.isLoading = false;
        this.snackBar.open('获取用户列表失败', '关闭', { duration: 3000 });
      }
    });
  }

  onPageChange(event: PageEvent): void {
    this.page = event.pageIndex + 1;
    this.limit = event.pageSize;
    this.loadUsers();
  }

  onSearch(): void {
    this.page = 1;
    this.loadUsers();
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
        this.snackBar.open(`用户状态已更新`, '关闭', { duration: 3000 });
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

  getStatusClass(status: string): string {
    const map: Record<string, string> = {
      active: 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700',
      inactive: 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-50 text-orange-700',
      banned: 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700',
    };
    return map[status] || 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700';
  }

  getStatusText(status: string): string {
    const map: Record<string, string> = { active: '正常', inactive: '禁用', banned: '封禁' };
    return map[status] || status;
  }
}
