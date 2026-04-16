import { Component } from '@angular/core';

@Component({
  selector: 'app-not-found',
  template: `
    <div class="min-h-screen flex flex-col items-center justify-center text-center bg-gray-50 px-4">
      <div class="text-[120px] font-bold text-gray-900 leading-none tracking-tighter">404</div>
      <h1 class="mt-4 text-2xl font-semibold text-gray-900">页面未找到</h1>
      <p class="mt-2 text-gray-500 mb-6">抱歉，您访问的页面不存在或已被移除。</p>
      <a
        routerLink="/dashboard"
        class="inline-flex items-center justify-center h-10 px-6 rounded-full bg-gray-900 text-white text-sm font-medium hover:bg-black transition-colors"
      >
        返回首页
      </a>
    </div>
  `,
  styles: []
})
export class NotFoundComponent {}
