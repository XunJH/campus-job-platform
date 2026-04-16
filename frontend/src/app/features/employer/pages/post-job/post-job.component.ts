import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { JobService } from '../../../../core/services/job.service';

@Component({
  selector: 'app-post-job',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './post-job.component.html',
  styleUrls: ['./post-job.component.scss']
})
export class PostJobComponent {
  postForm: FormGroup;
  isSubmitting = false;
  message = '';
  error = false;

  constructor(
    private fb: FormBuilder,
    private jobService: JobService,
    private router: Router
  ) {
    this.postForm = this.fb.group({
      title: ['', Validators.required],
      description: ['', Validators.required],
      requirements: ['', Validators.required],
      salary: [null, [Validators.required, Validators.min(0)]],
      salaryType: ['monthly', Validators.required],
      location: ['', Validators.required],
      jobType: ['part_time', Validators.required],
      workingHours: [''],
      deadline: ['']
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
