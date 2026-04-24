import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, catchError } from 'rxjs';

export interface PersonalityQuestion {
  id: number;
  question: string;
  options: { text: string }[];
  dimension: string;
}

export interface PersonalityAnswer {
  question_id: number;
  selected_option: number;
}

export interface PersonalityProfile {
  user_id: string;
  dimensions: Record<string, number>;
  tags: string[];
  summary: string;
  strengths: string[];
  weaknesses: string[];
  suitable_jobs: string[];
}

export interface QuestionnaireResponse {
  total: number;
  questions: PersonalityQuestion[];
}

@Injectable({ providedIn: 'root' })
export class AiPersonalityService {
  private readonly AI_API_URL = 'http://localhost:8000';

  constructor(private http: HttpClient) {}

  /**
   * 获取人格测试问卷
   */
  getQuestionnaire(): Observable<QuestionnaireResponse> {
    return this.http.get<any>(`${this.AI_API_URL}/personality/questionnaire`).pipe(
      map(response => {
        if (response.code === 200 && response.data) {
          return response.data as QuestionnaireResponse;
        }
        throw new Error(response.message || '获取问卷失败');
      }),
      catchError(error => {
        const msg = error.error?.message || error.message || '获取问卷失败';
        throw new Error(msg);
      })
    );
  }

  /**
   * 提交答案，分析人格画像
   */
  analyzePersonality(userId: string, answers: PersonalityAnswer[]): Observable<PersonalityProfile> {
    return this.http.post<any>(`${this.AI_API_URL}/personality/analyze`, {
      user_id: userId,
      answers
    }).pipe(
      map(response => {
        if (response.code === 200 && response.data) {
          return response.data as PersonalityProfile;
        }
        throw new Error(response.message || '分析人格画像失败');
      }),
      catchError(error => {
        const msg = error.error?.message || error.message || '分析人格画像失败';
        throw new Error(msg);
      })
    );
  }
}
