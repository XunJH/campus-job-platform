import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-placeholder',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div style="text-align:center; padding: 80px 20px;">
      <h1 style="font-size: 48px; color: #64748b; margin: 0;">🚧</h1>
      <p style="font-size: 18px; color: rgba(0,0,0,0.6); margin-top: 16px;">功能开发中，敬请期待</p>
      <a routerLink="/" style="display:inline-block; margin-top:16px; padding:10px 24px; background:#111827; color:#fff; border-radius:9999px; text-decoration:none;">返回首页</a>
    </div>
  `
})
export class PlaceholderComponent {}
