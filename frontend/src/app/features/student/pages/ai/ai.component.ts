import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../../core/services/auth.service';
import { AiApiService } from '../../../../core/services/ai-api.service';
import { PersonalityProfileService } from '../../../../core/services/personality-profile.service';

/**
 * @功能 学生端 AI 人格画像页面
 * @说明 专为人格测评设计，回答10道题后AI生成性格画像和岗位推荐
 */
@Component({
  selector: 'app-student-ai',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './ai.component.html',
  styleUrls: ['./ai.component.scss']
})
export class StudentAiComponent implements OnInit {
  /** ===== 性格测评 ===== */
  questionnaire: any[] = [];
  currentQuestionIndex = 0;
  answers: number[] = [];
  testCompleted = false;
  testLoading = false;
  personalityResult: any = null;

  /** ===== 正向推荐 ===== */
  recommendations: any[] = [];
  recommendLoading = false;

  constructor(
    private authService: AuthService,
    private aiApi: AiApiService,
    private personalityProfileService: PersonalityProfileService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.loadQuestionnaire();
  }

  /** 获取当前用户ID */
  private getUserId(): string {
    const user = this.authService.getCurrentUser();
    return user?.id || 'guest';
  }

  /** 重置测评 */
  resetTest(): void {
    this.testCompleted = false;
    this.currentQuestionIndex = 0;
    this.answers = new Array(this.questionnaire.length).fill(0);
    this.personalityResult = null;
    this.recommendations = [];
  }

  // ==================== 性格测评 ====================

  loadQuestionnaire(): void {
    this.aiApi.getQuestionnaire().subscribe({
      next: (res) => {
        const questions = res.data?.questions || [];
        // 防御：如果后端返回空数组，使用本地默认问卷
        this.questionnaire = questions.length > 0 ? questions : this.getDefaultQuestionnaire();
        this.answers = new Array(this.questionnaire.length).fill(0);
      },
      error: () => {
        this.questionnaire = this.getDefaultQuestionnaire();
        this.answers = new Array(this.questionnaire.length).fill(0);
      }
    });
  }

  /** 默认问卷（后端不可用时的备选） */
  private getDefaultQuestionnaire(): any[] {
    return [
      { id: 1, question: '周末你更喜欢：', options: [{ text: '约朋友一起出去玩' }, { text: '参加聚会或社交活动' }, { text: '一个人安静地待着' }, { text: '在家看书或看电影' }] },
      { id: 2, question: '当老师/老板布置了一个任务，你会：', options: [{ text: '提前完成，还主动优化' }, { text: '按时完成，保证质量' }, { text: '拖到最后一天才做' }, { text: '经常忘记或拖延' }] },
      { id: 3, question: '面对一个新问题，你通常会：', options: [{ text: '尝试完全不同的方法' }, { text: '参考别人做法再改进' }, { text: '用最常规的方法解决' }, { text: '等待别人来解决' }] },
      { id: 4, question: '当和同事/同学发生矛盾时，你会：', options: [{ text: '主动沟通，寻求双赢' }, { text: '冷静分析后协商解决' }, { text: '尽量避免冲突' }, { text: '生气或冷战' }] },
      { id: 5, question: '当deadline提前了一天，你会：', options: [{ text: '冷静调整计划，高效完成' }, { text: '有点紧张但能应对' }, { text: '感到焦虑，手忙脚乱' }, { text: '崩溃，不知道怎么办' }] },
      { id: 6, question: '你平时如何安排兼职和学习的时间？', options: [{ text: '提前规划，严格执行' }, { text: '有个大概计划，灵活调整' }, { text: '走一步看一步' }, { text: '经常顾此失彼' }] },
      { id: 7, question: '和新认识的同事/同学交流，你感觉：', options: [{ text: '很自然，很快就熟络' }, { text: '需要一点时间适应' }, { text: '有点紧张，不太主动' }, { text: '很不自在，尽量少说话' }] },
      { id: 8, question: '学习一项新技能时，你通常：', options: [{ text: '主动研究，不懂就查资料' }, { text: '跟着教程一步步学' }, { text: '需要别人手把手教' }, { text: '学不会就放弃了' }] },
      { id: 9, question: '你找兼职的主要目的是：', options: [{ text: '积累经验，为未来打基础' }, { text: '赚零花钱，顺便学东西' }, { text: '主要为了赚钱' }, { text: '打发时间' }] },
      { id: 10, question: '工作时手机来了消息，你会：', options: [{ text: '先专注工作，稍后回复' }, { text: '看一眼，简单回复后继续工作' }, { text: '忍不住回复，导致工作拖沓' }, { text: '直接玩手机忘了工作' }] }
    ];
  }

  get currentQuestion(): any {
    return this.questionnaire[this.currentQuestionIndex] || null;
  }

  selectAnswer(optionIndex: number): void {
    this.answers[this.currentQuestionIndex] = optionIndex + 1;
  }

  nextQuestion(): void {
    if (this.currentQuestionIndex < this.questionnaire.length - 1) {
      this.currentQuestionIndex++;
    }
  }

  prevQuestion(): void {
    if (this.currentQuestionIndex > 0) {
      this.currentQuestionIndex--;
    }
  }

  submitTest(): void {
    this.testLoading = true;
    // AI 后端期望 selected_option 为选项索引 0~3
    const answers = this.answers.map((score, index) => ({
      question_id: index + 1,
      selected_option: score - 1
    }));

    this.aiApi.analyzePersonality(this.getUserId(), answers).subscribe({
      next: (res) => {
        this.personalityResult = res.data;
        this.testCompleted = true;
        this.testLoading = false;
        // 保存人格画像到 campus_job_api 数据库
        this.savePersonalityProfile(res.data);
        this.getRecommendations();
      },
      error: () => {
        this.testLoading = false;
        // fallback 数据也保存，避免用户白做
        const fallbackProfile = {
          tags: ['细心', '认真', '逻辑强'],
          strengths: ['学习能力强', '做事认真', '善于分析'],
          weaknesses: ['可能不太擅长社交'],
          suitable_jobs: ['数据标注', '图书馆助理', '家教']
        };
        this.personalityResult = fallbackProfile;
        this.testCompleted = true;
        this.savePersonalityProfile(fallbackProfile);
        this.getRecommendations();
      }
    });
  }

  /** 保存人格画像到后端 */
  private savePersonalityProfile(profile: any): void {
    this.personalityProfileService.submit(profile).subscribe({
      next: () => {
        // 更新本地用户状态
        const user = this.authService.getCurrentUser();
        if (user) {
          this.authService.updateCurrentUser({
            ...user,
            personalityProfileCompletedAt: new Date().toISOString(),
            personalityProfile: profile
          });
        }
      },
      error: (err) => {
        console.error('保存人格画像失败:', err);
      }
    });
  }

  // ==================== 正向推荐 ====================

  getRecommendations(): void {
    if (!this.personalityResult) return;
    this.recommendLoading = true;

    this.aiApi.recommendJobs(this.getUserId(), this.personalityResult, 5).subscribe({
      next: (res) => {
        this.recommendations = res.data?.recommendations || [];
        this.recommendLoading = false;
      },
      error: () => {
        this.recommendLoading = false;
      }
    });
  }

  // ==================== 退出登录 ====================

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/auth/login']);
  }
}
