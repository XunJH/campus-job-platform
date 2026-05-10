/**
 * AI模块统一服务

 * 封装所有AI相关API调用，供前端组件使用
 */

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AiApiService {
  /** AI后端地址 */
  private readonly apiUrl = environment.aiBaseUrl;

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
  recommendJobs(userId: string, personalityProfile?: any, topN: number = 5): Observable<any> {
    const payload: any = {
      user_id: userId,
      top_n: topN
    };

    if (personalityProfile) {
      payload.personality_profile = personalityProfile;
    }

    return this.http.post(`${this.apiUrl}/matching/recommend`, payload);
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

  /**
   * 智能调剂（岗位 -> 更合适的学生候选人）
   */
  smartReferral(
    jobId: string,
    jobTitle: string,
    jobDescription: string = '',
    jobRequirements: string[] = [],
    jobSalary: string | null = null,
    topN: number = 10,
    includeGapAnalysis: boolean = true
  ): Observable<any> {
    return this.http.post(`${this.apiUrl}/matching/smart-referral`, {
      job_id: jobId,
      job_title: jobTitle,
      job_description: jobDescription,
      job_requirements: jobRequirements,
      job_salary: jobSalary,
      top_n: topN,
      include_gap_analysis: includeGapAnalysis
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

  /**
   * 聊天风险预警：单条消息检测
   */
  checkChatWarningMessage(message: string, senderRole: string = 'employer', conversationId?: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/chat-warning/check-message`, {
      message,
      sender_role: senderRole,
      conversation_id: conversationId ?? null
    });
  }

  /**
   * 聊天风险预警：整段对话分析
   */
  analyzeConversationRisk(conversation: Array<{ role: string; content: string }>, jobTitle?: string, employerName?: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/chat-warning/analyze-conversation`, {
      conversation,
      job_title: jobTitle ?? null,
      employer_name: employerName ?? null
    });
  }

  /**
   * 获取聊天风险类型说明
   */
  getChatWarningRiskTypes(): Observable<any> {
    return this.http.get(`${this.apiUrl}/chat-warning/risk-types`);
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

  /**
   * 企业端 JD 优化建议
   */
  optimizeEmployerJd(
    company: string,
    jobTitle: string,
    originalJd: string,
    targetAudience: string = '大学生兼职',
    painPoint?: string
  ): Observable<any> {
    return this.http.post(`${this.apiUrl}/employer/jd-optimize`, {
      company,
      job_title: jobTitle,
      original_jd: originalJd,
      target_audience: targetAudience,
      pain_point: painPoint ?? null
    });
  }

  // ==================== 简历 AI ====================

  optimizeResume(userId: string, section: string, content: string, jobTarget?: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/resume/optimize`, {
      user_id: userId,
      section,
      content,
      job_target: jobTarget ?? null
    });
  }

  analyzeRejection(userId: string, rejectionMessage: string, jobTitle: string, resumeSummary?: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/resume/rejection-analysis`, {
      user_id: userId,
      rejection_message: rejectionMessage,
      job_title: jobTitle,
      resume_summary: resumeSummary ?? null
    });
  }

  updateResumeFromJob(
    userId: string,
    jobTitle: string,
    company: string,
    duration: string,
    description: string,
    currentResume?: string
  ): Observable<any> {
    return this.http.post(`${this.apiUrl}/resume/update`, {
      user_id: userId,
      job_title: jobTitle,
      company,
      duration,
      description,
      current_resume: currentResume ?? null
    });
  }

  // ==================== 互评 AI ====================

  analyzeStudentReviewToEmployer(
    userId: string,
    jobId: string,
    companyName: string,
    jobTitle: string,
    rating: number,
    reviewText: string
  ): Observable<any> {
    return this.http.post(`${this.apiUrl}/review/student-to-employer`, {
      user_id: userId,
      job_id: jobId,
      company_name: companyName,
      job_title: jobTitle,
      rating,
      review_text: reviewText
    });
  }

  analyzeEmployerReviewToStudent(
    employerId: string,
    studentId: string,
    studentName: string,
    jobTitle: string,
    workDuration: string,
    performanceRating: number,
    reviewText: string
  ): Observable<any> {
    return this.http.post(`${this.apiUrl}/review/employer-to-student`, {
      employer_id: employerId,
      student_id: studentId,
      student_name: studentName,
      job_title: jobTitle,
      work_duration: workDuration,
      performance_rating: performanceRating,
      review_text: reviewText
    });
  }

  summarizeReviews(targetType: string, targetName: string, reviews: string[]): Observable<any> {
    return this.http.post(`${this.apiUrl}/review/summary`, {
      target_type: targetType,
      target_name: targetName,
      reviews
    });
  }
}
