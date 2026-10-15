import type {
  DashboardStats,
  HealthComponent,
  LogQuery,
  OperationLog,
  SettingItem,
  SystemInfo,
  UsageTrend,
} from '@/types/system'
import { paginate } from '@/lib/mock'

/** 系统管理内存 Mock。**后端就绪后整个文件可删**。 */

export const mockSettings: SettingItem[] = [
  s('rag.retrieval.vector-weight', '0.6', 'DOUBLE', 'RAG', '混合检索向量权重'),
  s('rag.retrieval.bm25-weight', '0.4', 'DOUBLE', 'RAG', '混合检索 BM25 权重'),
  s('rag.retrieval.top-k', '8', 'INT', 'RAG', '默认召回条数'),
  s('rag.retrieval.score-threshold', '0.35', 'DOUBLE', 'RAG', '最低相似度阈值'),
  s('rag.retrieval.rerank-candidates', '20', 'INT', 'RAG', '重排候选数'),
  s('rag.chunk.size', '800', 'INT', 'RAG', '默认分片大小(token)'),
  s('rag.chunk.overlap', '120', 'INT', 'RAG', '默认分片重叠'),
  s('rag.embedding.dimension', '1024', 'INT', 'RAG', '全局向量维度'),
  s('rag.upload.max-file-size-mb', '50', 'INT', 'RAG', '单文件最大MB'),
  s('rag.upload.max-files', '20', 'INT', 'RAG', '单次最大文件数'),
  s('sqlbot.max-rows', '1000', 'INT', 'SQLBot', '单次查询最大返回行数'),
  s('sqlbot.export-max-rows', '100000', 'INT', 'SQLBot', '导出行数上限'),
  s('sqlbot.timeout-ms', '10000', 'INT', 'SQLBot', 'SQL 执行超时'),
  s('sqlbot.pool-size', '5', 'INT', 'SQLBot', '数据源连接池大小'),
  s('sqlbot.forbidden-keywords', 'DROP,TRUNCATE,DELETE,UPDATE,INSERT,ALTER,GRANT,REVOKE,CREATE', 'STRING', 'SQLBot', '禁用关键词'),
  s('security.max-login-failures', '5', 'INT', 'Security', '最大登录失败次数'),
  s('security.lock-minutes', '30', 'INT', 'Security', '锁定时长(分钟)'),
  s('jwt.access-ttl-minutes', '120', 'INT', 'Security', 'Access Token 有效期'),
  s('jwt.refresh-ttl-days', '7', 'INT', 'Security', 'Refresh Token 有效期'),
  s('log.retention-days', '365', 'INT', 'System', '日志保留天数'),
]

function s(
  key: string,
  value: string,
  valueType: SettingItem['valueType'],
  group: SettingItem['group'],
  description: string,
): SettingItem {
  return { key, value, valueType, group, description, updatedBy: 'admin', updatedAt: new Date(Date.now() - 86_400_000).toISOString() }
}

export function mockSettingList(group?: string) {
  return group ? mockSettings.filter((x) => x.group === group) : [...mockSettings]
}

export function mockSettingUpdate(items: { key: string; value: string }[]): number {
  for (const item of items) {
    const found = mockSettings.find((x) => x.key === item.key)
    if (found) {
      found.value = item.value
      found.updatedAt = new Date().toISOString()
      found.updatedBy = 'admin'
    }
  }
  return items.length
}

// ---------------- 操作日志 ----------------

let logSeq = 90211

export const mockLogs: OperationLog[] = [
  log(90211, 1, 'admin', 'SQL', 'NL2SQL 查询 prod-pg-01', 'conversation:31', 'SELECT c.region… (5 行)', '192.168.3.22', 'SUCCESS', 0),
  log(90210, 2, 'ops_manager', 'DOC', '上传文档 版本变更记录.md', '产品手册知识库 · 96KB', null, '192.168.3.31', 'SUCCESS', 9),
  log(90209, 1, 'admin', 'SYSTEM', '修改系统参数 SQL 执行超时', '8000 → 10000 ms', null, '192.168.3.22', 'SUCCESS', 18),
  log(90208, 4, 'liuna', 'LOGIN', '登录尝试', null, '密码连续错误 5 次，账户锁定 30 分钟', '203.0.113.5', 'FAILURE', 25),
  log(90207, 2, 'ops_manager', 'KB', '创建知识库 公司制度规范', 'kb:2', null, '192.168.3.31', 'SUCCESS', 40),
  log(90206, 1, 'admin', 'CHAT', 'AI 问答 如何重置管理员密码？', 'conversation:88', 'gpt-4o-mini · 1,238 tokens', '192.168.3.22', 'SUCCESS', 52),
]

