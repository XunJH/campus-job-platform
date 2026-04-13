import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

/**
 * @功能 根组件
 * @说明 应用的入口组件，包含路由出口
 */
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: `<router-outlet></router-outlet>`,
  styles: []
})
export class AppComponent {
  title = 'campus-job-platform';
}