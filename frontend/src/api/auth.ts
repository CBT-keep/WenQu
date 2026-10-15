import { ApiError, http, unwrap } from '@/lib/http'
import type { ApiResponse } from '@/types/api'
import type { LoginRequest, RefreshRequest, TokenData, UserInfo } from '@/types/auth'

/**
 * 后端尚未就绪时（backend/src 里还没有 Auth 相关类），
 * 用 VITE_USE_MOCK=1 让登录页能独立联调：admin / admin@123 通过，其余报 20001。
 */
const USE_MOCK = import.meta.env.VITE_USE_MOCK === '1'

const MOCK_USER: UserInfo = {
  id: 1,
  username: 'admin',
  nickname: '系统管理员',
  role: 'SUPERADMIN',
  status: 'ENABLED',
}

function mockLogin(payload: LoginRequest): Promise<TokenData> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (payload.username === 'admin' && payload.password === 'admin@123') {
        resolve({
          tokenType: 'Bearer',
          accessToken: 'mock-access-token',
          refreshToken: 'mock-refresh-token',
          expiresIn: 7200,
          mustChangePassword: false,
          user: MOCK_USER,
        })
      } else {
        reject(new ApiError(20001, '用户名或密码错误'))
      }
    }, 600)
  })
}

/** POST /auth/login —— doc/04 §3.1 */
export function login(payload: LoginRequest): Promise<TokenData> {
  if (USE_MOCK) return mockLogin(payload)
  return unwrap(http.post<ApiResponse<TokenData>>('/auth/login', payload))
}

/** POST /auth/refresh —— doc/04 §3.2 */
export function refresh(payload: RefreshRequest): Promise<TokenData> {
  return unwrap(http.post<ApiResponse<TokenData>>('/auth/refresh', payload))
}

/** POST /auth/logout —— doc/04 §3.3 */
export async function logout(): Promise<void> {
  if (USE_MOCK) return
  await unwrap(http.post<ApiResponse<null>>('/auth/logout'))
}

/** GET /auth/me —— doc/04 §3.4 */
export function fetchMe(): Promise<UserInfo> {
  if (USE_MOCK) return Promise.resolve(MOCK_USER)
  return unwrap(http.get<ApiResponse<UserInfo>>('/auth/me'))
}

export const isMockMode = USE_MOCK
