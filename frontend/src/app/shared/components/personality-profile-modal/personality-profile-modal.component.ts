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
        this.questions = data.questions;
        this.isLoading = false;
      },
      error: (err) => {
        this.errorMessage = err.message || '加载问卷失败';
        this.isLoading = false;
      }
    });
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
