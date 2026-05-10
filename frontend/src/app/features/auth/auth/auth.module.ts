import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthRoutingModule } from './auth-routing.module';

/**
 * 认证模块。
 * 负责承载登录、注册和密码帮助相关路由。
 */
@NgModule({
  declarations: [],
  imports: [CommonModule, AuthRoutingModule]
})
export class AuthModule {}
