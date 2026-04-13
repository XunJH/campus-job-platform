import { HttpInterceptorFn } from '@angular/common/http';

/**
 * @功能 Token 拦截器
 * @说明 自动为需要认证的请求附加 Authorization Header
 */
export const tokenInterceptor: HttpInterceptorFn = (req, next) => {
  const token = localStorage.getItem('campus_job_token');
  
  if (token) {
    req = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }
  
  return next(req);
};
