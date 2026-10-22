import type {
  ColumnItem,
  ConnectionTestResult,
  Datasource,
  DatasourcePayload,
  DatasourceQuery,
  SampleResult,
  SqlConversation,
  SqlConversationCreatePayload,
  SqlConversationQuery,
  SqlExecutePayload,
  SqlExecuteResult,
  SqlMessage,
  TableDetail,
  TableItem,
  TableQuery,
  Nl2SqlPayload,
} from '@/types/sqlbot'
import { paginate } from '@/lib/mock'
import { inferChart } from '@/lib/chart'

/** SQLBot 的内存 Mock。**后端就绪后整个文件可删**。 */

function iso(hoursAgo: number, minute = 0): string {
  const d = new Date()
  d.setHours(d.getHours() - hoursAgo, minute, 0, 0)
  return d.toISOString()
}

let dsSeq = 2
let convSeq = 31
let msgSeq = 500
let tableSeq = 100

export const mockDatasources: Datasource[] = [
  {
    id: 1,
    name: 'prod-pg-01（生产）',
    host: '10.0.1.11',
    port: 5432,
    databaseName: 'business',
    schemaName: 'public',
    username: 'readonly',
    sslEnabled: false,
    poolSize: 5,
    maxRows: 1000,
    timeoutMs: 10000,
    ownerId: 1,
    ownerName: 'admin',
    status: 'OK',
    enabled: true,
    lastSyncAt: iso(6),
    tableCount: 24,
    columnCount: 264,
    createdAt: iso(600),
  },
  {
    id: 2,
    name: 'test-pg-02（测试）',
    host: '10.0.2.8',
    port: 5432,
    databaseName: 'biz_test',
    schemaName: 'public',
    username: 'readonly',
    sslEnabled: false,
    poolSize: 5,
    maxRows: 1000,
    timeoutMs: 10000,
    ownerId: 1,
    ownerName: 'admin',
    status: 'UNKNOWN',
    enabled: true,
    lastSyncAt: iso(72),
    tableCount: 18,
    columnCount: 190,
    createdAt: iso(400),
  },
]

const TABLE_NAMES: [string, string, number, boolean][] = [
  ['sales_order', '销售订单主表', 1284920, true],
  ['customer', '客户信息表', 41203, true],
  ['product', '商品主数据', 3884, true],
  ['payment_record', '支付流水（含敏感字段）', 2930411, false],
  ['sys_dict', '字典表', 412, true],
  ['order_item', '订单明细表', 3841200, true],
  ['region', '区域维表', 34, true],
  ['category', '商品类目', 220, true],
  ['warehouse', '仓库信息', 46, true],
  ['inventory', '库存快照', 688412, true],
  ['supplier', '供应商主数据', 1024, true],
  ['purchase_order', '采购订单', 220411, true],
  ['refund_record', '退款记录', 33120, true],
  ['shipment', '发运记录', 902144, true],
  ['employee', '员工信息', 812, false],
  ['department', '部门信息', 64, true],
  ['salary_record', '薪资记录（敏感）', 9840, false],
  ['marketing_campaign', '营销活动', 312, true],
  ['campaign_channel', '活动渠道', 28, true],
  ['user_behavior', '用户行为日志', 8820311, true],
  ['product_review', '商品评价', 220411, true],
  ['coupon', '优惠券', 5120, true],
  ['coupon_usage', '优惠券核销', 402113, true],
  ['audit_log', '审计日志', 1200330, false],
]

export const mockTables: TableItem[] = TABLE_NAMES.map(([tableName, comment, rows, enabled], i) => ({
  id: tableSeq + i + 1,
  schemaName: 'public',
  tableName,
  tableComment: comment,
  rowEstimate: rows,
  enabled,
  columnCount: tableName === 'sales_order' ? 5 : 4 + (i % 6),
  syncedAt: iso(6),
}))

