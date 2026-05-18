import { CommonModule } from '@angular/common';
import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { AuthService } from '../../../../core/services/auth.service';
import { AiApiService } from '../../../../core/services/ai-api.service';
import { UserService } from '../../../../core/services/user.service';
import { User } from '../../../../models/user.model';
import { StudentShellHeaderComponent } from '../../../../shared/components/student-shell-header/student-shell-header.component';

interface WorkExperience {
  title: string;
  company: string;
  period: string;
  description: string;
  skills: string[];
}

interface Education {
  school: string;
  degree: string;
  gpa: string;
  graduationYear: string;
  status: string;
  courses: string;
  honors: string;
}

interface WorkExperiencePreview extends WorkExperience {
  bulletLines: string[];
  skillTags: string[];
}

interface EducationPreview extends Education {
  courseTags: string[];
  highlightLines: string[];
}

type ProfileSection = 'basic' | 'education' | 'experience' | 'skills';
type ResumeTemplate = 'formal' | 'executive' | 'compact';
type ResumeTheme = 'navy' | 'graphite' | 'emerald';
type ResumeTone = 'campus' | 'result' | 'executive';
type ResumeAiAction = 'check' | 'rewrite' | 'polish';

interface ResumeAiSuggestion {
  original: string;
  improved: string;
  reason: string;
}

interface ResumeAiContext {
  type: 'bio' | 'experience' | 'education';
  experienceIndex?: number;
  educationIndex?: number;
  sectionLabel: string;
  action: ResumeAiAction;
  autoApply?: boolean;
}

interface ResumeAiResult {
  score: number | null;
  issues: string[];
  suggestions: ResumeAiSuggestion[];
  overallTip: string;
  appliedDraft: string;
  sourcePreview: string;
  sectionLabel: string;
  action: ResumeAiAction;
}

interface ResumeChecklistItem {
  label: string;
  done: boolean;
  tip: string;
}

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule, StudentShellHeaderComponent],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss']
})
export class ProfileComponent implements OnInit {
  @ViewChild('resumeExportSurface') resumeExportSurface?: ElementRef<HTMLElement>;

  profileForm!: FormGroup;
  user: User | null = null;
  isLoading = false;
  isExportingPdf = false;
  isExportingImage = false;
  activeSection: ProfileSection = 'basic';
  selectedTemplate: ResumeTemplate = 'formal';
  selectedTheme: ResumeTheme = 'navy';
  selectedTone: ResumeTone = 'campus';
  message = '';
  error = false;

  avatarPreviewUrl = '';
  selectedAvatarDataUrl = '';
  avatarMessage = '';
  avatarError = false;

  resumePreviewUrl = '';
  selectedResumeDataUrl = '';
  resumeMessage = '';
  resumeError = false;
  resumeRemoved = false;

  resumeAiTargetJob = '';
  resumeAiLoading = false;
  resumeAiError = false;
  resumeAiMessage = '';
  resumeAiResult: ResumeAiResult | null = null;
  resumeAiContext: ResumeAiContext | null = null;
  private routeSectionRequested: ProfileSection = 'basic';

  readonly maxAvatarFileSize = 2 * 1024 * 1024;
  readonly maxResumeFileSize = 4 * 1024 * 1024;

  readonly sections: Array<{ id: ProfileSection; label: string; icon: string; hint: string }> = [
    { id: 'basic', label: '个人总览', icon: 'person', hint: '联系信息、职业概述、头像附件' },
    { id: 'education', label: '教育背景', icon: 'school', hint: '学校、课程、荣誉亮点卡片化整理' },
    { id: 'experience', label: '经历项目', icon: 'work', hint: '分条成果点，适合直接投递' },
    { id: 'skills', label: '技能标签', icon: 'code', hint: '技术栈、工具、语言能力' }
  ];

  readonly resumeTemplates: Array<{ id: ResumeTemplate; label: string; description: string }> = [
    { id: 'formal', label: '标准版', description: '结构清晰，适合常规投递使用' },
    { id: 'executive', label: '侧栏版', description: '突出技能和标签，层次更明确' },
    { id: 'compact', label: '双栏版', description: '适合内容较多时集中展示' }
  ];

  readonly resumeThemes: Array<{ id: ResumeTheme; label: string; swatch: string; description: string }> = [
    { id: 'navy', label: '深海蓝', swatch: 'linear-gradient(135deg, #10243a, #274c77)', description: '稳重、正式，适合标准简历' },
    { id: 'graphite', label: '石墨灰', swatch: 'linear-gradient(135deg, #1f2937, #4b5563)', description: '克制、专业，适合简洁风格' },
    { id: 'emerald', label: '松石绿', swatch: 'linear-gradient(135deg, #065f46, #10b981)', description: '清爽明快，适合轻量展示' }
  ];

