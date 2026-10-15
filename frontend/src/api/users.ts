import { http, unwrap } from '@/lib/http'
import type { ApiResponse, PageResult } from '@/types/api'
import type { UserInfo } from '@/types/auth'

/** 用户管理 —— doc/04 §3.7-3.10 */

export interface UsersQuery {
  page: number
  size: number
  keyword?: string
  role?: string
  status?: string
}

export interface CreateUserPayload {
  username: string
  password: string
  nickname?: string
  email?: string
  role: string
}

export interface UpdateUserPayload {
  nickname?: string
  email?: string
  role?: string
}

/** 重置密码的响应：新密码明文仅此一次下发 */
export interface ResetPasswordResult {
  userId: number
  username: string
  newPassword: string
}

export function fetchUsers(params: UsersQuery) {
  return unwrap(http.get<ApiResponse<PageResult<UserInfo>>>('/users', { params }))
}

export function createUser(payload: CreateUserPayload) {
  return unwrap(http.post<ApiResponse<UserInfo>>('/users', payload))
}

export function updateUser(id: number, payload: UpdateUserPayload) {
  return unwrap(http.put<ApiResponse<UserInfo>>(`/users/${id}`, payload))
}

export function deleteUser(id: number) {
  return unwrap(http.delete<ApiResponse<null>>(`/users/${id}`))
}

export function changeUserStatus(id: number, status: string) {
  return unwrap(http.put<ApiResponse<UserInfo>>(`/users/${id}/status`, { status }))
}

export function resetUserPassword(id: number, newPassword?: string) {
  return unwrap(
    http.put<ApiResponse<ResetPasswordResult>>(`/users/${id}/password`, newPassword ? { newPassword } : {}),
  )
}
