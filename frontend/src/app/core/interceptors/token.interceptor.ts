import { HttpInterceptorFn } from '@angular/common/http';
import { catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';
import { Router } from '@angular/router';
import { inject } from '@angular/core';

/**
 * @功能 Token 拦截器
 * @说明 自动为需要认证的请求附加 Authorization Header，处理 401 跳转登录
 */
export const tokenInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const token = localStorage.getItem('campus_job_token');
  
  if (token) {
    req = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }
  
  return next(req).pipe(
    catchError(error => {
      if (error.status === 401) {
        localStorage.removeItem('campus_job_token');
        router.navigate(['/auth/login']);
      }
      return throwError(() => error);
    })
  );
};
