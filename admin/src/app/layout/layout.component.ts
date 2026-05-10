import { Component } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs/operators';
import { AuthService } from '../core/services/auth.service';

interface NavItem {
  path: string;
  label: string;
  icon: string;
}

@Component({
  selector: 'app-layout',
  templateUrl: './layout.component.html',
  styleUrls: ['./layout.component.scss']
})
export class LayoutComponent {
  navItems: NavItem[] = [
    { path: '/dashboard', label: '数据概览', icon: 'dashboard' },
    { path: '/users', label: '用户管理', icon: 'people' },
    { path: '/verification-review', label: '认证审核', icon: 'verified' },
    { path: '/jobs', label: '职位管理', icon: 'work' },
    { path: '/settlements', label: '账目查询', icon: 'payments' }
  ];

  username = '';
  pageTitle = '数据概览';

  constructor(
    private authService: AuthService,
    private router: Router
  ) {
    this.username = this.authService.getUser()?.username || '管理员';
    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe(() => {
        this.pageTitle = this.resolveTitle();
      });
  }

  private resolveTitle(): string {
    const url = this.router.url;
    const item = this.navItems.find((navItem) => url.startsWith(navItem.path));
    return item ? item.label : '管理后台';
  }

  getTitle(): string {
    return this.pageTitle;
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
