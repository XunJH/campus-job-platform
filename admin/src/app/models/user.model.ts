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
  createdAt: string;
  updatedAt: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  role?: 'student' | 'employer' | 'admin';
}

export interface LoginResponse {
  success: boolean;
  message: string;
  data: {
    token: string;
    user: User;
  };
}

export interface RegisterResponse {
  success: boolean;
  message: string;
  data: {
    token: string;
    user: User;
  };
}
