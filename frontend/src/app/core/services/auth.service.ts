import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, map, catchError } from 'rxjs';
import { tap } from 'rxjs/operators';
import { User, LoginCredentials, RegisterData } from '../../models/user.model';

@Injectable({ providedIn: 'root' })
export class AuthService {
  
  private readonly API_URL = '/api/v1/auth';
  private tokenKey = 'campus_job_token';
  private userKey = 'campus_job_user';
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
        }
      }),
      map(response => {
        if (response.success && response.data?.user) {
          const user = this.mapUser(response.data.user);
          this.currentUserSubject.next(user);
          return user;
        }
        throw new Error(response.message || '登录失败');
      }),
      catchError(error => {
        const msg = error.error?.message || error.message || '登录失败，请稍后重试';
        throw new Error(msg);
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
          const user = this.mapUser(response.data.user);
          this.currentUserSubject.next(user);
          return user;
        }
        throw new Error(response.message || '注册失败');
      }),
      catchError(error => {
        const msg = error.error?.message || error.message || '注册失败，请稍后重试';
        throw new Error(msg);
      })
    );
  }

  logout(): void {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.userKey);
    this.currentUserSubject.next(null);
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  updateCurrentUser(user: User): void {
    this.currentUserSubject.next(user);
    localStorage.setItem(this.userKey, JSON.stringify(user));
  }

  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  private setToken(token: string): void {
    localStorage.setItem(this.tokenKey, token);
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
      personalityProfile: backendUser.personalityProfile || null,
      personalityProfileCompletedAt: backendUser.personalityProfileCompletedAt || null,
      createdAt: backendUser.createdAt || '',
      updatedAt: backendUser.updatedAt || ''
    };
  }

  private loadStoredAuth(): void {
    const token = this.getToken();
    if (!token) return;

    // 优先从本地缓存恢复，避免页面刷新后数据闪烁
    const cachedUser = localStorage.getItem(this.userKey);
    if (cachedUser) {
      try {
        this.currentUserSubject.next(JSON.parse(cachedUser));
      } catch {
        localStorage.removeItem(this.userKey);
      }
    }

    // 异步从后端同步最新数据
    this.http.get<any>(`${this.API_URL}/profile`).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          const user = this.mapUser(res.data);
          this.currentUserSubject.next(user);
          localStorage.setItem(this.userKey, JSON.stringify(user));
        }
      },
      error: () => {
        // 仅当没有缓存时才登出
        if (!cachedUser) {
          this.logout();
        }
      }
    });
  }
}
