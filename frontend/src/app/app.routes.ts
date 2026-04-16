import { Routes } from '@angular/router';
import { AuthGuard } from './core/guards/auth.guard';

/**
 * 应用路由配置
 */
export const routes: Routes = [
  {
    path: '',
    redirectTo: '/auth/login',
    pathMatch: 'full'
  },
  {
    path: 'student/jobs',
    loadComponent: () => import('./features/student/pages/jobs/jobs.component').then(c => c.JobsComponent),
    canActivate: [AuthGuard]
  },
  {
    path: 'student/profile',
    loadComponent: () => import('./features/student/pages/profile/profile.component').then(c => c.ProfileComponent),
    canActivate: [AuthGuard]
  },
  {
    path: 'student/verification',
    loadComponent: () => import('./features/certification/pages/verification/verification.component').then(c => c.VerificationComponent),
    canActivate: [AuthGuard]
  },
  {
    path: 'student/applications',
    loadComponent: () => import('./features/placeholder/placeholder.component').then(c => c.PlaceholderComponent),
    canActivate: [AuthGuard]
  },
  {
    path: 'student/favorites',
    loadComponent: () => import('./features/placeholder/placeholder.component').then(c => c.PlaceholderComponent),
    canActivate: [AuthGuard]
  },
  {
    path: 'student/resume',
    loadComponent: () => import('./features/placeholder/placeholder.component').then(c => c.PlaceholderComponent),
    canActivate: [AuthGuard]
  },
  {
    path: 'student/wallet',
    loadComponent: () => import('./features/placeholder/placeholder.component').then(c => c.PlaceholderComponent),
    canActivate: [AuthGuard]
  },
  {
    path: 'employer/dashboard',
    loadComponent: () => import('./features/employer/pages/dashboard/dashboard.component').then(c => c.EmployerDashboardComponent),
    canActivate: [AuthGuard]
  },
  {
    path: 'employer/profile',
    loadComponent: () => import('./features/employer/pages/profile/profile.component').then(c => c.EmployerProfileComponent),
    canActivate: [AuthGuard]
  },
  {
    path: 'employer/jobs/post',
    loadComponent: () => import('./features/employer/pages/post-job/post-job.component').then(c => c.PostJobComponent),
    canActivate: [AuthGuard]
  },
  {
    path: 'auth',
    loadChildren: () => import('./features/auth/auth/auth.module').then(m => m.AuthModule)
  },
  {
    path: 'forbidden',
    loadComponent: () => import('./features/not-found/not-found.component').then(c => c.NotFoundComponent)
  },
  {
    path: '**',
    loadComponent: () => import('./features/not-found/not-found.component').then(c => c.NotFoundComponent)
  }
];
