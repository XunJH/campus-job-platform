export interface User {
  id: number;
  username: string;
  email: string;
  role: 'student' | 'employer' | 'admin';
  status: 'active' | 'inactive' | 'banned';
  avatar?: string;
  phone?: string;
  bio?: string;
  last_login_at?: string;
  created_at: string;
  updated_at: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  user: User;
}
