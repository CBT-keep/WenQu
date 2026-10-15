/** 系统管理类型 —— 严格对齐 doc/04 第九部分。 */

export type SettingGroup = 'RAG' | 'SQLBot' | 'Security' | 'System'
export type SettingValueType = 'STRING' | 'INT' | 'DOUBLE' | 'BOOLEAN' | 'JSON'

export interface SettingItem {
  key: string
  value: string
  valueType: SettingValueType
  group: SettingGroup
  description?: string
  updatedBy?: string | null
  updatedAt?: string | null
}

export interface SettingUpdatePayload {
  items: { key: string; value: string }[]
}

export type LogType = 'LOGIN' | 'KB' | 'DOC' | 'CHAT' | 'SQL' | 'SYSTEM'
export type LogResult = 'SUCCESS' | 'FAILURE'

export interface OperationLog {
  id: number
  userId?: number | null
  username?: string | null
  type: LogType
  action: string
  target?: string | null
  detail?: string | null
  ip?: string | null
  userAgent?: string | null
  result: LogResult
  traceId?: string | null
  createdAt: string
}

export interface LogQuery {
  page?: number
  size?: number
  type?: LogType | ''
  userId?: number
  keyword?: string
  result?: LogResult | ''
  startTime?: string
  endTime?: string
}

export interface DashboardStats {
  kbCount: number
  documentCount: number
  chunkCount: number
  todayChatCount: number
  todaySqlCount: number
  sqlSuccessRate: number
  todayPromptTokens: number
  todayCompletionTokens: number
  datasourceCount: number
  activeUserCount: number
}

export interface UsagePoint {
  date: string
  chatCount: number
  sqlCount: number
  tokens: number
}

export interface UsageTrend {
  days: number
  points: UsagePoint[]
}

export type HealthStatus = 'UP' | 'DOWN' | 'DISABLED'

export interface HealthComponent {
  component: string
  status: HealthStatus
  latencyMs?: number | null
  detail?: string | null
}

export interface SystemInfo {
  appName: string
  version: string
  springBootVersion: string
  javaVersion: string
  startedAt: string
  uptimeSeconds: number
}
