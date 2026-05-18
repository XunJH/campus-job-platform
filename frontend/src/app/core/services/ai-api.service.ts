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

  studentChat(userId: string, message: string, history: any[] = []): Observable<any> {
    return this.http.post(`${this.apiUrl}/chat/send`, {
      user_id: userId,
      message,
      history
    });
  }

  employerChat(userId: string, message: string, role: string = 'hr', history: any[] = []): Observable<any> {
    return this.http.post(`${this.apiUrl}/chat/employer/send`, {
      user_id: userId,
      message,
      role,
      history
    });
  }

  getQuestionnaire(): Observable<any> {
    return this.http.get(`${this.apiUrl}/personality/questionnaire`);
  }

  analyzePersonality(userId: string, answers: any[]): Observable<any> {
    return this.http.post(`${this.apiUrl}/personality/analyze`, {
      user_id: userId,
      answers
    });
  }

  getAllJobs(): Observable<any> {
    return this.http.get(`${this.apiUrl}/matching/jobs`);
  }

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

  optimizeResume(userId: string, section: string, content: string, jobTarget?: string, tone?: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/resume/optimize`, {
      user_id: userId,
      section,
      content,
      job_target: jobTarget ?? null,
      tone: tone ?? null
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
