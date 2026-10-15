import { ApiError, http, unwrap } from '@/lib/http'
import { mockEnabled, mockDelay } from '@/lib/mock'
import { postSse } from '@/lib/sse'
import { downloadBlob, saveBlob } from '@/lib/download'
import type { ApiResponse, PageResult } from '@/types/api'
import type {
  ConnectionTestResult,
  Datasource,
  DatasourcePayload,
  DatasourceQuery,
  DatasourceUpdatePayload,
  Nl2SqlPayload,
  SampleResult,
  SqlConversation,
  SqlConversationCreatePayload,
  SqlConversationQuery,
  SqlExecutePayload,
  SqlExecuteResult,
  SqlExplainResult,
  SqlExportPayload,
  SqlMessage,
  SyncSchemaPayload,
  SyncStartResult,
  SyncStatusResult,
  TableDetail,
  TableItem,
  TableQuery,
  TableUpdatePayload,
} from '@/types/sqlbot'
import * as mock from '@/mock/sqlbot'

/** SQLBot API —— doc/04 第八部分。 */

// ---------------- 数据源 ----------------

export function fetchDatasources(q: DatasourceQuery): Promise<PageResult<Datasource>> {
  if (mockEnabled('sqlbot')) return mockDelay(mock.mockDatasourcePage(q))
  return unwrap(http.get<ApiResponse<PageResult<Datasource>>>('/sqlbot/datasources', { params: q }))
}

export function fetchDatasource(id: number): Promise<Datasource> {
  if (mockEnabled('sqlbot')) {
    const d = mock.mockDatasourceDetail(id)
    return d ? mockDelay(d) : Promise.reject(new ApiError(60001, '数据源不存在'))
  }
  return unwrap(http.get<ApiResponse<Datasource>>(`/sqlbot/datasources/${id}`))
}

export function createDatasource(payload: DatasourcePayload): Promise<Datasource> {
  if (mockEnabled('sqlbot')) return mockDelay(mock.mockDatasourceCreate(payload))
  return unwrap(http.post<ApiResponse<Datasource>>('/sqlbot/datasources', payload))
}

export function updateDatasource(id: number, payload: DatasourceUpdatePayload): Promise<Datasource> {
  if (mockEnabled('sqlbot')) {
    const d = mock.mockDatasourceUpdate(id, payload)
    return d ? mockDelay(d) : Promise.reject(new ApiError(60001, '数据源不存在'))
  }
  return unwrap(http.put<ApiResponse<Datasource>>(`/sqlbot/datasources/${id}`, payload))
}

export async function deleteDatasource(id: number): Promise<null> {
  if (mockEnabled('sqlbot')) {
    mock.mockDatasourceDelete(id)
    return mockDelay(null)
  }
  return unwrap(http.delete<ApiResponse<null>>(`/sqlbot/datasources/${id}`))
}

export function testDatasource(id: number): Promise<ConnectionTestResult> {
  if (mockEnabled('sqlbot')) return mockDelay(mock.mockConnectionTest(id))
  return unwrap(http.post<ApiResponse<ConnectionTestResult>>(`/sqlbot/datasources/${id}/test`))
}

export function testDatasourceDraft(payload: DatasourcePayload): Promise<ConnectionTestResult> {
  if (mockEnabled('sqlbot')) return mockDelay({ ...mock.mockConnectionTest(), detail: `连接成功（草稿）· ${payload.host}:${payload.port ?? 5432}` })
  return unwrap(http.post<ApiResponse<ConnectionTestResult>>('/sqlbot/datasources/test', payload))
}

export function startSchemaSync(id: number, payload: SyncSchemaPayload = {}): Promise<SyncStartResult> {
  if (mockEnabled('sqlbot')) return mockDelay(mock.mockSyncStart(id))
  return unwrap(http.post<ApiResponse<SyncStartResult>>(`/sqlbot/datasources/${id}/sync-schema`, payload))
}

export function fetchSyncStatus(id: number): Promise<SyncStatusResult> {
  if (mockEnabled('sqlbot')) return mockDelay(mock.mockSyncStatus(id))
  return unwrap(http.get<ApiResponse<SyncStatusResult>>(`/sqlbot/datasources/${id}/sync-status`))
}

// ---------------- 表 / 字段 ----------------

export function fetchTables(datasourceId: number, q: TableQuery): Promise<PageResult<TableItem>> {
  if (mockEnabled('sqlbot')) return mockDelay(mock.mockTablePage(datasourceId, q))
  return unwrap(http.get<ApiResponse<PageResult<TableItem>>>(`/sqlbot/datasources/${datasourceId}/tables`, { params: q }))
}

export function fetchTableDetail(datasourceId: number, tableId: number): Promise<TableDetail> {
  if (mockEnabled('sqlbot')) {
    const t = mock.mockTableDetail(tableId)
    return t ? mockDelay(t) : Promise.reject(new ApiError(10002, '表不存在'))
  }
  return unwrap(http.get<ApiResponse<TableDetail>>(`/sqlbot/datasources/${datasourceId}/tables/${tableId}`))
}

