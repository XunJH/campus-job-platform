import { Injectable } from '@angular/core';
import { 
  CanActivate, 
  ActivatedRouteSnapshot, 
  RouterStateSnapshot, 
  Router 
} from '@angular/router';
import { AuthService } from '../services/auth.service';
import { UserRole } from '../../models/user.model';

/**
 * @功能 认证路由守卫
 * @说明 保护需要登录才能访问的页面
 */
@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {
  
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  /**
   * @功能 判断是否允许访问路由
   * @参数 route - 目标路由信息
   * @参数 state - 当前路由状态
   * @返回 boolean - true 允许访问，false 重定向到登录页
   */
  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): boolean {
    const isAuthenticated = this.authService.isAuthenticated();
    
    if (!isAuthenticated) {
      // 未登录，跳转到登录页，并记录原目标地址
      this.router.navigate(['/auth/login'], {
        queryParams: { returnUrl: state.url }
      });
      return false;
    }

    // 检查角色权限（如果有配置）
    const requiredRole = route.data['role'] as UserRole;
    if (requiredRole) {
      const currentUser = this.authService.getCurrentUser();
      if (currentUser?.role !== requiredRole) {
        // 角色不匹配，跳转到无权限页面
        this.router.navigate(['/forbidden']);
        return false;
      }
    }

    return true;
  }
}