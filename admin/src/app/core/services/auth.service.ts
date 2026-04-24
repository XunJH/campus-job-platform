import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { LoginRequest, LoginResponse, RegisterRequest, RegisterResponse, User } from '../../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = environment.apiBaseUrl;

  constructor(private http: HttpClient) { }

  login(credentials: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/auth/admin-login`, credentials).pipe(
      tap(res => {
        if (res.data?.token) {
          localStorage.setItem('campus_job_token', res.data.token);
          localStorage.setItem('campus_job_user', JSON.stringify(res.data.user));
        }
      })
    );
  }

  register(data: RegisterRequest): Observable<RegisterResponse> {
    return this.http.post<RegisterResponse>(`${this.apiUrl}/auth/register`, data);
  }

  createAdmin(data: RegisterRequest): Observable<RegisterResponse> {
    return this.http.post<RegisterResponse>(`${this.apiUrl}/auth/create-admin`, data);
  }

  logout(): void {
    localStorage.removeItem('campus_job_token');
    localStorage.removeItem('campus_job_user');
  }

  getToken(): string | null {
    return localStorage.getItem('campus_job_token');
  }

  getUser(): User | null {
    const userStr = localStorage.getItem('campus_job_user');
    if (!userStr) return null;
    try {
      return JSON.parse(userStr) as User;
    } catch {
      this.logout();
      return null;
    }
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  isAdmin(): boolean {
    const user = this.getUser();
    return user?.role === 'admin';
  }

  getProfile(): Observable<any> {
    return this.http.get(`${this.apiUrl}/auth/profile`);
  }

  setUser(user: User): void {
    localStorage.setItem('campus_job_user', JSON.stringify(user));
  }
}