const SALES_ORDER_COLUMNS: ColumnItem[] = [
  col(1, 'order_id', 'bigint', false, true, '订单ID'),
  col(2, 'customer_id', 'bigint', false, false, '客户ID → customer.id', true),
  col(3, 'amount', 'numeric(12,2)', false, false, '订单金额'),
  col(4, 'status', 'varchar(20)', false, false, '状态：PENDING/COMPLETED/REFUNDED'),
  col(5, 'created_at', 'timestamptz', false, false, '下单时间'),
]

function col(
  ordinal: number,
  columnName: string,
  dataType: string,
  nullable: boolean,
  isPrimaryKey: boolean,
  columnComment: string,
  isForeignKey = false,
): ColumnItem {
  return {
    id: tableSeq * 10 + ordinal,
    columnName,
    dataType,
    nullable,
    isPrimaryKey,
    isForeignKey,
    columnComment,
    ordinal,
    enabled: true,
  }
}

function columnsFor(table: TableItem): ColumnItem[] {
  if (table.tableName === 'sales_order') return SALES_ORDER_COLUMNS
  const base: [string, string, string][] = [
    ['id', 'bigint', '主键'],
    ['name', 'varchar(128)', '名称'],
    ['created_at', 'timestamptz', '创建时间'],
    ['updated_at', 'timestamptz', '更新时间'],
  ]
  return base.slice(0, Math.max(3, table.columnCount)).map(([n, t, c], i) => ({
    id: table.id * 10 + i,
    columnName: n,
    dataType: t,
    nullable: false,
    isPrimaryKey: n === 'id',
    isForeignKey: false,
    columnComment: c,
    ordinal: i + 1,
    enabled: true,
  }))
}

export function mockDatasourcePage(q: DatasourceQuery) {
  let list = [...mockDatasources]
  if (q.keyword) list = list.filter((d) => d.name.includes(q.keyword!) || d.host.includes(q.keyword!))
  if (q.status) list = list.filter((d) => d.status === q.status)
  return paginate(list, q.page ?? 1, q.size ?? 20)
}

export function mockDatasourceDetail(id: number): Datasource | undefined {
  return mockDatasources.find((d) => d.id === id)
}

export function mockDatasourceCreate(payload: DatasourcePayload): Datasource {
  const now = new Date().toISOString()
  const created: Datasource = {
    id: ++dsSeq,
    name: payload.name,
    host: payload.host,
    port: payload.port ?? 5432,
    databaseName: payload.databaseName,
    schemaName: payload.schemaName ?? 'public',
    username: payload.username,
    sslEnabled: payload.sslEnabled ?? false,
    poolSize: payload.poolSize ?? 5,
    maxRows: payload.maxRows ?? 1000,
    timeoutMs: payload.timeoutMs ?? 10000,
    extraParams: payload.extraParams ?? {},
    ownerId: 1,
    ownerName: 'admin',
    status: 'UNKNOWN',
    enabled: payload.enabled ?? true,
    tableCount: 0,
    columnCount: 0,
    lastSyncAt: null,
    createdAt: now,
  }
  mockDatasources.push(created)
  return created
}

export function mockDatasourceUpdate(id: number, patch: Partial<Datasource> & { password?: string }) {
  const d = mockDatasources.find((x) => x.id === id)
  if (!d) return null
  const { password: _password, ...rest } = patch
  Object.assign(d, rest, { status: 'UNKNOWN' })
  return d
}

export function mockDatasourceDelete(id: number): boolean {
  const i = mockDatasources.findIndex((d) => d.id === id)
  if (i < 0) return false
  mockDatasources.splice(i, 1)
  return true
}

export function mockConnectionTest(id?: number): ConnectionTestResult {
  const d = id ? mockDatasources.find((x) => x.id === id) : undefined
  if (d) d.status = 'OK'
  return { success: true, latencyMs: 47, serverVersion: 'PostgreSQL 16.3', detail: `连接成功，可读取 ${d?.tableCount ?? 24} 张表` }
}

export function mockSyncStart(id: number) {
  const d = mockDatasources.find((x) => x.id === id)
  if (d) d.status = 'OK'
  return { accepted: true, syncStatus: 'RUNNING' as const, startedAt: iso(0) }
}