  readonly resumeTones: Array<{ id: ResumeTone; label: string; description: string }> = [
    { id: 'campus', label: '稳重校招', description: '突出成长性、执行力和岗位匹配感' },
    { id: 'result', label: '成果导向', description: '更强调动作、方法和结果影响' },
    { id: 'executive', label: '干练专业', description: '句子更短、更紧，信息密度更高' }
  ];

  readonly aiActionLabels: Record<ResumeAiAction, string> = {
    check: '内容检查',
    rewrite: '表述调整',
    polish: '快速整理'
  };

  constructor(
    private fb: FormBuilder,
    private userService: UserService,
    private authService: AuthService,
    private aiApiService: AiApiService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.route.queryParamMap.subscribe((params) => {
      this.routeSectionRequested = this.parseRequestedSection(params.get('section'));
      this.applyRouteEntryState();
    });

    this.loadProfile();
  }

  get workExperienceArray(): FormArray {
    return this.profileForm.get('workExperience') as FormArray;
  }

  get educationArray(): FormArray {
    return this.profileForm.get('education') as FormArray;
  }

  get avatarDisplayUrl(): string {
    return this.avatarPreviewUrl || this.profileForm?.get('avatar')?.value || this.user?.avatar || '';
  }

  get resumeDisplayUrl(): string {
    return this.resumePreviewUrl || this.user?.personalityProfile?.resumeImage || '';
  }

  get previewName(): string {
    return this.trimmedText(this.profileForm?.get('nickname')?.value) || this.user?.nickname || this.user?.username || '未命名学生';
  }

  get previewInitial(): string {
    return this.previewName.slice(0, 1).toUpperCase();
  }

  get previewEmail(): string {
    return this.trimmedText(this.profileForm?.get('email')?.value) || '暂未填写邮箱';
  }

  get previewPhone(): string {
    return this.trimmedText(this.profileForm?.get('phone')?.value) || '暂未填写电话';
  }

  get previewBio(): string {
    return (
      this.trimmedText(this.profileForm?.get('bio')?.value) ||
      '补充一段职业概述，让企业先看到你的方向、优势和目标岗位。'
    );
  }

  get previewEducations(): EducationPreview[] {
    return this.collectEducations().map((education) => ({
      ...education,
      courseTags: this.parseListInput(education.courses),
      highlightLines: this.parseBulletLines(education.honors)
    }));
  }

  get previewExperiences(): WorkExperiencePreview[] {
    return this.collectExperiences().map((experience) => ({
      ...experience,
      bulletLines: this.parseBulletLines(experience.description),
      skillTags: experience.skills
    }));
  }

  get previewTechnicalSkills(): string[] {
    return this.parseListInput(this.profileForm?.get('technicalSkills')?.value || '');
  }

  get previewTools(): string[] {
    return this.parseListInput(this.profileForm?.get('tools')?.value || '');
  }

  get previewLanguages(): string[] {
    return this.parseListInput(this.profileForm?.get('languages')?.value || '');
  }

  get previewSkillCloud(): string[] {
    return Array.from(new Set([...this.previewTechnicalSkills, ...this.previewTools, ...this.previewLanguages])).slice(0, 12);
  }

  get personalityTags(): string[] {
    return this.user?.personalityProfile?.tags || [];
  }

  get personalitySummary(): string {
    return this.user?.personalityProfile?.summary || '';
  }

  get primaryTargetRole(): string {
    return this.resumeAiTargetJob.trim() || this.previewExperiences[0]?.title || '校园兼职 / 实习求职';
  }

  get activeToneDescription(): string {
    return this.resumeTones.find((item) => item.id === this.selectedTone)?.description || '';
  }

  get checklistItems(): ResumeChecklistItem[] {
    const hasContact =
      Boolean(this.trimmedText(this.profileForm?.get('nickname')?.value)) &&
      Boolean(this.trimmedText(this.profileForm?.get('email')?.value)) &&
      Boolean(this.trimmedText(this.profileForm?.get('phone')?.value));

    const hasEducationHighlights = this.previewEducations.some((item) => item.highlightLines.length > 0);
    const hasExperienceBullets = this.previewExperiences.some((item) => item.bulletLines.length >= 2);

    return [
      {
        label: '联系信息完整',
        done: hasContact,
        tip: '姓名、邮箱、电话尽量补齐，方便企业快速联系。'
      },
      {
        label: '职业概述可读',
        done: Boolean(this.trimmedText(this.profileForm?.get('bio')?.value)),
        tip: '用 3 到 5 句话写清方向、优势和目标岗位。'
      },
      {
        label: '教育亮点成块展示',
        done: hasEducationHighlights,
        tip: '至少保留 2 条教育亮点，让课程、排名和奖项更像正式简历。'
      },
      {
        label: '经历成果点足够具体',
        done: hasExperienceBullets,
        tip: '每段经历尽量写出动作、方法和结果，不要只写岗位名称。'
      },
      {
        label: '技能标签结构化',
        done: this.previewTechnicalSkills.length > 0,
        tip: '核心技术栈要拆成短标签，企业扫描效率会更高。'
      },
      {
        label: '工具与语言补齐',
        done: this.previewTools.length > 0 || this.previewLanguages.length > 0,
        tip: '工具、平台和语言能力能帮助岗位匹配更准确。'
      },
      {
        label: '附件素材已补充',
        done: Boolean(this.avatarDisplayUrl) || Boolean(this.resumeDisplayUrl),
        tip: '头像和附加简历图不是必须项，但补充后资料会更完整。'
      }
    ];
  }

