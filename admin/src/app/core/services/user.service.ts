import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { User } from '../../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private apiUrl = 'http://localhost:3001/api/v1';

  constructor(private http: HttpClient) { }

  getUsers(page: number = 1, limit: number = 10): Observable<{ users: User[], total: number }> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());
    return this.http.get<{ users: User[], total: number }>(`${this.apiUrl}/users`, { params });
  }

  getUserById(id: number): Observable<User> {
    return this.http.get<User>(`${this.apiUrl}/users/${id}`);
  }

  updateUserStatus(id: number, status: 'active' | 'inactive' | 'banned'): Observable<User> {
    return this.http.patch<User>(`${this.apiUrl}/users/${id}/status`, { status });
  }

  deleteUser(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/users/${id}`);
  }
}
