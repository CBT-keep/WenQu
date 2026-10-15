import { http, unwrap } from '@/lib/http'
import type { ApiResponse } from '@/types/api'
import type {
  ChangePasswordRequest,
  LoginRequest,
  RefreshRequest,
  TokenData,
  UserInfo,
} from '@/types/auth'
import { tokenStorage } from '@/lib/token'

/** POST /auth/login —— doc/04 §3.1 */
export function login(payload: LoginRequest): Promise<TokenData> {
  return unwrap(http.post<ApiResponse<TokenData>>('/auth/login', payload))
}

/** POST /auth/refresh —— doc/04 §3.2 */
export function refresh(payload: RefreshRequest): Promise<TokenData> {
  return unwrap(http.post<ApiResponse<TokenData>>('/auth/refresh', payload))
}

/**
 * POST /auth/logout —— doc/04 §3.3
 * 带上 refreshToken 后端只吊销这一个；不带则吊销该用户全部令牌。
 */
export async function logout(): Promise<void> {
  const refreshToken = tokenStorage.getRefreshToken()
  try {
    await unwrap(http.post<ApiResponse<null>>('/auth/logout', refreshToken ? { refreshToken } : {}))
  } finally {
    // 后端调用失败也要清本地，不能把用户卡在"已登出但还有 token"的状态
    tokenStorage.clear()
  }
}

/** GET /auth/me —— doc/04 §3.4 */
export function fetchMe(): Promise<UserInfo> {
  return unwrap(http.get<ApiResponse<UserInfo>>('/auth/me'))
}

/** PUT /auth/me/password —— doc/04 §3.6，改密成功后后端会吊销全部 refresh token */
export function changePassword(payload: ChangePasswordRequest): Promise<null> {
  return unwrap(http.put<ApiResponse<null>>('/auth/me/password', payload))
}
