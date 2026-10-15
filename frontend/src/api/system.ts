import { http, unwrap } from '@/lib/http'
import { mockEnabled, mockDelay } from '@/lib/mock'
import { downloadBlob, saveBlob } from '@/lib/download'
import type { ApiResponse, PageResult } from '@/types/api'
import type {
  DashboardStats,
  HealthComponent,
  LogQuery,
  OperationLog,
  SettingGroup,
  SettingItem,
  SettingUpdatePayload,
  SystemInfo,
  UsageTrend,
} from '@/types/system'
import * as mock from '@/mock/system'

/** 系统管理 API —— doc/04 第九部分。 */

export function fetchSettings(group?: SettingGroup): Promise<SettingItem[]> {
  if (mockEnabled('system')) return mockDelay(mock.mockSettingList(group))
  return unwrap(http.get<ApiResponse<SettingItem[]>>('/system/settings', { params: { group } }))
}

export async function updateSettings(payload: SettingUpdatePayload): Promise<{ updated: number }> {
  if (mockEnabled('system')) return mockDelay({ updated: mock.mockSettingUpdate(payload.items) })
  return unwrap(http.put<ApiResponse<{ updated: number }>>('/system/settings', payload))
}

export function fetchLogs(q: LogQuery): Promise<PageResult<OperationLog>> {
  if (mockEnabled('system')) return mockDelay(mock.mockLogPage(q))
  return unwrap(http.get<ApiResponse<PageResult<OperationLog>>>('/system/logs', { params: q }))
}

export function fetchLogDetail(id: number): Promise<OperationLog> {
  if (mockEnabled('system')) {
    const l = mock.mockLogDetail(id)
    return l ? mockDelay(l) : Promise.reject(new Error('日志不存在'))
  }
  return unwrap(http.get<ApiResponse<OperationLog>>(`/system/logs/${id}`))
}

export async function exportLogs(q: LogQuery): Promise<string> {
  if (mockEnabled('system')) {
    const name = 'operation-logs.csv'
    saveBlob(new Blob([mock.mockLogExportCsv()], { type: 'text/csv;charset=utf-8' }), name)
    return mockDelay(name)
  }
  return downloadBlob('/system/logs/export', { params: q as Record<string, unknown>, fallbackName: 'operation-logs.csv' })
}

export function fetchDashboardStats(): Promise<DashboardStats> {
  if (mockEnabled('system')) return mockDelay(mock.mockDashboardStats())
  return unwrap(http.get<ApiResponse<DashboardStats>>('/system/dashboard/stats'))
}

export function fetchUsageTrend(days = 14): Promise<UsageTrend> {
  if (mockEnabled('system')) return mockDelay(mock.mockUsageTrend(days))
  return unwrap(http.get<ApiResponse<UsageTrend>>('/system/dashboard/usage', { params: { days } }))
}

export function fetchHealthComponents(): Promise<HealthComponent[]> {
  if (mockEnabled('system')) return mockDelay(mock.mockHealth())
  return unwrap(http.get<ApiResponse<HealthComponent[]>>('/system/health/components'))
}

export function fetchSystemInfo(): Promise<SystemInfo> {
  if (mockEnabled('system')) return mockDelay(mock.mockSystemInfo())
  return unwrap(http.get<ApiResponse<SystemInfo>>('/system/info'))
}
