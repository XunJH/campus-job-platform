import { Routes } from '@angular/router';

/**
 * @功能 应用路由配置
 * @说明 定义整个应用的路由结构，注意具体路由必须在通配符 ** 之前定义
 */
export const routes: Routes = [
  {
    path: '',
    redirectTo: '/auth/login',
    pathMatch: 'full'
  },
  {
    path: 'student/jobs',
    loadComponent: () => import('./features/student/pages/jobs/jobs.component').then(c => c.JobsComponent)
  },
  {
    path: 'student/profile',
    loadComponent: () => import('./features/student/pages/profile/profile.component').then(c => c.ProfileComponent)
  },
  {
  path: 'student/verification',
  loadComponent: () => import('./features/student/pages/verification/verification.component').then(c => c.VerificationComponent)
  },
  {
    path: 'auth',
    loadChildren: () => import('./features/auth/auth/auth.module').then(m => m.AuthModule)
  },
  {
    path: '**',
    redirectTo: '/auth/login'
  }
];