export function mockSyncStatus(id: number) {
  const d = mockDatasources.find((x) => x.id === id)
  return {
    syncStatus: 'SUCCESS' as const,
    startedAt: iso(0, 20),
    finishedAt: iso(0, 20) ,
    tableCount: d?.tableCount ?? 24,
    columnCount: d?.columnCount ?? 264,
    errorMsg: null,
  }
}

export function mockTablePage(dsId: number, q: TableQuery) {
  let list = dsId === 1 ? [...mockTables] : mockTables.slice(0, 18)
  if (q.keyword) list = list.filter((t) => t.tableName.includes(q.keyword!) || (t.tableComment ?? '').includes(q.keyword!))
  if (q.enabled !== undefined) list = list.filter((t) => t.enabled === q.enabled)
  return paginate(list, q.page ?? 1, q.size ?? 50)
}

export function mockTableDetail(tableId: number): TableDetail | null {
  const t = mockTables.find((x) => x.id === tableId)
  if (!t) return null
  return { ...t, columns: columnsFor(t) }
}

export function mockTableUpdate(tableId: number, patch: Partial<TableItem>) {
  const t = mockTables.find((x) => x.id === tableId)
  if (!t) return null
  Object.assign(t, patch)
  return t
}

export function mockSample(tableId: number, limit: number): SampleResult {
  const t = mockTables.find((x) => x.id === tableId)
  const columns = t ? columnsFor(t).map((c) => c.columnName) : ['order_id', 'customer_id', 'amount', 'status', 'created_at']
  const rows: unknown[][] = [
    [100001, 5012, 12800.0, 'COMPLETED', iso(30, 12)],
    [100002, 5043, 3260.0, 'PENDING', iso(30, 14)],
    [100003, 5012, 18900.0, 'COMPLETED', iso(29, 9)],
    [100004, 5066, 740.0, 'REFUNDED', iso(29, 16)],
    [100005, 5071, 22150.0, 'COMPLETED', iso(28, 11)],
  ]
  return { columns, rows, rowCount: rows.length, limit, truncated: false }
}

// ---------------- 查数会话 ----------------

export const mockSqlConversations: SqlConversation[] = [
  sqlConv(31, '各区域上月销售额 TOP 榜', 1, 3, iso(4)),
  sqlConv(30, '华东区订单量环比', 1, 2, iso(50)),
  sqlConv(29, '哪些客户超过 90 天未下单', 1, null, iso(120)),
  sqlConv(28, '上月退款订单金额分布', 1, 3, iso(200)),
  sqlConv(27, '商品类目销售额占比', 2, null, iso(400)),
]

function sqlConv(
  id: number,
  title: string,
  datasourceId: number,
  kbId: number | null,
  updatedAt: string,
): SqlConversation {
  return {
    id,
    title,
    datasourceId,
    datasourceName: datasourceId === 1 ? 'prod-pg-01（生产）' : 'test-pg-02（测试）',
    kbId,
    kbName: kbId ? '业务指标口径库' : null,
    messageCount: 2,
    ownerId: 1,
    createdAt: updatedAt,
    updatedAt,
  }
}

export const mockSqlMessages: Record<number, SqlMessage[]> = {
  31: [
    { id: 2051, role: 'USER', content: '查一下 9 月份各区域的销售额排名，前 5 名，配上图表', createdAt: iso(4, 2) },
    {
      id: 205,
      role: 'ASSISTANT',
      content: '已按 9 月各区域销售额降序取前 5 名。',
      generatedSql:
        "SELECT c.region, SUM(o.amount) AS total_amount\nFROM sales_order o\nJOIN customer c ON c.id = o.customer_id\nWHERE o.status = 'COMPLETED'\n  AND o.created_at >= '2026-09-01'\n  AND o.created_at <  '2026-10-01'\nGROUP BY c.region\nORDER BY total_amount DESC\nLIMIT 5;",
      sqlExplanation: '销售额 = 状态为 COMPLETED 的订单金额合计，统计区间 2026-09-01 ~ 2026-09-30。',
      sqlStatus: 'EXECUTED',
      resultMeta: {
        columns: [
          { name: 'region', type: 'varchar' },
          { name: 'total_amount', type: 'numeric' },
        ],
        rowCount: 5,
        elapsedMs: 68,
        truncated: false,
      },
      chartType: 'bar',
      chartOption: {
        color: ['#526e3e'],
        grid: { left: 8, right: 16, top: 24, bottom: 8, containLabel: true },
        tooltip: { trigger: 'axis' },
        xAxis: { type: 'category', data: ['华东', '华南', '华北', '西南', '东北'] },
        yAxis: { type: 'value' },
        series: [{ type: 'bar', barMaxWidth: 46, itemStyle: { borderRadius: [4, 4, 0, 0] }, data: [2864120, 2224310, 1776480, 1289050, 859730] }],
      },
      elapsedMs: 3120,
      createdAt: iso(4, 4),
    },
  ],
}

