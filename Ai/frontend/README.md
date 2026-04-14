# 校园智能兼职平台 - Angular前端

## 项目简介

这是一个基于 Angular 的校园智能兼职平台前端项目，提供AI人格画像、智能匹配、AI对话助手等功能。

## 技术栈

- **框架**: Angular 17+
- **HTTP**: HttpClient
- **样式**: SCSS / CSS

## 快速开始

### 1. 创建项目（如果你还没有）

```bash
npm install -g @angular/cli
ng new frontend --routing --style=scss
cd frontend
```

### 2. 安装依赖

```bash
npm install
```

### 3. 配置HttpClient

在 `app.config.ts` 中添加：

```typescript
import { provideHttpClient } from '@angular/common/http';

export const appConfig: ApplicationConfig = {
  providers: [
    provideHttpClient()
  ]
};
```

### 4. 创建服务和组件

把 `src/app/services/` 下的服务文件复制到你的项目中。

把 `src/app/components/` 下的组件文件复制到你的项目中。

### 5. 在模块中导入服务

```typescript
// app.module.ts
import { HttpClientModule } from '@angular/common/http';

@NgModule({
  imports: [
    HttpClientModule
  ]
})
export class AppModule { }
```

### 6. 在组件中使用服务

```typescript
// example.component.ts
import { Component } from '@angular/core';
import { PersonalityService } from './services/personality.service';

@Component({
  selector: 'app-example',
  template: '<button (click)="loadData()">加载</button>'
})
export class ExampleComponent {
  constructor(private personalityService: PersonalityService) {}

  loadData() {
    this.personalityService.getQuestionnaire().subscribe(response => {
      console.log(response);
    });
  }
}
```

## 已实现的功能

### 1. AI人格画像
- 获取测试问卷
- 提交答案获取分析结果
- 展示性格标签、维度分析、优劣势

### 2. 智能岗位匹配
- 获取所有岗位列表
- 根据人格画像智能推荐岗位
- 显示匹配度、匹配理由

### 3. AI对话助手
- 和AI助手聊天
- 多轮对话支持
- 意图识别

## 文件结构

```
frontend/
├── src/
│   └── app/
│       ├── services/          # API服务
│       │   ├── personality.service.ts
│       │   ├── matching.service.ts
│       │   └── chat.service.ts
│       └── components/        # 页面组件
│           ├── personality-result/
│           └── chat-assistant/
```

## 学习建议

1. **先看服务层**：`services/` 下的文件定义了和后端API的交互方式
2. **再看组件层**：理解如何调用服务、处理数据、渲染界面
3. **动手实践**：尝试修改代码，看看效果有什么变化
