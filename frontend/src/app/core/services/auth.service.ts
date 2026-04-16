import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, map } from 'rxjs';
import { tap } from 'rxjs/operators';
import { User, LoginCredentials, RegisterData } from '../../models/user.model';

@Injectable({ providedIn: 'root' })
export class AuthService {
  
  private readonly API_URL = '/api/v1/auth';
  private tokenKey = 'campus_job_token';
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
      createdAt: backendUser.createdAt || '',
      updatedAt: backendUser.updatedAt || ''
    };
  }

  private loadStoredAuth(): void {
    const token = this.getToken();
    if (token) {
      this.http.get<any>(`${this.API_URL}/profile`).subscribe({
        next: (res) => {
          if (res.success && res.data) {
            this.currentUserSubject.next(this.mapUser(res.data));
          }
        },
        error: () => {
          this.logout();
        }
      });
    }
  }
}
