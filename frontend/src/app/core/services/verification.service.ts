import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface VerificationStatus {
  status: 'unsubmitted' | 'pending' | 'approved' | 'rejected';
  companyName?: string;
  licenseNumber?: string;
  contactName?: string;
  contactPhone?: string;
  licenseImage?: string;
  address?: string;
  city?: string;
  industry?: string;
  scale?: string;
  website?: string;
  otherQualifications?: string;
  rejectionReason?: string;
  submittedAt?: string;
  reviewedAt?: string;
}

export interface VerificationApplyData {
  companyName: string;
  licenseNumber: string;
  contactName: string;
  contactPhone: string;
  licenseImage: string;
  address?: string;
  city?: string;
  industry?: string;
  scale?: string;
  website?: string;
  otherQualifications?: string;
}

@Injectable({ providedIn: 'root' })
export class VerificationService {
  private readonly API_URL = '/api/v1/verification';

  constructor(private http: HttpClient) {}

  getStatus(): Observable<{ success: boolean; message: string; data: VerificationStatus }> {
    return this.http.get<any>(`${this.API_URL}/status`);
  }

  apply(data: VerificationApplyData): Observable<{ success: boolean; message: string; data: any }> {
    return this.http.post<any>(`${this.API_URL}/apply`, data);
  }
}