function log(
  id: number,
  userId: number,
  username: string,
  type: OperationLog['type'],
  action: string,
  target: string | null,
  detail: string | null,
  ip: string,
  result: OperationLog['result'],
  minutesAgo: number,
): OperationLog {
  return {
    id,
    userId,
    username,
    type,
    action,
    target,
    detail,
    ip,
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    result,
    traceId: 'b1f2c3d4',
    createdAt: new Date(Date.now() - minutesAgo * 60_000).toISOString(),
  }
}

export function mockLogPage(q: LogQuery) {
  let list = [...mockLogs]
  if (q.type) list = list.filter((l) => l.type === q.type)
  if (q.result) list = list.filter((l) => l.result === q.result)
  if (q.keyword) {
    const kw = q.keyword
    list = list.filter(
      (l) => (l.username ?? '').includes(kw) || (l.action ?? '').includes(kw) || (l.ip ?? '').includes(kw),
    )
  }
  if (q.userId) list = list.filter((l) => l.userId === q.userId)
  return paginate(list, q.page ?? 1, q.size ?? 20)
}

export function mockLogDetail(id: number): OperationLog | undefined {
  return mockLogs.find((l) => l.id === id)
}

export function mockLogExportCsv(): string {
  const head = 'time,username,type,action,target,ip,result'
  const body = mockLogs
    .map((l) => [l.createdAt, l.username, l.type, l.action, l.target ?? '', l.ip, l.result].join(','))
    .join('\n')
  return `\uFEFF${head}\n${body}\n`
}

export function mockNextLogId() {
  return ++logSeq
}

// ---------------- 仪表盘 ----------------

export function mockDashboardStats(): DashboardStats {
  return {
    kbCount: 12,
    documentCount: 346,
    chunkCount: 18204,
    todayChatCount: 86,
    todaySqlCount: 43,
    sqlSuccessRate: 0.93,
    todayPromptTokens: 860000,
    todayCompletionTokens: 420000,
    datasourceCount: 2,
    activeUserCount: 7,
  }
}

export function mockUsageTrend(days: number): UsageTrend {
  const points = []
  const baseChat = 60
  const baseSql = 30
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const wave = Math.sin(i / 2.2) * 12
    const chatCount = Math.max(0, Math.round(baseChat + wave + (days - i) * 1.6))
    const sqlCount = Math.max(0, Math.round(baseSql + wave / 2 + (days - i) * 0.8))
    points.push({
      date: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
      chatCount,
      sqlCount,
      tokens: (chatCount + sqlCount) * 9200,
    })
  }
  return { days, points }
}

export function mockHealth(): HealthComponent[] {
  return [
    { component: 'PostgreSQL', status: 'UP', latencyMs: 3, detail: 'pgvector 0.7.4' },
    { component: 'LocalStorage', status: 'UP', latencyMs: 1, detail: '可用 42.3GB / 共 512GB' },
    { component: 'ChatModel:gpt-4o-mini', status: 'UP', latencyMs: 842, detail: '默认模型' },
    { component: 'EmbeddingModel:bge-m3', status: 'UP', latencyMs: 210, detail: 'dim=1024' },
    { component: 'RerankModel:bge-reranker-v2-m3', status: 'DISABLED', latencyMs: null, detail: '未启用' },
    { component: 'Redis', status: 'UP', latencyMs: 1, detail: '7.2' },
    { component: 'RabbitMQ', status: 'UP', latencyMs: 6, detail: 'wenqu.ingest 积压 0' },
    { component: 'Datasource:prod-pg-01', status: 'UP', latencyMs: 47, detail: '24 表' },
  ]
}

export function mockSystemInfo(): SystemInfo {
  return {
    appName: 'wenqu-backend',
    version: '0.0.1-SNAPSHOT',
    springBootVersion: '4.1.1',
    javaVersion: '17',
    startedAt: new Date(Date.now() - 7440_000).toISOString(),
    uptimeSeconds: 7440,
  }
}
