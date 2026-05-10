import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { AiApiService } from '../../../../core/services/ai-api.service';
import { PersonalityProfileService } from '../../../../core/services/personality-profile.service';
import { StudentShellHeaderComponent } from '../../../../shared/components/student-shell-header/student-shell-header.component';

interface QuestionOption {
  text: string;
}

interface PersonalityQuestion {
  id: number;
  question: string;
  options: QuestionOption[];
}

@Component({
  selector: 'app-student-ai',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, StudentShellHeaderComponent],
  templateUrl: './ai.component.html',
  styleUrls: ['./ai.component.scss']
})
export class StudentAiComponent implements OnInit {
  questionnaire: PersonalityQuestion[] = [];
  currentQuestionIndex = 0;
  answers: number[] = [];
  testCompleted = false;
  testLoading = false;
  personalityResult: any = null;

  recommendations: any[] = [];
  recommendLoading = false;
  message = '';
  error = false;

  constructor(
    private authService: AuthService,
    private aiApi: AiApiService,
    private personalityProfileService: PersonalityProfileService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadQuestionnaire();
    this.loadSavedProfile();
  }

  private getUserId(): string {
    const user = this.authService.getCurrentUser();
    return user?.id || 'guest';
  }

  resetTest(): void {
    this.testCompleted = false;
    this.currentQuestionIndex = 0;
    this.answers = new Array(this.questionnaire.length).fill(0);
    this.recommendations = [];
    this.message = '';
    this.error = false;
  }

  loadQuestionnaire(): void {
    this.aiApi.getQuestionnaire().subscribe({
      next: (res) => {
        const questions = res.data?.questions || [];
        this.questionnaire = questions.length > 0 ? questions : this.getDefaultQuestionnaire();
        this.answers = new Array(this.questionnaire.length).fill(0);
      },
      error: () => {
        this.questionnaire = this.getDefaultQuestionnaire();
        this.answers = new Array(this.questionnaire.length).fill(0);
      }
    });
  }

  private loadSavedProfile(): void {
    this.personalityProfileService.getStatus().subscribe({
      next: (status) => {
        if (!status.completed || !status.profile?.tags?.length) {
          return;
        }

        this.personalityResult = status.profile;
        this.testCompleted = true;
        this.getRecommendations();
      },
      error: () => {}
    });
  }

  private getDefaultQuestionnaire(): PersonalityQuestion[] {
    return [
      { id: 1, question: '周末你更喜欢哪种安排？', options: [{ text: '和朋友一起外出活动' }, { text: '参加社交或聚会' }, { text: '一个人安静休息' }, { text: '在家看书或看电影' }] },
      { id: 2, question: '接到任务后，你通常会怎么做？', options: [{ text: '提前完成并主动优化' }, { text: '按时完成并保证质量' }, { text: '拖到最后再处理' }, { text: '经常忘记或拖延' }] },
      { id: 3, question: '面对新问题时，你通常会？', options: [{ text: '主动尝试不同方法' }, { text: '参考别人的做法后改进' }, { text: '用最常规的方法解决' }, { text: '等别人来处理' }] },
      { id: 4, question: '和同学或同事有分歧时，你更倾向于？', options: [{ text: '主动沟通，争取双赢' }, { text: '冷静分析后协商' }, { text: '尽量避免冲突' }, { text: '情绪化处理或回避' }] },
      { id: 5, question: 'Deadline 突然提前时，你会？', options: [{ text: '迅速调整计划并高效推进' }, { text: '会紧张，但能应对' }, { text: '容易焦虑，手忙脚乱' }, { text: '不知道该怎么处理' }] },
      { id: 6, question: '你如何安排兼职与学习时间？', options: [{ text: '提前规划并严格执行' }, { text: '有大致计划，灵活调整' }, { text: '走一步看一步' }, { text: '经常顾此失彼' }] },
      { id: 7, question: '和新认识的人交流时，你的感受更像？', options: [{ text: '很自然，很快熟悉' }, { text: '需要一点时间适应' }, { text: '有点紧张，不太主动' }, { text: '很不自在，尽量少说话' }] },
      { id: 8, question: '学习一项新技能时，你通常？', options: [{ text: '主动研究，不懂就查资料' }, { text: '跟着教程一步步学' }, { text: '需要别人手把手带' }, { text: '学不会就容易放弃' }] },
      { id: 9, question: '你找兼职的主要目标是？', options: [{ text: '积累经验，为未来铺路' }, { text: '赚零花钱，同时学点东西' }, { text: '主要为了赚钱' }, { text: '打发时间' }] },
      { id: 10, question: '工作时手机来了消息，你通常会？', options: [{ text: '先专注工作，稍后回复' }, { text: '看一眼，简单回复后继续' }, { text: '忍不住频繁回复，影响工作' }, { text: '直接玩手机忘了工作' }] }
    ];
  }

  get currentQuestion(): PersonalityQuestion | null {
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
    this.message = '';
    this.error = false;

    const answers = this.answers.map((score, index) => ({
      question_id: index + 1,
      selected_option: score - 1
    }));

    this.aiApi.analyzePersonality(this.getUserId(), answers).subscribe({
      next: (res) => {
        const profile = res.data;
        this.personalityResult = profile;
        this.testCompleted = true;
        this.testLoading = false;
        this.savePersonalityProfile(profile);
      },
      error: () => {
        this.testLoading = false;
        this.error = true;
        this.message = '人格画像生成失败，未写入主库。请稍后重试。';
      }
    });
  }

  private savePersonalityProfile(profile: any): void {
    this.personalityProfileService.submit(profile).subscribe({
      next: (status) => {
        const savedProfile = status.profile || profile;
        const user = this.authService.getCurrentUser();

        if (user) {
          this.authService.updateCurrentUser({
            ...user,
            personalityProfileCompletedAt: status.completedAt || new Date().toISOString(),
            personalityProfile: savedProfile
          });
        }

        this.personalityResult = savedProfile;
        this.message = '人格画像已保存，推荐结果基于主库画像生成。';
        this.error = false;
        this.getRecommendations();
      },
      error: (err) => {
        console.error('保存人格画像失败:', err);
        this.error = true;
        this.message = '人格画像已生成，但保存失败，因此未触发真实推荐。';
      }
    });
  }

  getRecommendations(): void {
    this.recommendLoading = true;
    this.recommendations = [];

    this.aiApi.recommendJobs(this.getUserId(), undefined, 5).subscribe({
      next: (res) => {
        this.recommendations = res.data?.recommendations || [];
        this.recommendLoading = false;
      },
      error: (err) => {
        this.recommendLoading = false;
        this.error = true;
        this.message = err.error?.detail || err.error?.message || '推荐岗位加载失败，请稍后重试。';
      }
    });
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/auth/login']);
  }
}
