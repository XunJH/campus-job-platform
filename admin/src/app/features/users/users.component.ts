import { Component, OnInit, ViewChild } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
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
  dataSource: MatTableDataSource<User>;
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  constructor(private userService: UserService, private snackBar: MatSnackBar) {
    this.dataSource = new MatTableDataSource<User>();
  }

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(): void {
    this.userService.getUsers().subscribe(
      (response) => {
        this.dataSource.data = response.users;
        this.dataSource.paginator = this.paginator;
        this.dataSource.sort = this.sort;
      },
      (error) => {
        this.snackBar.open('获取用户列表失败', '关闭', { duration: 3000 });
      }
    );
  }

  viewUser(user: User): void {
    // 可以实现查看用户详情的功能
    console.log('View user:', user);
  }

  toggleStatus(user: User): void {
    const newStatus = user.status === 'active' ? 'inactive' : 'active';
    this.userService.updateUserStatus(user.id, newStatus).subscribe(
      (updatedUser) => {
        const index = this.dataSource.data.findIndex(u => u.id === user.id);
        if (index !== -1) {
          this.dataSource.data[index] = updatedUser;
          this.dataSource.data = [...this.dataSource.data];
        }
        this.snackBar.open(`用户 ${user.username} 状态已更新为 ${newStatus === 'active' ? '活跃' : '非活跃'}`, '关闭', { duration: 3000 });
      },
      (error) => {
        this.snackBar.open('更新用户状态失败', '关闭', { duration: 3000 });
      }
    );
  }

  deleteUser(userId: number): void {
    if (confirm('确定要删除这个用户吗？')) {
      this.userService.deleteUser(userId).subscribe(
        () => {
          this.dataSource.data = this.dataSource.data.filter(user => user.id !== userId);
          this.snackBar.open('用户已删除', '关闭', { duration: 3000 });
        },
        (error) => {
          this.snackBar.open('删除用户失败', '关闭', { duration: 3000 });
        }
      );
    }
  }
}
