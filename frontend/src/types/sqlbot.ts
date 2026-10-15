/**
 * SQLBot 类型 —— 严格对齐 doc/04 第八部分与 §1.7 SSE 协议。
 */

export type DatasourceStatus = 'OK' | 'ERROR' | 'UNKNOWN'
export type SyncStatus = 'IDLE' | 'RUNNING' | 'SUCCESS' | 'FAILED'
export type SqlStatus = 'SUGGESTED' | 'VALIDATED' | 'REJECTED' | 'EXECUTED' | 'FAILED'
export type ChartType = 'bar' | 'line' | 'pie' | 'table'

export interface Datasource {
  id: number
  name: string
  host: string
  port: number
  databaseName: string
  schemaName: string
  username: string
  sslEnabled: boolean
  poolSize: number
  maxRows: number
  timeoutMs: number
  ownerId: number
  ownerName?: string
  status: DatasourceStatus
  enabled: boolean
  lastSyncAt?: string | null
  tableCount: number
  columnCount: number
  createdAt: string
}

export interface DatasourceQuery {
  page?: number
  size?: number
  keyword?: string
  status?: DatasourceStatus | ''
}

export interface DatasourcePayload {
  name: string
  host: string
  port?: number
  databaseName: string
  schemaName?: string
  username: string
  password: string
  sslEnabled?: boolean
  poolSize?: number
  maxRows?: number
  timeoutMs?: number
  enabled?: boolean
  extraParams?: Record<string, unknown>
}

export type DatasourceUpdatePayload = Partial<Omit<DatasourcePayload, 'password'>> & { password?: string }

export interface ConnectionTestResult {
  success: boolean
  latencyMs: number
  serverVersion?: string
  detail?: string
  error?: string
}

export interface SyncSchemaPayload {
  includeViews?: boolean
  overwriteComments?: boolean
}

export interface SyncStartResult {
  accepted: boolean
  syncStatus: SyncStatus
  startedAt: string
}

export interface SyncStatusResult {
  syncStatus: SyncStatus
  startedAt?: string | null
  finishedAt?: string | null
  tableCount: number
  columnCount: number
  errorMsg?: string | null
}

export interface TableItem {
  id: number
  schemaName: string
  tableName: string
  tableComment?: string | null
  rowEstimate?: number | null
  enabled: boolean
  columnCount: number
  syncedAt?: string | null
}

export interface ColumnItem {
  id: number
  columnName: string
  dataType: string
  nullable: boolean
  isPrimaryKey: boolean
  isForeignKey?: boolean
  columnComment?: string | null
  ordinal: number
  enabled: boolean
}

export interface TableDetail extends TableItem {
  columns: ColumnItem[]
}

export interface TableQuery {
  page?: number
  size?: number
  keyword?: string
  enabled?: boolean
}

export interface TableUpdatePayload {
  enabled?: boolean
  tableComment?: string
}

export interface SampleResult {
  columns: string[]
  rows: unknown[][]
  rowCount: number
  limit: number
  truncated: boolean
}

export interface SqlConversation {
  id: number
  title: string
  datasourceId: number
  datasourceName?: string
  kbId?: number | null
  kbName?: string | null
  messageCount: number
  ownerId: number
  createdAt: string
  updatedAt: string
}

export interface SqlConversationQuery {
  page?: number
  size?: number
  datasourceId?: number
  keyword?: string
}

export interface SqlConversationCreatePayload {
  title?: string
  datasourceId: number
  kbId?: number
}

export interface ResultColumn {
  name: string
  type: string
}

export interface ResultMeta {
  columns: ResultColumn[]
  rowCount: number
  elapsedMs: number
  truncated: boolean
}

export interface SqlMessage {
  id: number
  role: 'USER' | 'ASSISTANT'
  content: string
  generatedSql?: string | null
  sqlExplanation?: string | null
  sqlStatus?: SqlStatus | null
  resultMeta?: ResultMeta | null
  chartType?: ChartType | null
  chartOption?: Record<string, unknown> | null
  errorMsg?: string | null
  elapsedMs?: number | null
  createdAt: string
}

export interface Nl2SqlPayload {
  content: string
  stream?: boolean
  execute?: boolean
  maxRows?: number
}

export interface SqlExecutePayload {
  datasourceId: number
  sql: string
  maxRows?: number
  messageId?: number
}

export interface SqlExecuteResult extends ResultMeta {
  rows: unknown[][]
  chartType?: ChartType | null
  chartOption?: Record<string, unknown> | null
}

export interface SqlExplainResult {
  plan: string[]
}

export interface SqlExportPayload {
  datasourceId: number
  sql: string
  format: 'CSV' | 'XLSX'
  maxRows?: number
  fileName?: string
}

// ---------------- SSE 事件 payload ----------------

export interface SqlSseMeta {
  conversationId: number
  messageId: number
}

export interface SqlSseReasoning {
  content: string
}

export interface SqlSseSql {
  sql: string
  explanation?: string
}

export interface SqlSseResult {
  columns: ResultColumn[]
  rows: unknown[][]
  rowCount: number
  elapsedMs: number
  truncated: boolean
}

export interface SqlSseChart {
  type: ChartType
  option: Record<string, unknown>
}

export interface SqlSseDone {
  messageId: number
}