export function updateTable(
  datasourceId: number,
  tableId: number,
  payload: TableUpdatePayload,
): Promise<TableItem> {
  if (mockEnabled('sqlbot')) {
    const t = mock.mockTableUpdate(tableId, payload)
    return t ? mockDelay(t) : Promise.reject(new ApiError(10002, '表不存在'))
  }
  return unwrap(http.put<ApiResponse<TableItem>>(`/sqlbot/datasources/${datasourceId}/tables/${tableId}`, payload))
}

export function fetchSample(datasourceId: number, tableId: number, limit = 10): Promise<SampleResult> {
  if (mockEnabled('sqlbot')) return mockDelay(mock.mockSample(tableId, limit))
  return unwrap(http.get<ApiResponse<SampleResult>>(`/sqlbot/datasources/${datasourceId}/tables/${tableId}/sample`, { params: { limit } }))
}

// ---------------- 查数会话 ----------------

export function fetchSqlConversations(q: SqlConversationQuery): Promise<PageResult<SqlConversation>> {
  if (mockEnabled('sqlbot')) return mockDelay(mock.mockSqlConversationPage(q))
  return unwrap(http.get<ApiResponse<PageResult<SqlConversation>>>('/sqlbot/conversations', { params: q }))
}

export function fetchSqlConversation(id: number): Promise<SqlConversation> {
  if (mockEnabled('sqlbot')) {
    const c = mock.mockSqlConversationDetail(id)
    return c ? mockDelay(c) : Promise.reject(new ApiError(50001, '会话不存在'))
  }
  return unwrap(http.get<ApiResponse<SqlConversation>>(`/sqlbot/conversations/${id}`))
}

export function createSqlConversation(payload: SqlConversationCreatePayload): Promise<SqlConversation> {
  if (mockEnabled('sqlbot')) return mockDelay(mock.mockSqlConversationCreate(payload))
  return unwrap(http.post<ApiResponse<SqlConversation>>('/sqlbot/conversations', payload))
}

export async function deleteSqlConversation(id: number): Promise<null> {
  if (mockEnabled('sqlbot')) {
    mock.mockSqlConversationDelete(id)
    return mockDelay(null)
  }
  return unwrap(http.delete<ApiResponse<null>>(`/sqlbot/conversations/${id}`))
}

export function fetchSqlMessages(id: number, page = 1, size = 50): Promise<PageResult<SqlMessage>> {
  if (mockEnabled('sqlbot')) return mockDelay(mock.mockSqlMessagePage(id, page, size))
  return unwrap(
    http.get<ApiResponse<PageResult<SqlMessage>>>(`/sqlbot/conversations/${id}/messages`, {
      params: { page, size, sort: 'created_at', order: 'asc' },
    }),
  )
}

/** SSE 自然语言查询（doc/04 §8.15） */
export function streamNl2Sql(
  conversationId: number,
  payload: Nl2SqlPayload,
  handlers: { onEvent: (event: string, data: string) => void; signal?: AbortSignal },
): Promise<void> {
  if (mockEnabled('sqlbot')) {
    return mock.mockStreamNl2Sql(conversationId, payload, handlers)
  }
  return postSse(`/sqlbot/conversations/${conversationId}/messages`, {
    body: { ...payload, stream: true },
    onEvent: handlers.onEvent,
    signal: handlers.signal,
  })
}

// ---------------- 手工执行 / 计划 / 导出 ----------------

export function executeSql(payload: SqlExecutePayload): Promise<SqlExecuteResult> {
  if (mockEnabled('sqlbot')) return mockDelay(mock.mockExecute(payload))
  return unwrap(http.post<ApiResponse<SqlExecuteResult>>('/sqlbot/execute', payload))
}

export function explainSql(payload: Pick<SqlExecutePayload, 'datasourceId' | 'sql'>): Promise<SqlExplainResult> {
  if (mockEnabled('sqlbot')) return mockDelay({ plan: mock.mockExplain({ ...payload, maxRows: undefined }) })
  return unwrap(http.post<ApiResponse<SqlExplainResult>>('/sqlbot/explain', payload))
}

export async function exportSql(payload: SqlExportPayload): Promise<string> {
  if (mockEnabled('sqlbot')) {
    // Mock 只有 CSV：XLSX 归后端（POI 生成），这里不假装成 Excel。
    // 点「Excel」时也落到 CSV，文件名带 .csv 后缀，用户一眼能看出区别。
    const name = `${payload.fileName ?? 'export'}_${timestamp()}.csv`
    saveBlob(mock.mockExportCsvBlob(), name)
    return mockDelay(name)
  }
  // 真导出：后端按 format 生成 CSV / XLSX 并流式下发，前端只做 blob 下载
  // （Content-Disposition 里的文件名优先）——doc/04 §8.18
  return downloadBlob('/sqlbot/export', {
    method: 'POST',
    data: payload,
    fallbackName: `${payload.fileName ?? 'export'}.${payload.format === 'XLSX' ? 'xlsx' : 'csv'}`,
  })
}

/** 与后端导出命名保持一致：export_20261011_100422.csv（doc/04 §8.18） */
function timestamp(): string {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`
}
