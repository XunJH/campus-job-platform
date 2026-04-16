/**
 * 智能岗位匹配服务
 * 提供岗位列表查询和智能推荐功能
 */

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class MatchingService {
  private apiUrl = 'http://localhost:8000';

  constructor(private http: HttpClient) {}

  /**
   * 获取所有可用岗位
   */
  getAllJobs(): Observable<any> {
    return this.http.get(`${this.apiUrl}/matching/jobs`);
  }

  /**
   * 根据人格画像，智能推荐岗位
   *
   * @param userId 用户ID
   * @param personalityProfile 用户的人格画像数据
   * @param topN 返回的推荐数量
   */
  recommendJobs(
    userId: string,
    personalityProfile: any,
    topN: number = 5
  ): Observable<any> {
    return this.http.post(`${this.apiUrl}/matching/recommend`, {
      user_id: userId,
      personality_profile: personalityProfile,
      top_n: topN
    });
  }
}
