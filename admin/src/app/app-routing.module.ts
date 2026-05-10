import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { LoginComponent } from './features/auth/login.component';
import { DashboardComponent } from './features/dashboard/dashboard.component';
import { JobsComponent } from './features/jobs/jobs.component';
import { NotFoundComponent } from './features/not-found/not-found.component';
import { SettlementsComponent } from './features/settlements/settlements.component';
import { UsersComponent } from './features/users/users.component';
import { VerificationDetailComponent } from './features/verification-review/verification-detail.component';
import { VerificationReviewComponent } from './features/verification-review/verification-review.component';
import { LayoutComponent } from './layout/layout.component';

const routes: Routes = [
  {
    path: 'login',
    component: LoginComponent,
    title: 'Login'
  },
  {
    path: '',
    component: LayoutComponent,
    canActivate: [authGuard],
    children: [
      { path: 'dashboard', component: DashboardComponent, title: '数据概览' },
      { path: 'users', component: UsersComponent, title: '用户管理' },
      { path: 'verification-review', component: VerificationReviewComponent, title: '认证审核' },
      { path: 'verification-review/:id', component: VerificationDetailComponent, title: '认证详情' },
      { path: 'jobs', component: JobsComponent, title: '职位管理' },
      { path: 'settlements', component: SettlementsComponent, title: '账目查询' },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
    ]
  },
  {
    path: '**',
    component: NotFoundComponent,
    title: 'Not Found'
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule {}