  get completionScore(): number {
    const doneCount = this.checklistItems.filter((item) => item.done).length;
    return this.checklistItems.length ? Math.round((doneCount / this.checklistItems.length) * 100) : 0;
  }

  selectSection(section: ProfileSection, shouldScroll: boolean = true): void {
    this.activeSection = section;

    if (!shouldScroll || typeof document === 'undefined') {
      return;
    }

    setTimeout(() => {
      document.getElementById(`resume-section-${section}`)?.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    });
  }

  selectTemplate(template: ResumeTemplate): void {
    this.selectedTemplate = template;
  }

  selectTheme(theme: ResumeTheme): void {
    this.selectedTheme = theme;
  }

  selectTone(tone: ResumeTone): void {
    this.selectedTone = tone;
  }

  getExperienceBullets(index: number): FormArray {
    return this.workExperienceArray.at(index).get('bullets') as FormArray;
  }

  getEducationHighlightsArray(index: number): FormArray {
    return this.educationArray.at(index).get('highlights') as FormArray;
  }

  addExperience(): void {
    this.workExperienceArray.push(this.createExperienceGroup());
    this.selectSection('experience', false);
  }

  removeExperience(index: number): void {
    this.workExperienceArray.removeAt(index);

    if (this.workExperienceArray.length === 0) {
      this.workExperienceArray.push(this.createExperienceGroup());
    }
  }

  addExperienceBullet(index: number, value: string = ''): void {
    this.getExperienceBullets(index).push(this.fb.control(value));
  }

  removeExperienceBullet(index: number, bulletIndex: number): void {
    const bullets = this.getExperienceBullets(index);
    bullets.removeAt(bulletIndex);

    if (bullets.length === 0) {
      bullets.push(this.fb.control(''));
    }
  }

  addEducation(): void {
    this.educationArray.push(this.createEducationGroup());
    this.selectSection('education', false);
  }

  removeEducation(index: number): void {
    this.educationArray.removeAt(index);

    if (this.educationArray.length === 0) {
      this.educationArray.push(this.createEducationGroup());
    }
  }

  addEducationHighlight(index: number, value: string = ''): void {
    this.getEducationHighlightsArray(index).push(this.fb.control(value));
  }

  removeEducationHighlight(index: number, highlightIndex: number): void {
    const highlights = this.getEducationHighlightsArray(index);
    highlights.removeAt(highlightIndex);

    if (highlights.length === 0) {
      highlights.push(this.fb.control(''));
    }
  }

  seedEducationHighlights(index: number): void {
    const education = this.educationArray.at(index);
    const school = this.trimmedText(education.get('school')?.value);
    const degree = this.trimmedText(education.get('degree')?.value);
    const gpa = this.trimmedText(education.get('gpa')?.value);
    const courses = this.parseListInput(education.get('courses')?.value).slice(0, 3);

    const suggestions = [
      school && degree ? `就读于${school}${degree}方向，持续围绕目标岗位补强专业基础。` : '',
      gpa ? `学业表现：${gpa}。` : '补一条学业表现，例如成绩排名、奖学金或竞赛成绩。',
      courses.length > 0 ? `核心课程覆盖${courses.join('、')}，和目标岗位能力要求保持贴合。` : '补一条课程亮点，例如主修课程、研究方向或校内项目。'
    ].filter(Boolean);

    this.replaceStringArray(this.getEducationHighlightsArray(index), suggestions, 3);
  }

  seedExperienceBullets(index: number): void {
    const experience = this.workExperienceArray.at(index);
    const title = this.trimmedText(experience.get('title')?.value) || '该岗位';
    const company = this.trimmedText(experience.get('company')?.value) || '该项目/单位';
    const skills = this.parseListInput(experience.get('skills')?.value);

    const suggestions = [
      `围绕${company}的${title}任务负责具体执行与推进，能够按节点稳定交付。`,
      skills.length > 0
        ? `结合${skills.slice(0, 3).join('、')}完成关键工作，并在协作中持续复盘优化。`
        : '在执行过程中沉淀了方法与流程，能够独立推进重点模块或关键任务。',
      '尽量补上结果，例如效率提升、完成数量、用户反馈或项目影响，增强投递说服力。'
    ];

    this.replaceStringArray(this.getExperienceBullets(index), suggestions, 3);
  }

