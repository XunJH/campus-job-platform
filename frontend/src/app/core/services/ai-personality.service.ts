import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map } from 'rxjs';
import { environment } from '../../../environments/environment';

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
  private readonly aiApiUrl = environment.aiBaseUrl;

  constructor(private readonly http: HttpClient) {}

  getQuestionnaire(): Observable<QuestionnaireResponse> {
    return this.http.get<any>(`${this.aiApiUrl}/personality/questionnaire`).pipe(
      map((response) => {
        if (response?.code === 200 && response.data) {
          return response.data as QuestionnaireResponse;
        }

        throw new Error(this.toReadableMessage(response?.message, '获取人格测评问卷失败。'));
      }),
      catchError((error) => {
        throw new Error(this.toReadableMessage(error, '获取人格测评问卷失败。'));
      })
    );
  }

  analyzePersonality(userId: string, answers: PersonalityAnswer[]): Observable<PersonalityProfile> {
    return this.http
      .post<any>(`${this.aiApiUrl}/personality/analyze`, {
        user_id: userId,
        answers
      })
      .pipe(
        map((response) => {
          if (response?.code === 200 && response.data) {
            return response.data as PersonalityProfile;
          }

          throw new Error(this.toReadableMessage(response?.message, '人格画像分析失败。'));
        }),
        catchError((error) => {
          throw new Error(this.toReadableMessage(error, '人格画像分析失败。'));
        })
      );
  }

  private toReadableMessage(source: any, fallback: string): string {
    const normalized = this.extractReadableMessage(source);
    return normalized || fallback;
  }

  private extractReadableMessage(source: any): string {
    if (typeof source === 'string') {
      return source === '[object Object]' ? '' : source;
    }

    if (source == null) {
      return '';
    }

    if (Array.isArray(source)) {
      return source
        .map((item) => this.extractReadableMessage(item))
        .filter(Boolean)
        .join('；');
    }

    if (typeof source === 'object') {
      const candidates = [source.error, source.detail, source.message];

      for (const candidate of candidates) {
        const nested = this.extractReadableMessage(candidate);
        if (nested) {
          return nested;
        }
      }

      if (typeof source.msg === 'string') {
        const location = Array.isArray(source.loc) ? source.loc.slice(1).join('.') : '';
        return location ? `${location}：${source.msg}` : source.msg;
      }
    }

    return '';
  }
}
