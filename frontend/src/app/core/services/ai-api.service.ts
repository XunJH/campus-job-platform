import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AiApiService {
  private readonly apiUrl = environment.aiBaseUrl;

  constructor(private http: HttpClient) {}

  studentChat(userId: string | number | null | undefined, message: string, history: any[] = []): Observable<any> {
    return this.http.post(`${this.apiUrl}/chat/send`, {
      user_id: this.normalizeId(userId, 'guest'),
      message,
      history
    });
  }

  employerChat(userId: string | number | null | undefined, message: string, role: string = 'hr', history: any[] = []): Observable<any> {
    return this.http.post(`${this.apiUrl}/chat/employer/send`, {
      user_id: this.normalizeId(userId, 'employer'),
      message,
      role,
      history
    });
  }

  getQuestionnaire(): Observable<any> {
    return this.http.get(`${this.apiUrl}/personality/questionnaire`);
  }

  analyzePersonality(userId: string | number | null | undefined, answers: any[]): Observable<any> {
    return this.http.post(`${this.apiUrl}/personality/analyze`, {
      user_id: this.normalizeId(userId, 'guest'),
      answers
    });
  }

  getAllJobs(): Observable<any> {
    return this.http.get(`${this.apiUrl}/matching/jobs`);
  }

  recommendJobs(userId: string | number | null | undefined, personalityProfile?: any, topN: number = 5): Observable<any> {
    const payload: any = {
      user_id: this.normalizeId(userId, 'guest'),
      top_n: topN
    };

    if (personalityProfile) {
      payload.personality_profile = personalityProfile;
    }

    return this.http.post(`${this.apiUrl}/matching/recommend`, payload);
  }

  smartReferral(
    jobId: string | number | null | undefined,
    jobTitle: string,
    jobDescription: string = '',
    jobRequirements: string[] = [],
    jobSalary: string | null = null,
    topN: number = 10,
    includeGapAnalysis: boolean = true
  ): Observable<any> {
    return this.http.post(`${this.apiUrl}/matching/smart-referral`, {
      job_id: this.normalizeId(jobId),
      job_title: jobTitle,
      job_description: jobDescription,
      job_requirements: jobRequirements,
      job_salary: jobSalary,
      top_n: topN,
      include_gap_analysis: includeGapAnalysis
    });
  }

  startInterview(jobTitle: string, jobDescription: string = ''): Observable<any> {
    return this.http.post(`${this.apiUrl}/interview/start`, {
      job_title: jobTitle,
      job_description: jobDescription
    });
  }

  chatInterview(jobTitle: string, message: string, history: any[] = []): Observable<any> {
    return this.http.post(`${this.apiUrl}/interview/chat`, {
      job_title: jobTitle,
      message,
      history
    });
  }

  endInterview(jobTitle: string, history: any[] = []): Observable<any> {
    return this.http.post(`${this.apiUrl}/interview/end`, {
      job_title: jobTitle,
      history
    });
  }

  generateCareerPath(targetJob: string, currentSkills: string[] = [], personalityTags: string[] = []): Observable<any> {
    return this.http.post(`${this.apiUrl}/career/path`, {
      target_job: targetJob,
      current_skills: currentSkills,
      personality_tags: personalityTags
    });
  }

  messageGuard(message: string, senderRole: string = 'student', context: string = ''): Observable<any> {
    return this.http.post(`${this.apiUrl}/chat/message-guard`, {
      message,
      sender_role: senderRole,
      context
    });
  }

  checkChatWarningMessage(message: string, senderRole: string = 'employer', conversationId?: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/chat-warning/check-message`, {
      message,
      sender_role: senderRole,
      conversation_id: conversationId ?? null
    });
  }

  analyzeConversationRisk(
    conversation: Array<{ role: string; content: string }>,
    jobTitle?: string,
    employerName?: string
  ): Observable<any> {
    return this.http.post(`${this.apiUrl}/chat-warning/analyze-conversation`, {
      conversation,
      job_title: jobTitle ?? null,
      employer_name: employerName ?? null
    });
  }

  getChatWarningRiskTypes(): Observable<any> {
    return this.http.get(`${this.apiUrl}/chat-warning/risk-types`);
  }

  getRuntimeStatus(): Observable<any> {
    return this.http.get(`${this.apiUrl}/runtime-status`);
  }

  generateJd(jobTitle: string, keywords: string[] = [], companyType: string = ''): Observable<any> {
    return this.http.post(`${this.apiUrl}/jd/generate`, {
      job_title: jobTitle,
      keywords,
      company_type: companyType
    });
  }

  optimizeEmployerJd(
    company: string,
    jobTitle: string,
    originalJd: string,
    targetAudience: string = '大学生兼职 / 实习求职者',
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

  optimizeResume(
    userId: string | number | null | undefined,
    section: string,
    content: string,
    jobTarget?: string,
    tone?: string
  ): Observable<any> {
    return this.http.post(`${this.apiUrl}/resume/optimize`, {
      user_id: this.normalizeId(userId, 'guest'),
      section,
      content,
      job_target: jobTarget ?? null,
      tone: tone ?? null
    });
  }

  analyzeRejection(
    userId: string | number | null | undefined,
    rejectionMessage: string,
    jobTitle: string,
    resumeSummary?: string
  ): Observable<any> {
    return this.http.post(`${this.apiUrl}/resume/rejection-analysis`, {
      user_id: this.normalizeId(userId, 'guest'),
      rejection_message: rejectionMessage,
      job_title: jobTitle,
      resume_summary: resumeSummary ?? null
    });
  }

  updateResumeFromJob(
    userId: string | number | null | undefined,
    jobTitle: string,
    company: string,
    duration: string,
    description: string,
    currentResume?: string
  ): Observable<any> {
    return this.http.post(`${this.apiUrl}/resume/update`, {
      user_id: this.normalizeId(userId, 'guest'),
      job_title: jobTitle,
      company,
      duration,
      description,
      current_resume: currentResume ?? null
    });
  }

  analyzeStudentReviewToEmployer(
    userId: string | number | null | undefined,
    jobId: string | number | null | undefined,
    companyName: string,
    jobTitle: string,
    rating: number,
    reviewText: string
  ): Observable<any> {
    return this.http.post(`${this.apiUrl}/review/student-to-employer`, {
      user_id: this.normalizeId(userId, 'guest'),
      job_id: this.normalizeId(jobId),
      company_name: companyName,
      job_title: jobTitle,
      rating,
      review_text: reviewText
    });
  }

  analyzeEmployerReviewToStudent(
    employerId: string | number | null | undefined,
    studentId: string | number | null | undefined,
    studentName: string,
    jobTitle: string,
    workDuration: string,
    performanceRating: number,
    reviewText: string
  ): Observable<any> {
    return this.http.post(`${this.apiUrl}/review/employer-to-student`, {
      employer_id: this.normalizeId(employerId, 'employer'),
      student_id: this.normalizeId(studentId),
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

  private normalizeId(value: string | number | null | undefined, fallback: string = ''): string {
    if (typeof value === 'string') {
      const trimmed = value.trim();
      return trimmed || fallback;
    }

    if (typeof value === 'number' && Number.isFinite(value)) {
      return String(value);
    }

    return fallback;
  }
}
