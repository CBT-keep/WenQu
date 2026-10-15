/** 认证相关类型 —— doc/04 §3.1 登录 / §3.2 刷新 / §3.4 当前用户 */

export type UserRole = 'USER' | 'ADMIN' | 'SUPERADMIN'
export type UserStatus = 'ENABLED' | 'DISABLED'

export interface UserInfo {
  id: number
  username: string
  nickname: string
  role: UserRole
  status: UserStatus
}

export interface LoginRequest {
  username: string
  password: string
}

export interface RefreshRequest {
  refreshToken: string
}

export interface TokenData {
  tokenType: string
  accessToken: string
  refreshToken: string
  expiresIn: number
  /** true 时前端应强制进入修改密码页（doc/04 §3.1） */
  mustChangePassword: boolean
  user?: UserInfo
}
