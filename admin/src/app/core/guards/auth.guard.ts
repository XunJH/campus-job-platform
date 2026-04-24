import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { map, catchError, of } from 'rxjs';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // 先尝试从本地获取 token
  const token = authService.getToken();
  if (!token) {
    return router.createUrlTree(['/login']);
  }

  // 异步调用后端验证身份和角色
  return authService.getProfile().pipe(
    map((res: any) => {
      const user = res?.data;
      if (user && user.role === 'admin') {
        // 同步更新本地缓存的用户信息
        authService.setUser(user);
        return true;
      }
      return router.createUrlTree(['/login']);
    }),
    catchError(() => {
      authService.logout();
      return of(router.createUrlTree(['/login']));
    })
  );
};