  async exportResumeAsPdf(): Promise<void> {
    if (this.isExportingPdf || this.isExportingImage) {
      return;
    }

    this.isExportingPdf = true;

    try {
      const canvas = await this.renderResumeCanvas();
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const margin = 8;
      const pageWidth = 210 - margin * 2;
      const pageHeight = 297 - margin * 2;
      const imageHeight = (canvas.height * pageWidth) / canvas.width;

      let heightLeft = imageHeight;
      let position = margin;

      pdf.addImage(imgData, 'PNG', margin, position, pageWidth, imageHeight, undefined, 'FAST');
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = margin - (imageHeight - heightLeft);
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', margin, position, pageWidth, imageHeight, undefined, 'FAST');
        heightLeft -= pageHeight;
      }

      pdf.save(`${this.buildExportFilename()}.pdf`);
      this.message = '简历 PDF 已导出。';
      this.error = false;
    } catch (err) {
      console.error(err);
      this.message = '导出 PDF 失败，请稍后重试。';
      this.error = true;
    } finally {
      this.isExportingPdf = false;
    }
  }

  async exportResumeAsImage(): Promise<void> {
    if (this.isExportingPdf || this.isExportingImage) {
      return;
    }

    this.isExportingImage = true;

    try {
      const canvas = await this.renderResumeCanvas();
      const dataUrl = canvas.toDataURL('image/png');
      this.downloadDataUrl(dataUrl, `${this.buildExportFilename()}.png`);
      this.message = '简历长图已导出。';
      this.error = false;
    } catch (err) {
      console.error(err);
      this.message = '导出长图失败，请稍后重试。';
      this.error = true;
    } finally {
      this.isExportingImage = false;
    }
  }

  onAvatarSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) {
      return;
    }

    if (!file.type.startsWith('image/')) {
      this.avatarError = true;
      this.avatarMessage = '请选择 PNG、JPG 或 WEBP 图片。';
      input.value = '';
      return;
    }

    if (file.size > this.maxAvatarFileSize) {
      this.avatarError = true;
      this.avatarMessage = '头像图片不能超过 2MB。';
      input.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      this.avatarPreviewUrl = result;
      this.selectedAvatarDataUrl = result;
      this.avatarError = false;
      this.avatarMessage = '已选择新的头像图片，保存后生效。';
    };
    reader.onerror = () => {
      this.avatarError = true;
      this.avatarMessage = '读取头像图片失败，请重试。';
    };
    reader.readAsDataURL(file);
  }

  removeAvatar(): void {
    this.avatarPreviewUrl = '';
    this.selectedAvatarDataUrl = '';
    this.profileForm.patchValue({ avatar: '' });
    this.avatarError = false;
    this.avatarMessage = '当前头像会在保存后移除。';
  }

  onResumeSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) {
      return;
    }

    if (!file.type.startsWith('image/')) {
      this.resumeError = true;
      this.resumeMessage = '请选择 PNG、JPG 或 WEBP 格式的简历图。';
      input.value = '';
      return;
    }

    if (file.size > this.maxResumeFileSize) {
      this.resumeError = true;
      this.resumeMessage = '简历图片不能超过 4MB。';
      input.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      this.resumePreviewUrl = result;
      this.selectedResumeDataUrl = result;
      this.resumeRemoved = false;
      this.resumeError = false;
      this.resumeMessage = '已选择附加简历图，学生投递后会自动发送给企业。';
    };
    reader.onerror = () => {
      this.resumeError = true;
      this.resumeMessage = '读取简历图片失败，请重试。';
    };
    reader.readAsDataURL(file);
  }

  removeResume(): void {
    this.resumePreviewUrl = '';
    this.selectedResumeDataUrl = '';
    this.resumeRemoved = true;
    this.resumeError = false;
    this.resumeMessage = '当前附加简历图会在保存后移除。';
  }

  startPersonalityTest(): void {
    this.router.navigate(['/student/ai'], { queryParams: { tab: 'test' } });
  }

  runBioAi(action: ResumeAiAction): void {
    const content = this.trimmedText(this.profileForm?.get('bio')?.value);

    if (!content) {
      this.resumeAiError = true;
      this.resumeAiContext = {
        type: 'bio',
        sectionLabel: '个人简介',
        action
      };
      this.resumeAiResult = null;
      this.resumeAiMessage = '请先补充个人简介，再进行内容检查或表述调整。';
      return;
    }

    this.runResumeOptimization('个人简介', content, {
      type: 'bio',
      sectionLabel: '个人简介',
      action,
      autoApply: action === 'polish'
    });
  }

  runEducationAi(index: number, action: ResumeAiAction): void {
    const educationGroup = this.educationArray.at(index);

    if (!educationGroup) {
      return;
    }

    const school = this.trimmedText(educationGroup.get('school')?.value);
    const degree = this.trimmedText(educationGroup.get('degree')?.value);
    const graduationYear = this.trimmedText(educationGroup.get('graduationYear')?.value);
    const gpa = this.trimmedText(educationGroup.get('gpa')?.value);
    const courses = this.parseListInput(educationGroup.get('courses')?.value);
    const highlights = this.getStringArray(this.getEducationHighlightsArray(index));

    const content = [
      school,
      degree,
      graduationYear,
      gpa ? `学业表现：${gpa}` : '',
      courses.length > 0 ? `核心课程：${courses.join('、')}` : '',
      ...highlights.map((item) => `- ${item}`)
    ]
      .filter(Boolean)
      .join('\n');

    if (!content) {
      this.resumeAiError = true;
      this.resumeAiContext = {
        type: 'education',
        educationIndex: index,
        sectionLabel: `教育经历 ${index + 1}`,
        action
      };
      this.resumeAiResult = null;
      this.resumeAiMessage = '请先填充学校、课程或亮点信息，再生成教育亮点建议。';
      return;
    }

    this.runResumeOptimization('教育背景亮点', content, {
      type: 'education',
      educationIndex: index,
      sectionLabel: school || `教育经历 ${index + 1}`,
      action,
      autoApply: action === 'polish'
    });
  }

  runExperienceAi(index: number, action: ResumeAiAction): void {
    const experienceGroup = this.workExperienceArray.at(index);

    if (!experienceGroup) {
      return;
    }

    const title = this.trimmedText(experienceGroup.get('title')?.value);
    const company = this.trimmedText(experienceGroup.get('company')?.value);
    const period = this.trimmedText(experienceGroup.get('period')?.value);
    const skills = this.trimmedText(experienceGroup.get('skills')?.value);
    const bullets = this.getStringArray(this.getExperienceBullets(index));
    const content = [title, company, period, skills ? `技能：${skills}` : '', ...bullets.map((item) => `- ${item}`)]
      .filter(Boolean)
      .join('\n');

    if (!content) {
      this.resumeAiError = true;
      this.resumeAiContext = {
        type: 'experience',
        experienceIndex: index,
        sectionLabel: `经历 ${index + 1}`,
        action
      };
      this.resumeAiResult = null;
      this.resumeAiMessage = '请先填写这段经历的职责和成果点，再继续整理内容。';
      return;
    }

    this.runResumeOptimization('实习 / 项目经历', content, {
      type: 'experience',
      experienceIndex: index,
      sectionLabel: title || `经历 ${index + 1}`,
      action,
      autoApply: action === 'polish'
    });
  }

  applyResumeOptimization(): void {
    if (!this.resumeAiResult || !this.resumeAiContext) {
      return;
    }

    this.applyDraftToForm(this.resumeAiResult.appliedDraft, this.resumeAiContext);
    this.resumeAiError = false;
    this.resumeAiMessage = `${this.resumeAiContext.sectionLabel} 的优化稿已经回写到左侧草稿，记得保存。`;
  }

  clearResumeAiPanel(): void {
    this.resumeAiContext = null;
    this.resumeAiResult = null;
    this.resumeAiMessage = '';
    this.resumeAiError = false;
  }

  onSubmit(): void {
    if (!this.profileForm || this.profileForm.invalid) {
      return;
    }

    this.message = '';
    this.error = false;
    this.isLoading = true;

    const formValue = this.profileForm.getRawValue();
    const existingProfile = this.user?.personalityProfile || {};
    const currentSection = this.activeSection;
    const currentTargetJob = this.resumeAiTargetJob;
    const currentTemplate = this.selectedTemplate;
    const currentTheme = this.selectedTheme;
    const currentTone = this.selectedTone;

    const updateData: any = {
      username: formValue.nickname,
      email: formValue.email,
      phone: formValue.phone,
      avatar: formValue.avatar,
      bio: formValue.bio,
      personalityProfile: {
        ...existingProfile,
        workExperience: this.collectExperiences(),
        education: this.collectEducations(),
        technicalSkills: this.previewTechnicalSkills,
        tools: this.previewTools,
        languages: this.previewLanguages,
        resumeImage: this.resumeRemoved ? '' : existingProfile.resumeImage || '',
        resumeTemplate: currentTemplate,
        resumeTheme: currentTheme,
        resumeToneStyle: currentTone,
        resumeTargetRole: currentTargetJob.trim()
      }
    };

    if (this.selectedAvatarDataUrl) {
      updateData.avatarUpload = this.selectedAvatarDataUrl;
    }

    if (this.selectedResumeDataUrl) {
      updateData.resumeImageUpload = this.selectedResumeDataUrl;
    }

    if (this.resumeRemoved) {
      updateData.resumeImageRemoved = true;
    }

    this.userService.updateProfile(updateData).subscribe({
      next: (res) => {
        const mappedUser = {
          ...res.data,
          nickname: res.data.nickname || res.data.username || ''
        } as User;

        this.isLoading = false;
        this.message = '简历资料已保存。';
        this.error = false;
        this.user = mappedUser;
        this.authService.updateCurrentUser(mappedUser);
        this.initForm(mappedUser);
        this.resumeAiTargetJob = currentTargetJob;
        this.selectedTemplate = currentTemplate;
        this.selectedTheme = currentTheme;
        this.selectedTone = currentTone;
        this.activeSection = currentSection;
      },
      error: (err) => {
        this.isLoading = false;
        this.error = true;

        if (Array.isArray(err.error?.errors) && err.error.errors.length > 0) {
          this.message = err.error.errors
            .map((item: any) => item.msg || item.message || JSON.stringify(item))
            .join('；');
          return;
        }

        this.message = err.error?.message || err.message || '保存简历失败，请稍后重试。';
      }
    });
  }

  private loadProfile(): void {
    this.userService.getProfile().subscribe({
      next: (res) => {
        const mappedUser = {
          ...res.data,
          nickname: res.data.nickname || res.data.username || ''
        } as User;

        this.user = mappedUser;
        this.authService.updateCurrentUser(mappedUser);
        this.initForm(mappedUser);
        this.applyRouteEntryState();
      },
      error: () => {
        this.error = true;
        this.message = '加载个人资料失败，请稍后重试。';
      }
    });
  }

  private initForm(user: User): void {
    const profile = user.personalityProfile || {};
    const workExperience = Array.isArray(profile.workExperience) ? profile.workExperience : [];
    const education = Array.isArray(profile.education) ? profile.education : [];

    this.profileForm = this.fb.group({
      nickname: [user.nickname || user.username || ''],
      email: [user.email || ''],
      phone: [user.phone || ''],
      avatar: [user.avatar || ''],
      bio: [user.bio || ''],
      workExperience: this.fb.array(
        (workExperience.length > 0 ? workExperience : [undefined]).map((experience: WorkExperience | undefined) =>
          this.createExperienceGroup(experience)
        )
      ),
      education: this.fb.array(
        (education.length > 0 ? education : [undefined]).map((item: Education | undefined) => this.createEducationGroup(item))
      ),
      technicalSkills: [this.joinListValue(profile.technicalSkills)],
      tools: [this.joinListValue(profile.tools)],
      languages: [this.joinListValue(profile.languages)]
    });

    this.resumeAiTargetJob = typeof profile.resumeTargetRole === 'string' ? profile.resumeTargetRole : '';
    this.selectedTemplate = this.isValidTemplate(profile.resumeTemplate) ? profile.resumeTemplate : 'formal';
    this.selectedTheme = this.isValidTheme(profile.resumeTheme) ? profile.resumeTheme : 'navy';
    this.selectedTone = this.isValidTone(profile.resumeToneStyle) ? profile.resumeToneStyle : 'campus';

    this.avatarPreviewUrl = '';
    this.selectedAvatarDataUrl = '';
    this.avatarMessage = '';
    this.avatarError = false;

    this.resumePreviewUrl = '';
    this.selectedResumeDataUrl = '';
    this.resumeMessage = '';
    this.resumeError = false;
    this.resumeRemoved = false;

    this.resumeAiLoading = false;
    this.resumeAiError = false;
    this.resumeAiMessage = '';
    this.resumeAiResult = null;
    this.resumeAiContext = null;
  }

  private createExperienceGroup(experience?: WorkExperience): FormGroup {
    const bulletLines = this.parseBulletLines(experience?.description || '');

    return this.fb.group({
      title: [experience?.title || ''],
      company: [experience?.company || ''],
      period: [experience?.period || ''],
      skills: [this.joinListValue(experience?.skills || [])],
      bullets: this.fb.array((bulletLines.length > 0 ? bulletLines : ['']).map((item) => this.fb.control(item)))
    });
  }

  private createEducationGroup(education?: Education): FormGroup {
    const highlights = this.parseBulletLines(education?.honors || '');

    return this.fb.group({
      school: [education?.school || ''],
      degree: [education?.degree || ''],
      gpa: [education?.gpa || ''],
      graduationYear: [education?.graduationYear || ''],
      status: [education?.status || '在读'],
      courses: [education?.courses || ''],
      highlights: this.fb.array((highlights.length > 0 ? highlights : ['']).map((item) => this.fb.control(item)))
    });
  }

  private collectExperiences(): WorkExperience[] {
    if (!this.profileForm) {
      return Array.isArray(this.user?.personalityProfile?.workExperience)
        ? this.user!.personalityProfile.workExperience
        : [];
    }

    return this.workExperienceArray.controls
      .map((control, index) => {
        const value = control.getRawValue();
        const bulletLines = this.getStringArray(this.getExperienceBullets(index));

        return {
          title: this.trimmedText(value.title),
          company: this.trimmedText(value.company),
          period: this.trimmedText(value.period),
          description: bulletLines.join('\n'),
          skills: this.parseListInput(value.skills)
        };
      })
      .filter((experience) => this.isExperienceFilled(experience));
  }

  private collectEducations(): Education[] {
    if (!this.profileForm) {
      return Array.isArray(this.user?.personalityProfile?.education)
        ? this.user!.personalityProfile.education
        : [];
    }

    return this.educationArray.controls
      .map((control, index) => {
        const value = control.getRawValue();
        const highlights = this.getStringArray(this.getEducationHighlightsArray(index));

        return {
          school: this.trimmedText(value.school),
          degree: this.trimmedText(value.degree),
          gpa: this.trimmedText(value.gpa),
          graduationYear: this.trimmedText(value.graduationYear),
          status: this.trimmedText(value.status),
          courses: this.joinListValue(value.courses),
          honors: highlights.join('\n')
        };
      })
      .filter((education) => this.isEducationFilled(education));
  }

  private isExperienceFilled(experience: WorkExperience): boolean {
    return Boolean(
      experience.title ||
        experience.company ||
        experience.period ||
        experience.description ||
        experience.skills.length > 0
    );
  }

  private isEducationFilled(education: Education): boolean {
    return Boolean(
      education.school ||
        education.degree ||
        education.gpa ||
        education.graduationYear ||
        education.courses ||
        education.honors
    );
  }

  private parseRequestedSection(section: string | null): ProfileSection {
    const normalized = (section || '').toLowerCase();
    return ['basic', 'education', 'experience', 'skills'].includes(normalized)
      ? (normalized as ProfileSection)
      : 'basic';
  }

  private applyRouteEntryState(): void {
    this.selectSection(this.routeSectionRequested, false);
  }

  private parseListInput(value: unknown): string[] {
    if (Array.isArray(value)) {
      return value.map((item) => this.trimmedText(item)).filter(Boolean);
    }

    return this.trimmedText(value)
      .split(/[\n,，、；;]+/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  private joinListValue(value: unknown): string {
    return this.parseListInput(value).join('、');
  }

  private parseBulletLines(value: unknown): string[] {
    const raw = this.trimmedText(value);

    if (!raw) {
      return [];
    }

    const newlineLines = raw
      .replace(/\r/g, '')
      .split('\n')
      .map((item) => this.sanitizeBulletLine(item))
      .filter(Boolean);

    if (newlineLines.length > 1) {
      return this.uniqueLines(newlineLines);
    }

    const sentenceLines = raw
      .split(/[；;。]/)
      .map((item) => this.sanitizeBulletLine(item))
      .filter(Boolean);

    return this.uniqueLines(sentenceLines);
  }

  private sanitizeBulletLine(value: string): string {
    return value
      .replace(/^[\s\-•●▪◦·\d\.\)\(]+/, '')
      .replace(/^\s*(亮点|成果|Result|Bullet)\s*\d*[:：-]\s*/i, '')
      .trim();
  }

  private uniqueLines(lines: string[]): string[] {
    return Array.from(new Set(lines.map((item) => item.trim()).filter(Boolean)));
  }

  private trimmedText(value: unknown): string {
    return typeof value === 'string' ? value.trim() : '';
  }

  private getStringArray(formArray: FormArray): string[] {
    return formArray.controls
      .map((control) => this.trimmedText(control.value))
      .filter(Boolean);
  }

  private replaceStringArray(formArray: FormArray, values: string[], minimumItems: number = 1): void {
    while (formArray.length > 0) {
      formArray.removeAt(formArray.length - 1);
    }

    const finalValues = values.length > 0 ? values : Array.from({ length: minimumItems }, () => '');
    finalValues.forEach((item) => formArray.push(this.fb.control(item)));
  }

  private isValidTemplate(value: unknown): value is ResumeTemplate {
    return value === 'formal' || value === 'executive' || value === 'compact';
  }

  private isValidTheme(value: unknown): value is ResumeTheme {
    return value === 'navy' || value === 'graphite' || value === 'emerald';
  }

  private isValidTone(value: unknown): value is ResumeTone {
    return value === 'campus' || value === 'result' || value === 'executive';
  }

  private runResumeOptimization(section: string, content: string, context: ResumeAiContext): void {
    if (!this.user?.id) {
      this.resumeAiError = true;
      this.resumeAiMessage = '当前用户信息缺失，请刷新页面后重试。';
      return;
    }

    this.resumeAiLoading = true;
    this.resumeAiError = false;
    this.resumeAiContext = context;
    this.resumeAiResult = null;
    this.resumeAiMessage = `正在按“${this.resumeTones.find((item) => item.id === this.selectedTone)?.label || '默认'}”风格处理 ${context.sectionLabel}，请稍候。`;

    this.aiApiService
      .optimizeResume(this.user.id, section, content, this.resumeAiTargetJob.trim() || undefined, this.selectedTone)
      .subscribe({
        next: (res) => {
          const data = res?.data || {};
          const suggestions = this.normalizeResumeSuggestions(data?.suggestions);
          const appliedDraft = this.buildResumeAiDraft(content, suggestions, data?.overall_tip);

          this.resumeAiResult = {
            score: typeof data?.score === 'number' ? data.score : null,
            issues: Array.isArray(data?.issues) ? data.issues.filter((item: unknown) => typeof item === 'string') : [],
            suggestions,
            overallTip: typeof data?.overall_tip === 'string' ? data.overall_tip : '',
            appliedDraft,
            sourcePreview: content,
            sectionLabel: context.sectionLabel,
            action: context.action
          };

          this.resumeAiLoading = false;

          if (context.autoApply) {
            this.applyDraftToForm(appliedDraft, context);
            this.resumeAiMessage = `${context.sectionLabel} 已完成快速整理，并同步到左侧草稿。`;
            return;
          }

          const actionText = context.action === 'check' ? '检查结果' : '改写建议';
          this.resumeAiMessage = `${context.sectionLabel} 的 ${actionText} 已生成，你可以在右侧继续查看并应用。`;
        },
        error: (err) => {
          this.resumeAiLoading = false;
          this.resumeAiError = true;
          this.resumeAiResult = null;
          this.resumeAiMessage = this.extractResumeAiError(err);
        }
      });
  }

  private applyDraftToForm(draft: string, context: ResumeAiContext): void {
    if (context.type === 'bio') {
      this.profileForm.patchValue({ bio: draft });
      return;
    }

    if (context.type === 'education' && context.educationIndex !== undefined) {
      const highlights = this.normalizeResumeBulletDraft(draft);
      this.replaceStringArray(this.getEducationHighlightsArray(context.educationIndex), highlights, 2);
      return;
    }

    if (context.type === 'experience' && context.experienceIndex !== undefined) {
      const bullets = this.normalizeResumeBulletDraft(draft);
      this.replaceStringArray(this.getExperienceBullets(context.experienceIndex), bullets, 3);
    }
  }

  private normalizeResumeSuggestions(value: unknown): ResumeAiSuggestion[] {
    if (!Array.isArray(value)) {
      return [];
    }

    return value
      .map((item: any) => ({
        original: this.sanitizeAiLine(typeof item?.original === 'string' ? item.original : ''),
        improved: this.sanitizeAiLine(typeof item?.improved === 'string' ? item.improved : ''),
        reason: this.sanitizeAiLine(typeof item?.reason === 'string' ? item.reason : '')
      }))
      .filter((item) => item.original || item.improved || item.reason);
  }

  private sanitizeAiLine(value: string): string {
    return value
      .replace(/^建议[：:\s]*/i, '')
      .replace(/^可写成[：:\s]*/i, '')
      .replace(/^改成[：:\s]*/i, '')
      .trim();
  }

  private buildResumeAiDraft(content: string, suggestions: ResumeAiSuggestion[], overallTip?: string): string {
    const improved = suggestions
      .map((item) => item.improved.trim())
      .filter(Boolean);

    if (improved.length > 0) {
      return improved.join('\n');
    }

    if (typeof overallTip === 'string' && overallTip.trim()) {
      return overallTip.trim();
    }

    return content;
  }

  private normalizeResumeBulletDraft(value: string): string[] {
    const lines = this.parseBulletLines(value).filter(
      (item) => !/^(职位|岗位|公司|时间|技能|学校|专业|教育|项目)\s*[:：]/i.test(item)
    );

    if (lines.length > 0) {
      return lines;
    }

    return [this.trimmedText(value)].filter(Boolean);
  }

  private extractResumeAiError(err: any): string {
    const detail = err?.error?.detail ?? err?.error?.message ?? err?.message;

    if (Array.isArray(detail)) {
      return detail
        .map((item) => item?.msg || item?.message || JSON.stringify(item))
        .join('；');
    }

    if (detail && typeof detail === 'object') {
      if (typeof detail.message === 'string') {
        return detail.message;
      }

      return JSON.stringify(detail);
    }

    if (typeof detail === 'string' && detail.trim()) {
      return detail;
    }

    return '简历优化失败，请稍后重试。';
  }

  private async renderResumeCanvas(): Promise<HTMLCanvasElement> {
    const element = this.resumeExportSurface?.nativeElement;

    if (!element) {
      throw new Error('Resume export surface is not ready.');
    }

    await new Promise((resolve) => setTimeout(resolve, 120));

    return html2canvas(element, {
      scale: 2,
      backgroundColor: '#ffffff',
      useCORS: true,
      windowWidth: element.scrollWidth,
      windowHeight: element.scrollHeight
    });
  }

  private buildExportFilename(): string {
    const safeName = this.previewName.replace(/[\\/:*?"<>|]/g, '').trim() || '校园招聘简历';
    const templateLabel = this.resumeTemplates.find((item) => item.id === this.selectedTemplate)?.label || 'A4';
    return `${safeName}-${templateLabel}`;
  }

  private downloadDataUrl(dataUrl: string, filename: string): void {
    const anchor = document.createElement('a');
    anchor.href = dataUrl;
    anchor.download = filename;
    anchor.click();
    anchor.remove();
  }
}
