import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { User } from '../../models/user.model';

@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly API_URL = '/api/v1/auth';

  constructor(private http: HttpClient) {}

  getProfile(): Observable<{ success: boolean; data: User }> {
    return this.http.get<any>(`${this.API_URL}/profile`);
  }

  updateProfile(data: Partial<User>): Observable<{ success: boolean; message: string; data: User }> {
    return this.http.put<any>(`${this.API_URL}/profile`, data);
  }
}
