import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, map } from 'rxjs';
import { tap } from 'rxjs/operators';
import { User, LoginCredentials, RegisterData } from '../../models/user.model';

@Injectable({ providedIn: 'root' })
export class AuthService {
  
  private readonly API_URL = 'http://localhost:3001/api/v1/auth';
  private tokenKey = 'campus_job_token';
  private rememberKey = 'campus_job_remember';
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor(private http: HttpClient) {
    this.loadStoredAuth();
  }

  login(credentials: LoginCredentials): Observable<User> {
    return this.http.post<any>(`${this.API_URL}/login`, credentials).pipe(
      tap(response => {
        if (response.success && response.data?.token) {
          this.setToken(response.data.token);
          if (credentials.remember) {
            this.setRememberCredentials(credentials.username, credentials.password);
          } else {
            this.clearRememberCredentials();
          }
        }
      }),
      map(response => {
        if (response.success && response.data?.user) {
          return this.mapUser(response.data.user);
        }
        throw new Error(response.message || '登录失败');
      })
    );
  }

  register(data: RegisterData): Observable<User> {
    return this.http.post<any>(`${this.API_URL}/register`, data).pipe(
      tap(response => {
        if (response.success && response.data?.token) {
          this.setToken(response.data.token);
        }
      }),
      map(response => {
        if (response.success && response.data?.user) {
          return this.mapUser(response.data.user);
        }
        throw new Error(response.message || '注册失败');
      })
    );
  }

  logout(): void {
    localStorage.removeItem(this.tokenKey);
    this.currentUserSubject.next(null);
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  getRememberCredentials(): { username: string; password: string } | null {
    const data = localStorage.getItem(this.rememberKey);
    return data ? JSON.parse(data) : null;
  }

  private setToken(token: string): void {
    localStorage.setItem(this.tokenKey, token);
  }

  private setRememberCredentials(username: string, password: string): void {
    localStorage.setItem(this.rememberKey, JSON.stringify({ username, password }));
  }

  private clearRememberCredentials(): void {
    localStorage.removeItem(this.rememberKey);
  }

  private mapUser(backendUser: any): User {
    return {
      id: backendUser.id?.toString() || '',
      email: backendUser.email || '',
      phone: backendUser.phone || '',
      nickname: backendUser.username || '',
      avatar: backendUser.avatar || '',
      role: backendUser.role || 'student',
      status: backendUser.status || 'active',
      createdAt: backendUser.createdAt || '',
      updatedAt: backendUser.updatedAt || ''
    };
  }

  private loadStoredAuth(): void {
    const token = this.getToken();
    if (token) {
      // TODO: 验证 token 有效性
    }
  }
}