import { Component, EventEmitter, Input, Output, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AiPersonalityService, PersonalityQuestion, PersonalityAnswer, PersonalityProfile } from '../../../core/services/ai-personality.service';

type ModalStep = 'intro' | 'quiz' | 'analyzing' | 'result';

@Component({
  selector: 'app-personality-profile-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './personality-profile-modal.component.html',
  styleUrls: ['./personality-profile-modal.component.scss']
})
export class PersonalityProfileModalComponent implements OnInit {
  @Input() userId = '';
  @Input() loading = false;
  @Output() submitted = new EventEmitter<PersonalityProfile>();
  @Output() dismissed = new EventEmitter<void>();
  @Output() snoozed = new EventEmitter<void>();

  step: ModalStep = 'intro';
  questions: PersonalityQuestion[] = [];
  currentQuestionIndex = 0;
  answers: PersonalityAnswer[] = [];
  selectedOptionIndex: number | null = null;
  profile: PersonalityProfile | null = null;
  isLoading = false;
  errorMessage = '';

  constructor(private aiPersonalityService: AiPersonalityService) {}

  ngOnInit(): void {
    this.loadQuestions();
  }

  private loadQuestions(): void {
    this.isLoading = true;
    this.aiPersonalityService.getQuestionnaire().subscribe({
      next: (data) => {
        // 防御：如果后端返回空问卷，使用本地默认题目
        this.questions = (data.questions && data.questions.length > 0)
          ? data.questions
          : this.getDefaultQuestions();
        this.isLoading = false;
      },
      error: (err) => {
        this.errorMessage = err.message || '加载问卷失败';
        this.questions = this.getDefaultQuestions();
        this.isLoading = false;
      }
    });
  }

  /** 本地默认问卷（后端不可用时兜底） */
  private getDefaultQuestions(): PersonalityQuestion[] {
    return [
      { id: 1, question: '周末你更喜欢：', options: [{ text: '约朋友一起出去玩' }, { text: '参加聚会或社交活动' }, { text: '一个人安静地待着' }, { text: '在家看书或看电影' }], dimension: '外向性' },
      { id: 2, question: '当老师/老板布置了一个任务，你会：', options: [{ text: '提前完成，还主动优化' }, { text: '按时完成，保证质量' }, { text: '拖到最后一天才做' }, { text: '经常忘记或拖延' }], dimension: '尽责性' },
      { id: 3, question: '面对一个新问题，你通常会：', options: [{ text: '尝试完全不同的方法' }, { text: '参考别人做法再改进' }, { text: '用最常规的方法解决' }, { text: '等待别人来解决' }], dimension: '开放性' },
      { id: 4, question: '当和同事/同学发生矛盾时，你会：', options: [{ text: '主动沟通，寻求双赢' }, { text: '冷静分析后协商解决' }, { text: '尽量避免冲突' }, { text: '生气或冷战' }], dimension: '宜人性' },
      { id: 5, question: '当deadline提前了一天，你会：', options: [{ text: '冷静调整计划，高效完成' }, { text: '有点紧张但能应对' }, { text: '感到焦虑，手忙脚乱' }, { text: '崩溃，不知道怎么办' }], dimension: '情绪稳定性' },
      { id: 6, question: '你平时如何安排兼职和学习的时间？', options: [{ text: '提前规划，严格执行' }, { text: '有个大概计划，灵活调整' }, { text: '走一步看一步' }, { text: '经常顾此失彼' }], dimension: '时间管理' },
      { id: 7, question: '和新认识的同事/同学交流，你感觉：', options: [{ text: '很自然，很快就熟络' }, { text: '需要一点时间适应' }, { text: '有点紧张，不太主动' }, { text: '很不自在，尽量少说话' }], dimension: '沟通能力' },
      { id: 8, question: '学习一项新技能时，你通常：', options: [{ text: '主动研究，不懂就查资料' }, { text: '跟着教程一步步学' }, { text: '需要别人手把手教' }, { text: '学不会就放弃了' }], dimension: '学习能力' },
      { id: 9, question: '你找兼职的主要目的是：', options: [{ text: '积累经验，为未来打基础' }, { text: '赚零花钱，顺便学东西' }, { text: '主要为了赚钱' }, { text: '打发时间' }], dimension: '职业动机' },
      { id: 10, question: '工作时手机来了消息，你会：', options: [{ text: '先专注工作，稍后回复' }, { text: '看一眼，简单回复后继续工作' }, { text: '忍不住回复，导致工作拖沓' }, { text: '直接玩手机忘了工作' }], dimension: '专注力' }
    ];
  }

  get currentQuestion(): PersonalityQuestion | null {
    return this.questions[this.currentQuestionIndex] ?? null;
  }

  get progressPercent(): number {
    if (this.questions.length === 0) return 0;
    return Math.round((this.answers.length / this.questions.length) * 100);
  }

  startQuiz(): void {
    this.step = 'quiz';
    this.currentQuestionIndex = 0;
    this.answers = [];
    this.selectedOptionIndex = null;
  }

  selectOption(index: number): void {
    this.selectedOptionIndex = index;
  }

  nextQuestion(): void {
    if (this.selectedOptionIndex === null || !this.currentQuestion) return;

    this.answers.push({
      question_id: this.currentQuestion.id,
      selected_option: this.selectedOptionIndex
    });

    if (this.currentQuestionIndex < this.questions.length - 1) {
      this.currentQuestionIndex++;
      this.selectedOptionIndex = null;
    } else {
      this.submitAnswers();
    }
  }

  private submitAnswers(): void {
    this.step = 'analyzing';
    this.aiPersonalityService.analyzePersonality(this.userId, this.answers).subscribe({
      next: (profile) => {
        this.profile = profile;
        this.step = 'result';
        this.submitted.emit(profile);
      },
      error: (err) => {
        this.errorMessage = err.message || '分析失败，请重试';
        this.step = 'quiz';
      }
    });
  }

  onDismiss(): void {
    this.dismissed.emit();
  }

  onSnooze(): void {
    this.snoozed.emit();
  }
}
