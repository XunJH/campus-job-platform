/**
 * AI模块统一服务

 * 封装所有AI相关API调用，供前端组件使用
 */

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AiApiService {
  /** AI后端地址 */
  private apiUrl = 'http://localhost:8000';

  constructor(private http: HttpClient) {}

  // ==================== 对话助手 ====================

  /**
   * 学生版对话
   */
  studentChat(userId: string, message: string, history: any[] = []): Observable<any> {
    return this.http.post(`${this.apiUrl}/chat/send`, {
      user_id: userId,
      message,
      history
    });
  }

  /**
   * 企业版对话
   */
  employerChat(userId: string, message: string, role: string = 'hr', history: any[] = []): Observable<any> {
    return this.http.post(`${this.apiUrl}/chat/employer/send`, {
      user_id: userId,
      message,
      role,
      history
    });
  }

  // ==================== 性格测评 ====================

  /**
   * 获取测评问卷
   */
  getQuestionnaire(): Observable<any> {
    return this.http.get(`${this.apiUrl}/personality/questionnaire`);
  }

  /**
   * 提交测评答案
   */
  analyzePersonality(userId: string, answers: any[]): Observable<any> {
    return this.http.post(`${this.apiUrl}/personality/analyze`, {
      user_id: userId,
      answers
    });
  }

  // ==================== 正向推荐 ====================

  /**
   * 获取岗位列表
   */
  getAllJobs(): Observable<any> {
    return this.http.get(`${this.apiUrl}/matching/jobs`);
  }

  /**
   * 正向推荐（学生→岗位）
   */
  recommendJobs(userId: string, personalityProfile: any, topN: number = 5): Observable<any> {
    return this.http.post(`${this.apiUrl}/matching/recommend`, {
      user_id: userId,
      personality_profile: personalityProfile,
      top_n: topN
    });
  }

  // ==================== 反向推荐 ====================

  /**
   * 反向推荐（岗位→学生）
   */
  reverseRecommend(jobTitle: string, jobTags: string[] = [], jobRequirements: string[] = [], topN: number = 5): Observable<any> {
    return this.http.post(`${this.apiUrl}/matching/reverse`, {
      job_title: jobTitle,
      job_tags: jobTags,
      job_requirements: jobRequirements,
      top_n: topN
    });
  }

  // ==================== AI面试模拟 ====================

  /**
   * 开始面试
   */
  startInterview(jobTitle: string, jobDescription: string = ''): Observable<any> {
    return this.http.post(`${this.apiUrl}/interview/start`, {
      job_title: jobTitle,
      job_description: jobDescription
    });
  }

  /**
   * 面试对话
   */
  chatInterview(jobTitle: string, message: string, history: any[] = []): Observable<any> {
    return this.http.post(`${this.apiUrl}/interview/chat`, {
      job_title: jobTitle,
      message,
      history
    });
  }

  /**
   * 结束面试
   */
  endInterview(jobTitle: string, history: any[] = []): Observable<any> {
    return this.http.post(`${this.apiUrl}/interview/end`, {
      job_title: jobTitle,
      history
    });
  }

  // ==================== 职业发展路径 ====================

  /**
   * 生成职业发展路径
   */
  generateCareerPath(targetJob: string, currentSkills: string[] = [], personalityTags: string[] = []): Observable<any> {
    return this.http.post(`${this.apiUrl}/career/path`, {
      target_job: targetJob,
      current_skills: currentSkills,
      personality_tags: personalityTags
    });
  }

  // ==================== 消息安全检测 ====================

  /**
   * 消息安全检测（敏感词/违规内容识别）
   * 在用户发送消息前调用，检测是否包含敏感内容
   */
  messageGuard(message: string, senderRole: string = 'student', context: string = ''): Observable<any> {
    return this.http.post(`${this.apiUrl}/chat/message-guard`, {
      message,
      sender_role: senderRole,
      context
    });
  }

  // ==================== 智能JD生成 ====================

  /**
   * 生成岗位描述
   */
  generateJd(jobTitle: string, keywords: string[] = [], companyType: string = ''): Observable<any> {
    return this.http.post(`${this.apiUrl}/jd/generate`, {
      job_title: jobTitle,
      keywords,
      company_type: companyType
    });
  }
}
