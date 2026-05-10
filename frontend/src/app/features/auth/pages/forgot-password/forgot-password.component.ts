import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './forgot-password.component.html',
  styleUrls: ['./forgot-password.component.scss']
})
export class ForgotPasswordComponent {
  readonly title = '在线找回密码暂未开放';
  readonly description =
    '当前版本为了避免匿名重置风险，已关闭直接在线找回密码。你仍然可以通过登录后修改密码，或联系管理员协助处理。';

  readonly guides = [
    {
      title: '如果你还能登录',
      description: '进入个人资料页后使用“修改密码”功能，这是当前最直接也最安全的处理方式。'
    },
    {
      title: '如果你已经无法登录',
      description: '请联系管理员或项目维护者协助重置密码，并同步确认你的账号邮箱和联系方式。'
    },
    {
      title: '当前安全说明',
      description: '系统已经下线匿名重置密码能力，避免未经验证直接修改密码带来的安全风险。'
    }
  ];
}
