import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { LoginComponent } from './features/auth/login.component';
import { RegisterComponent } from './features/auth/register.component';
import { UsersComponent } from './features/users/users.component';
import { RolesComponent } from './features/roles/roles.component';
import { AuthGuard } from './core/guards/auth.guard';

const routes: Routes = [
  {
    path: 'login',
    component: LoginComponent,
    title: '管理员登录'
  },
  {
    path: 'register',
    component: RegisterComponent,
    title: '管理员注册'
  },
  {
    path: 'users',
    component: UsersComponent,
    title: '用户管理',
    canActivate: [AuthGuard]
  },
  {
    path: 'roles',
    component: RolesComponent,
    title: '角色管理',
    canActivate: [AuthGuard]
  },
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full'
  },
  {
    path: '**',
    redirectTo: 'login'
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
