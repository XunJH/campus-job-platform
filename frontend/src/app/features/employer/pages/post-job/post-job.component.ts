import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { JobService } from '../../../../core/services/job.service';
import { AiApiService } from '../../../../core/services/ai-api.service';

@Component({
  selector: 'app-post-job',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, FormsModule],
  templateUrl: './post-job.component.html',
  styleUrls: ['./post-job.component.scss']
})
export class PostJobComponent implements OnInit {
  postForm: FormGroup;
  isSubmitting = false;
  message = '';
  error = false;
  jobId: number | null = null;
  isEditMode = false;
  loading = false;

  /** 智能JD生成 */
  jdKeywords = '';
  jdCompanyType = '';
  jdLoading = false;
  jdResult: any = null;

  categories = ['技术类', '教学类', '配送类', '营销类'];
  workLocations = [
    { value: 'on_campus', label: '校内' },
    { value: 'remote', label: '远程' },
    { value: 'hybrid', label: '混合' }
  ];

  constructor(
    private fb: FormBuilder,
    private jobService: JobService,
    private aiApi: AiApiService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.postForm = this.fb.group({
      title: ['', Validators.required],
      description: ['', Validators.required],
      requirements: ['', Validators.required],
      salary: [null, [Validators.required, Validators.min(0)]],
      salaryType: ['monthly', Validators.required],
      location: ['', Validators.required],
      workLocation: ['on_campus'],
      category: ['其他'],
      jobType: ['part_time', Validators.required],
      workingHours: [''],
      deadline: ['']
    });
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.jobId = parseInt(id, 10);
      this.isEditMode = true;
      this.loadJob();
    }
  }

  loadJob(): void {
    if (!this.jobId) return;
    this.loading = true;
    this.jobService.getJobById(this.jobId).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          const job = res.data;
          const deadline = job.deadline ? job.deadline.slice(0, 10) : '';
          this.postForm.patchValue({
            title: job.title,
            description: job.description,
            requirements: job.requirements || '',
            salary: job.salary,
            salaryType: job.salaryType || 'monthly',
            location: job.location,
            workLocation: job.workLocation || 'on_campus',
            category: job.category || '其他',
            jobType: job.jobType || 'part_time',
            workingHours: job.workingHours || '',
            deadline: deadline
          });
        }
        this.loading = false;
      },
      error: () => {
        this.error = true;
        this.message = '加载岗位信息失败';
        this.loading = false;
      }
    });
  }

  onSubmit(): void {
    if (this.postForm.invalid) {
      this.postForm.markAllAsTouched();
      return;
    }
    this.isSubmitting = true;
    this.message = '';
    this.error = false;

    const data = { ...this.postForm.value };
    if (data.deadline) {
      data.deadline = new Date(data.deadline).toISOString();
    }

    if (this.isEditMode && this.jobId) {
      this.jobService.updateJob(this.jobId, data).subscribe({
        next: (res) => {
          this.isSubmitting = false;
          this.message = res.message || '岗位更新成功';
          setTimeout(() => this.router.navigate(['/employer/jobs']), 1500);
        },
        error: (err) => {
          this.isSubmitting = false;
          this.error = true;
          this.message = err.error?.message || '更新失败，请稍后重试';
        }
      });
    } else {
      this.jobService.createJob(data).subscribe({
        next: (res) => {
          this.isSubmitting = false;
          this.message = res.message || '岗位发布成功，等待管理员审核';
          setTimeout(() => this.router.navigate(['/employer/dashboard']), 1500);
        },
        error: (err) => {
          this.isSubmitting = false;
          this.error = true;
          this.message = err.error?.message || '发布失败，请稍后重试';
        }
      });
    }
  }

  // ==================== 智能JD生成 ====================

  generateJd(): void {
    const title = this.postForm.value.title?.trim();
    if (!title) {
      this.message = '请先在基本信息中填写岗位标题';
      this.error = true;
      return;
    }
    this.jdLoading = true;
    this.message = '';
    this.error = false;

    const keywords = this.jdKeywords
      ? this.jdKeywords.split(/[,，、]/).map((s: string) => s.trim()).filter((s: string) => s)
      : [];

    this.aiApi.generateJd(title, keywords, this.jdCompanyType.trim()).subscribe({
      next: (res) => {
        this.jdResult = res.data || res;
        this.jdLoading = false;
        // 自动填充到表单
        this.applyJdToForm();
      },
      error: () => {
        this.jdLoading = false;
        this.message = 'JD生成失败，请稍后重试';
        this.error = true;
      }
    });
  }

  applyJdToForm(): void {
    if (!this.jdResult) return;
    const responsibilities = (this.jdResult.responsibilities || []).join('\n');
    const requirements = (this.jdResult.requirements || []).join('\n');
    const description = `岗位职责：\n${responsibilities}\n\n福利待遇：\n${(this.jdResult.benefits || []).join('\n')}`;
    this.postForm.patchValue({
      description,
      requirements
    });
    this.message = 'JD已自动生成并填充到下方，请检查后再发布';
    this.error = false;
  }

  logout(): void {
    localStorage.removeItem('campus_job_token');
    this.router.navigate(['/auth/login']);
  }
}
