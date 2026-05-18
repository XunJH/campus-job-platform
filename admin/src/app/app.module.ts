import { HttpClientModule } from '@angular/common/http';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { CoreModule } from './core/core.module';
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

@NgModule({
  declarations: [
    AppComponent,
    LoginComponent,
    LayoutComponent,
    DashboardComponent,
    ReportsComponent,
    PlatformSettingsComponent,
    RiskCenterComponent,
    NotificationsComponent,
    AdminOperationLogsComponent,
    TicketsComponent,
    UsersComponent,
    VerificationReviewComponent,
    VerificationDetailComponent,
    JobsComponent,
    SettlementsComponent,
    NotFoundComponent
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    FormsModule,
    ReactiveFormsModule,
    HttpClientModule,
    AppRoutingModule,
    CoreModule,
    MatTableModule,
    MatPaginatorModule,
    MatSnackBarModule,
    MatIconModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule {}
