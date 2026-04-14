/**
 * @功能 用户角色枚举
 * @说明 student = 学生，employer = 企业，admin = 管理员
 */
export enum UserRole {
  STUDENT = 'student',
  EMPLOYER = 'employer',
  ADMIN = 'admin'
}

/**
 * @功能 用户认证状态枚举
 */
export enum AuthStatus {
  PENDING = 'pending',      // 待认证
  APPROVED = 'approved',    // 已通过
  REJECTED = 'rejected'     // 已拒绝
}

/**
 * @功能 用户基础信息接口
 */
export interface User {
  id: string;
  username?: string;
  email: string;
  phone?: string;
  nickname: string;
  avatar?: string;
  bio?: string;
  role: UserRole;
  status: AuthStatus;
  createdAt: string;
  updatedAt: string;
}

/**
 * @功能 登录凭证接口
 * @说明 后端使用 username 字段，支持用户名或邮箱登录
 */
export interface LoginCredentials {
  username: string;
  password: string;
  remember?: boolean;
}

/**
 * @功能 注册数据接口
 */
export interface RegisterData {
  email: string;
  password: string;
  confirmPassword?: string;
  nickname?: string;
  username: string;
  role: UserRole;
  phone?: string;
}

/**
 * @功能 认证响应接口
 */
export interface AuthResponse {
  token: string;
  user: User;
  expiresIn?: number;
}