export function mockSqlResultRows(): unknown[][] {
  return [
    ['华东', 2864120.0],
    ['华南', 2224310.0],
    ['华北', 1776480.0],
    ['西南', 1289050.0],
    ['东北', 859730.0],
  ]
}

export function mockSqlConversationPage(q: SqlConversationQuery) {
  let list = [...mockSqlConversations]
  if (q.keyword) list = list.filter((c) => c.title.includes(q.keyword!))
  if (q.datasourceId) list = list.filter((c) => c.datasourceId === q.datasourceId)
  return paginate(list, q.page ?? 1, q.size ?? 20)
}

export function mockSqlConversationDetail(id: number): SqlConversation | undefined {
  return mockSqlConversations.find((c) => c.id === id)
}

export function mockSqlConversationCreate(payload: SqlConversationCreatePayload): SqlConversation {
  const now = new Date().toISOString()
  const ds = mockDatasources.find((d) => d.id === payload.datasourceId)
  const created: SqlConversation = {
    id: ++convSeq,
    title: payload.title ?? '新查询',
    datasourceId: payload.datasourceId,
    datasourceName: ds?.name,
    kbId: payload.kbId ?? null,
    kbName: payload.kbId ? '业务指标口径库' : null,
    messageCount: 0,
    ownerId: 1,
    createdAt: now,
    updatedAt: now,
  }
  mockSqlConversations.unshift(created)
  mockSqlMessages[created.id] = []
  return created
}

export function mockSqlConversationDelete(id: number): boolean {
  const i = mockSqlConversations.findIndex((c) => c.id === id)
  if (i < 0) return false
  mockSqlConversations.splice(i, 1)
  delete mockSqlMessages[id]
  return true
}

export function mockSqlMessagePage(id: number, page = 1, size = 50) {
  return paginate(mockSqlMessages[id] ?? [], page, size)
}

// ---------------- 执行 / 解释 / 导出 ----------------

export function mockExecute(_payload: SqlExecutePayload): SqlExecuteResult {
  const columns = [
    { name: 'region', type: 'varchar' },
    { name: 'total_amount', type: 'numeric' },
  ]
  const rows = mockSqlResultRows()
  const chart = inferChart(columns, rows)
  return {
    columns,
    rows,
    rowCount: rows.length,
    elapsedMs: 68,
    truncated: false,
    chartType: chart.type,
    chartOption: chart.option,
  }
}

export function mockExplain(_payload: SqlExecutePayload): string[] {
  return [
    'Limit  (cost=142.30..142.31 rows=5 width=40)',
    '  ->  Sort  (cost=142.30..142.30 rows=5 width=40)',
    '        Sort Key: (sum(o.amount)) DESC',
    '        ->  HashAggregate  (cost=141.90..142.10 rows=12 width=40)',
    '              Group Key: c.region',
    '              ->  Hash Join  (cost=8.20..120.40 rows=1284 width=16)',
    '                    Hash Cond: (o.customer_id = c.id)',
    '                    ->  Seq Scan on sales_order o  (cost=0.00..88.00 rows=1284 width=16)',
    "                          Filter: ((status = 'COMPLETED'::text) AND (created_at >= '2026-09-01') AND (created_at < '2026-10-01'))",
  ]
}

