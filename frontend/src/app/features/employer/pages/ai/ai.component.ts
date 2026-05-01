import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../../core/services/auth.service';
import { AiApiService } from '../../../../core/services/ai-api.service';

/**
 * @功能 企业端AI助手页面
 * @说明 集成3个AI功能：企业版对话助手、反向推荐（岗位→学生）、智能JD生成
 */
@Component({
  selector: 'app-employer-ai',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './ai.component.html',
  styleUrls: ['./ai.component.scss']
})
export class EmployerAiComponent implements OnInit {
  /** 当前激活的功能Tab */
  activeTab = 'chat';

  /** ===== 企业版对话 ===== */
  chatMessages: { role: string; content: string }[] = [];
  chatInput = '';
  chatLoading = false;

  /** ===== 反向推荐 ===== */
  jobTitleInput = '';
  jobTagsInput = '';
  jobRequirementsInput = '';
  reverseResults: any[] = [];
  reverseLoading = false;

  /** ===== 智能JD生成 ===== */
  jdJobTitle = '';
  jdKeywords = '';
  jdCompanyType = '';
  jdResult: any = null;
  jdLoading = false;

  constructor(
    private authService: AuthService,
    private aiApi: AiApiService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    // 从queryParams读取tab参数，支持侧边栏直接跳转
    this.route.queryParams.subscribe(params => {
      const tab = params['tab'];
      if (tab && ['chat', 'reverse', 'jd'].includes(tab)) {
        this.activeTab = tab;
      }
    });
  }

  private getUserId(): string {
    const user = this.authService.getCurrentUser();
    return user?.id || 'employer';
  }

  switchTab(tab: string): void {
    this.activeTab = tab;
  }

  // ==================== 企业版对话 ====================

  sendChat(): void {
    if (!this.chatInput.trim() || this.chatLoading) return;

    const message = this.chatInput.trim();
    this.chatMessages.push({ role: 'user', content: message });
    this.chatInput = '';
    this.chatLoading = true;

    this.aiApi.employerChat(this.getUserId(), message, 'hr', this.chatMessages.slice(-10)).subscribe({
      next: (res) => {
        this.chatMessages.push({ role: 'assistant', content: res.data?.reply || '抱歉，我暂时无法回复。' });
        this.chatLoading = false;
      },
      error: () => {
        this.chatMessages.push({ role: 'assistant', content: '网络错误，请稍后再试。' });
        this.chatLoading = false;
      }
    });
  }

  // ==================== 反向推荐 ====================

  reverseRecommend(): void {
    if (!this.jobTitleInput.trim()) return;
    this.reverseLoading = true;

    const tags = this.jobTagsInput
      ? this.jobTagsInput.split(/[,，、]/).map(s => s.trim()).filter(s => s)
      : [];
    const requirements = this.jobRequirementsInput
      ? this.jobRequirementsInput.split(/[,，、]/).map(s => s.trim()).filter(s => s)
      : [];

    this.aiApi.reverseRecommend(this.jobTitleInput.trim(), tags, requirements, 5).subscribe({
      next: (res) => {
        this.reverseResults = res.data?.recommendations || [];
        this.reverseLoading = false;
      },
      error: () => {
        this.reverseLoading = false;
      }
    });
  }

  // ==================== JD生成 ====================

  generateJd(): void {
    if (!this.jdJobTitle.trim()) return;
    this.jdLoading = true;

    const keywords = this.jdKeywords
      ? this.jdKeywords.split(/[,，、]/).map(s => s.trim()).filter(s => s)
      : [];

    this.aiApi.generateJd(this.jdJobTitle.trim(), keywords, this.jdCompanyType.trim()).subscribe({
      next: (res) => {
        this.jdResult = res.data || res;
        this.jdLoading = false;
      },
      error: () => {
        this.jdLoading = false;
      }
    });
  }

  copyJd(): void {
    if (!this.jdResult) return;
    const text = this.formatJdText(this.jdResult);
    navigator.clipboard.writeText(text).then(() => {
      alert('JD已复制到剪贴板！');
    });
  }

  private formatJdText(jd: any): string {
    let text = `【${jd.title}】\n\n`;
    text += `薪资范围：${jd.salary_range || '面议'}\n`;
    text += `工作时间：${jd.work_hours || '协商'}\n`;
    text += `工作地点：${jd.location || '校内/线上'}\n\n`;
    text += `岗位职责：\n${(jd.responsibilities || []).map((r: string, i: number) => `${i + 1}. ${r}`).join('\n')}\n\n`;
    text += `任职要求：\n${(jd.requirements || []).map((r: string, i: number) => `${i + 1}. ${r}`).join('\n')}\n\n`;
    text += `福利待遇：\n${(jd.benefits || []).map((r: string, i: number) => `${i + 1}. ${r}`).join('\n')}\n\n`;
    if (jd.highlights) text += `亮点：${jd.highlights}\n`;
    return text;
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/auth/login']);
  }
}
