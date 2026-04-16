/**
 * 人格画像结果展示组件
 * 显示用户完成问卷后的分析结果
 */

import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { PersonalityService } from '../../services/personality.service';

@Component({
  selector: 'app-personality-result',
  template: `
    <div class="result-container">
      <h1>你的性格画像</h1>

      <!-- 性格标签展示 -->
      <div class="tags-section">
        <h2>性格标签</h2>
        <div class="tags">
          <span *ngFor="let tag of profile.tags" class="tag">
            {{ tag }}
          </span>
        </div>
      </div>

      <!-- 各维度得分雷达图 -->
      <div class="dimensions-section">
        <h2>性格维度分析</h2>
        <div class="dimensions-grid">
          <div *ngFor="let dim of dimensions" class="dimension-item">
            <div class="dimension-name">{{ dim.name }}</div>
            <div class="dimension-bar">
              <div
                class="dimension-fill"
                [style.width.%]="dim.score * 100"
              ></div>
            </div>
            <div class="dimension-score">{{ (dim.score * 100).toFixed(0) }}%</div>
          </div>
        </div>
      </div>

      <!-- 优势和不足 -->
      <div class="analysis-section">
        <div class="strengths">
          <h3>优势</h3>
          <ul>
            <li *ngFor="let s of profile.strengths">{{ s }}</li>
          </ul>
        </div>
        <div class="weaknesses">
          <h3>可以提升的地方</h3>
          <ul>
            <li *ngFor="let w of profile.weaknesses">{{ w }}</li>
          </ul>
        </div>
      </div>

      <!-- 一句话总结 -->
      <div class="summary-section">
        <h3>整体评价</h3>
        <p class="summary-text">{{ profile.summary }}</p>
      </div>

      <!-- 适合的岗位类型 -->
      <div class="jobs-section">
        <h3>适合你的岗位类型</h3>
        <div class="job-tags">
          <span *ngFor="let job of profile.suitable_jobs" class="job-tag">
            {{ job }}
          </span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .result-container {
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
    }
    .tags {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
    }
    .tag {
      background: #4CAF50;
      color: white;
      padding: 8px 16px;
      border-radius: 20px;
    }
    .dimensions-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 15px;
    }
    .dimension-item {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .dimension-bar {
      flex: 1;
      height: 8px;
      background: #e0e0e0;
      border-radius: 4px;
      overflow: hidden;
    }
    .dimension-fill {
      height: 100%;
      background: #2196F3;
      transition: width 0.3s;
    }
  `]
})
export class PersonalityResultComponent implements OnInit {
  profile: any = {
    tags: [],
    dimensions: {},
    strengths: [],
    weaknesses: [],
    suitable_jobs: [],
    summary: ''
  };

  dimensions: any[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private personalityService: PersonalityService
  ) {}

  ngOnInit() {
    // 优先从路由传递的 state 中读取人格画像数据
    const state = this.router.getCurrentNavigation()?.extras?.state as any;
    if (state?.profile) {
      this.loadProfile(state.profile);
    }
  }

  private loadProfile(data: any) {
    this.profile = data;
    // 将 dimensions 对象转为数组，供模板渲染
    this.dimensions = Object.entries(data.dimensions || {}).map(
      ([name, score]) => ({ name, score })
    );
  }
}
