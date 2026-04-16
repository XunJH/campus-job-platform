/**
 * AI人格画像服务
 * 负责与后端API通信，获取测试问卷和提交答案
 */

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class PersonalityService {
  private apiUrl = 'http://localhost:8000';

  constructor(private http: HttpClient) {}

  /**
   * 获取人格测试问卷
   */
  getQuestionnaire(count: number = 10): Observable<any> {
    return this.http.get(`${this.apiUrl}/personality/questionnaire`);
  }

  /**
   * 提交答案，获取人格画像分析结果
   *
   * @param userId 用户ID
   * @param answers 用户选择的答案，格式：[{questionId: 1, selectedOption: 0}, ...]
   */
  analyzeAnswers(userId: string, answers: any[]): Observable<any> {
    return this.http.post(`${this.apiUrl}/personality/analyze`, {
      user_id: userId,
      answers: answers
    });
  }
}
