import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { User } from '../../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private apiUrl = environment.apiBaseUrl;

  constructor(private http: HttpClient) { }

  getUsers(page: number = 1, limit: number = 10, search?: string): Observable<{ users: User[]; total: number }> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());
    if (search) {
      params = params.set('search', search);
    }
    return this.http.get<{ users: User[]; total: number }>(`${this.apiUrl}/users`, { params });
  }

  getUserById(id: number): Observable<{ user: User }> {
    return this.http.get<{ user: User }>(`${this.apiUrl}/users/${id}`);
  }

  updateUserStatus(id: number, status: 'active' | 'inactive' | 'banned'): Observable<{ user: User }> {
    return this.http.patch<{ user: User }>(`${this.apiUrl}/users/${id}/status`, { status });
  }

  deleteUser(id: number): Observable<{ success: boolean; message: string }> {
    return this.http.delete<{ success: boolean; message: string }>(`${this.apiUrl}/users/${id}`);
  }
}
