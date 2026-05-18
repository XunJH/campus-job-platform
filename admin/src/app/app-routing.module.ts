import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { AdminOperationLogsComponent } from './features/admin-operation-logs/admin-operation-logs.component';
import { LoginComponent } from './features/auth/login.component';
import { DashboardComponent } from './features/dashboard/dashboard.component';
import { JobsComponent } from './features/jobs/jobs.component';
import { NotFoundComponent } from './features/not-found/not-found.component';
import { NotificationsComponent } from './features/notifications/notifications.component';
import { PlatformSettingsComponent } from './features/platform-settings/platform-settings.component';
import { ReportsComponent } from './features/reports/reports.component';
import { RiskCenterComponent } from './features/risk-center/risk-center.component';
import { SettlementsComponent } from './features/settlements/settlements.component';
import { TicketsComponent } from './features/tickets/tickets.component';
import { UsersComponent } from './features/users/users.component';
import { VerificationDetailComponent } from './features/verification-review/verification-detail.component';
import { VerificationReviewComponent } from './features/verification-review/verification-review.component';
import { LayoutComponent } from './layout/layout.component';

const routes: Routes = [
  {
    path: 'login',
    component: LoginComponent,
    title: '管理员登录'
  },
  {
    path: '',
    component: LayoutComponent,
    canActivate: [authGuard],
    children: [
      { path: 'dashboard', component: DashboardComponent, title: '数据概览' },
      { path: 'reports', component: ReportsComponent, title: '数据导出与运营报表' },
      { path: 'platform-settings', component: PlatformSettingsComponent, title: '平台配置中心' },
      { path: 'risk-center', component: RiskCenterComponent, title: '风险监控中心' },
      { path: 'notifications', component: NotificationsComponent, title: '系统通知中心' },
      { path: 'admin-operation-logs', component: AdminOperationLogsComponent, title: '管理员操作日志' },
      { path: 'tickets', component: TicketsComponent, title: '申诉工单中心' },
      { path: 'users', component: UsersComponent, title: '用户管理' },
      { path: 'verification-review', component: VerificationReviewComponent, title: '企业认证审核' },
      { path: 'verification-review/:id', component: VerificationDetailComponent, title: '认证详情' },
      { path: 'jobs', component: JobsComponent, title: '岗位审核管理' },
      { path: 'settlements', component: SettlementsComponent, title: '账目与结算' },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
    ]
  },
  {
    path: '**',
    component: NotFoundComponent,
    title: '页面不存在'
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule {}