/**
 * 导出用的结果集（Mock）。
 * ⚠️ 只产出 **CSV**：XLSX 的生成属于后端职责（doc/04 §8.18 + doc/05 §3.1 的 poi-ooxml），
 * 前端只负责带鉴权下载 blob，不替后端造 Excel 文件。
 */
export function mockExportCsvBlob(): Blob {
  const columns = ['region', 'total_amount']
  const rows = mockSqlResultRows()
  const cell = (v: unknown) => {
    const t = v === null || v === undefined ? '' : String(v)
    return /[",\n\r]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t
  }
  const lines = [columns.map(cell).join(','), ...rows.map((r) => r.map(cell).join(','))]
  return new Blob([`\uFEFF${lines.join('\r\n')}\r\n`], { type: 'text/csv;charset=utf-8' })
}

// ---------------- NL2SQL 流式模拟 ----------------

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Aborted', 'AbortError'))
      return
    }
    const timer = window.setTimeout(() => {
      signal?.removeEventListener('abort', onAbort)
      resolve()
    }, ms)
    function onAbort() {
      window.clearTimeout(timer)
      reject(new DOMException('Aborted', 'AbortError'))
    }
    signal?.addEventListener('abort', onAbort, { once: true })
  })
}

const MOCK_SQL =
  "SELECT c.region,\n       SUM(o.amount) AS total_amount\nFROM sales_order o\nJOIN customer c ON c.id = o.customer_id\nWHERE o.status = 'COMPLETED'\n  AND o.created_at >= '2026-09-01'\n  AND o.created_at <  '2026-10-01'\nGROUP BY c.region\nORDER BY total_amount DESC\nLIMIT 5;"

export async function mockStreamNl2Sql(
  conversationId: number,
  payload: Nl2SqlPayload,
  handlers: { onEvent: (event: string, data: string) => void; signal?: AbortSignal },
): Promise<void> {
  const { onEvent, signal } = handlers
  const send = (event: string, data: unknown) => onEvent(event, JSON.stringify(data))
  const list = (mockSqlMessages[conversationId] ??= [])
  const conv = mockSqlConversations.find((c) => c.id === conversationId)

  list.push({ id: ++msgSeq, role: 'USER', content: payload.content, createdAt: new Date().toISOString() })
  const assistantId = ++msgSeq
  if (conv && conv.title === '新查询') conv.title = payload.content.slice(0, 20)

  await sleep(160, signal)
  send('meta', { conversationId, messageId: assistantId })

  await sleep(240, signal)
  send('reasoning', {
    content: '识别到指标「销售额」与维度「区域」，将关联 sales_order 与 customer，口径取自「业务指标口径库」。',
  })

  await sleep(320, signal)
  send('sql', {
    sql: MOCK_SQL,
    explanation: '销售额 = 状态为 COMPLETED 的订单金额合计，统计区间 2026-09-01 ~ 2026-09-30。',
  })

  const assistant: SqlMessage = {
    id: assistantId,
    role: 'ASSISTANT',
    content: '已按 9 月各区域销售额降序取前 5 名。',
    generatedSql: MOCK_SQL,
    sqlExplanation: '销售额 = 状态为 COMPLETED 的订单金额合计。',
    sqlStatus: payload.execute === false ? 'SUGGESTED' : 'EXECUTED',
    createdAt: new Date().toISOString(),
  }

  if (payload.execute !== false) {
    await sleep(420, signal)
    const columns = [
      { name: 'region', type: 'varchar' },
      { name: 'total_amount', type: 'numeric' },
    ]
    const rows = mockSqlResultRows()
    const result = { columns, rows, rowCount: rows.length, elapsedMs: 68, truncated: false }
    send('result', result)
    assistant.resultMeta = { columns, rowCount: rows.length, elapsedMs: 68, truncated: false }
    const chart = inferChart(columns, rows)
    await sleep(160, signal)
    send('chart', { type: chart.type, option: chart.option })
    assistant.chartType = chart.type
    assistant.chartOption = chart.option
  }

  assistant.elapsedMs = 3120
  await sleep(120, signal)
  send('done', { messageId: assistantId })
  list.push(assistant)
}
