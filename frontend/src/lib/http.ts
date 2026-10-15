import axios from 'axios'
import type { AxiosResponse, InternalAxiosRequestConfig } from 'axios'
import type { ApiResponse } from '@/types/api'
import type { TokenData } from '@/types/auth'
import { tokenStorage } from './token'

/** 业务异常：code≠0 的统一响应体都会转成它（doc/04 §1.3） */
export class ApiError extends Error {
  readonly code: number
  readonly traceId?: string

  constructor(code: number, message: string, traceId?: string) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.traceId = traceId
  }
}

const BASE_URL = '/api/v1'

/**
 * 不带任何拦截器的裸实例 —— 刷新令牌必须用它，
 * 否则刷新请求自己 401 会递归进刷新逻辑。
 */
const plain = axios.create({
  baseURL: BASE_URL,
  timeout: 30_000,
  headers: { 'Content-Type': 'application/json' },
})

export const http = axios.create({
  baseURL: BASE_URL,
  timeout: 30_000,
  headers: { 'Content-Type': 'application/json' },
})

http.interceptors.request.use((config) => {
  const token = tokenStorage.getAccessToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

type RetriableConfig = InternalAxiosRequestConfig & { _retried?: boolean }

let refreshPromise: Promise<string> | null = null

function refreshAccessToken(): Promise<string> {
  if (refreshPromise) return refreshPromise
  const refreshToken = tokenStorage.getRefreshToken()
  if (!refreshToken) return Promise.reject(new ApiError(20004, '未登录'))

  refreshPromise = plain
    .post<ApiResponse<TokenData>>('/auth/refresh', { refreshToken })
    .then((res) => {
      const body = res.data
      if (body.code !== 0) throw new ApiError(body.code, body.message, body.traceId)
      tokenStorage.setTokens(body.data.accessToken, body.data.refreshToken)
      return body.data.accessToken
    })
    .finally(() => {
      refreshPromise = null
    })

  return refreshPromise
}

function redirectToLogin() {
  tokenStorage.clear()
  if (window.location.pathname !== '/login') {
    window.location.replace('/login?expired=1')
  }
}

http.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    if (!axios.isAxiosError(error)) return Promise.reject(error)

    const status = error.response?.status
    const code = (error.response?.data as ApiResponse<unknown> | undefined)?.code
    const config = error.config as RetriableConfig | undefined

    const isAuthError = status === 401 || code === 20003
    const isRefreshCall = config?.url?.includes('/auth/refresh')

    // 非鉴权错误、无 config、已重试过一次 → 直接抛给调用方（由调用方 toast）
    if (!isAuthError || isRefreshCall || !config || config._retried) {
      return Promise.reject(error)
    }

    config._retried = true
    try {
      const token = await refreshAccessToken()
      config.headers.Authorization = `Bearer ${token}`
      return http.request(config)
    } catch {
      redirectToLogin()
      return Promise.reject(error)
    }
  },
)

/** 拆统一响应体：code≠0 抛 ApiError，否则返回 data（doc/04 附录 1） */
export async function unwrap<T>(promise: Promise<AxiosResponse<ApiResponse<T>>>): Promise<T> {
  const res = await promise
  const body = res.data
  if (!body || typeof body.code !== 'number') {
    throw new ApiError(-1, '响应格式不正确')
  }
  if (body.code !== 0) {
    throw new ApiError(body.code, body.message, body.traceId)
  }
  return body.data
}

/** 把 axios 错误归一化成 ApiError，方便 UI 直接取 message */
export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error
  if (axios.isAxiosError(error)) {
    const body = error.response?.data as ApiResponse<unknown> | undefined
    if (body && typeof body.code === 'number') {
      return new ApiError(body.code, body.message, body.traceId)
    }
    if (error.code === 'ECONNABORTED') return new ApiError(-1, '请求超时，请稍后重试')
    if (!error.response) return new ApiError(-1, '无法连接服务，请检查后端是否已启动')
    return new ApiError(-1, error.message || '网络异常')
  }
  return new ApiError(-1, error instanceof Error ? error.message : '未知错误')
}

export { plain as httpPlain }
