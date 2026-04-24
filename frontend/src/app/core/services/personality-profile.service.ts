import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, catchError } from 'rxjs';
import { PersonalityProfile } from './ai-personality.service';

export interface PersonalityProfileStatus {
  completed: boolean;
  completedAt: string | null;
  profile: PersonalityProfile | null;
}

@Injectable({ providedIn: 'root' })
export class PersonalityProfileService {
  private readonly API_URL = '/api/v1/auth/personality-profile';

  constructor(private http: HttpClient) {}

  /**
   * 获取人格画像状态
   */
  getStatus(): Observable<PersonalityProfileStatus> {
    return this.http.get<any>(`${this.API_URL}/status`).pipe(
      map(response => {
        if (response.success && response.data) {
          return response.data as PersonalityProfileStatus;
        }
        throw new Error(response.message || '获取人格画像状态失败');
      }),
      catchError(error => {
        const msg = error.error?.message || error.message || '获取人格画像状态失败';
        throw new Error(msg);
      })
    );
  }

  /**
   * 提交人格画像
   */
  submit(profile: PersonalityProfile): Observable<PersonalityProfileStatus> {
    return this.http.post<any>(this.API_URL, profile).pipe(
      map(response => {
        if (response.success && response.data) {
          return response.data as PersonalityProfileStatus;
        }
        throw new Error(response.message || '提交人格画像失败');
      }),
      catchError(error => {
        const msg = error.error?.message || error.message || '提交人格画像失败';
        throw new Error(msg);
      })
    );
  }

  /**
   * 获取本地存储的免打扰时间戳
   */
  getDismissedTimestamp(userId: string): number | null {
    const key = `personality_profile_snoozed_at_${userId}`;
    const value = localStorage.getItem(key);
    return value ? parseInt(value, 10) : null;
  }

  /**
   * 设置免打扰（24小时内不再弹出）
   */
  setDismissed(userId: string): void {
    const key = `personality_profile_snoozed_at_${userId}`;
    localStorage.setItem(key, Date.now().toString());
  }

  /**
   * 清除免打扰状态
   */
  clearDismissed(userId: string): void {
    const key = `personality_profile_snoozed_at_${userId}`;
    localStorage.removeItem(key);
  }

  /**
   * 检查是否在免打扰期内（24小时）
   */
  isInCooldown(userId: string): boolean {
    const timestamp = this.getDismissedTimestamp(userId);
    if (!timestamp) return false;
    const oneDay = 24 * 60 * 60 * 1000;
    return Date.now() - timestamp < oneDay;
  }
}
