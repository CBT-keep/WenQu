import type {
  ChunkItem,
  ChunkQuery,
  DocumentItem,
  DocumentQuery,
  KbCreatePayload,
  KbOption,
  KbQuery,
  KbStats,
  KbUpdatePayload,
  KnowledgeBase,
  ReindexPayload,
  RetrievalReference,
  RetrievalRequest,
  UploadResult,
} from '@/types/kb'
import { paginate } from '@/lib/mock'

/**
 * KB 模块的内存 Mock。**后端就绪后整个文件可删**。
 * 带一点"活"的行为：上传/重建索引后状态机会自己往前走，前端轮询才有东西可看。
 */

function iso(daysAgo: number, hour = 9, minute = 12): string {
  const d = new Date()
  d.setDate(d.getDate() - daysAgo)
  d.setHours(hour, minute, 0, 0)
  return d.toISOString()
}

let kbSeq = 3
let docSeq = 200
let chunkSeq = 2000

export const mockKbs: KnowledgeBase[] = [
  {
    id: 1,
    name: '产品手册知识库',
    description: '产品使用文档、API 说明、版本变更记录',
    embeddingModelId: 3,
    embeddingModelName: 'bge-m3',
    rerankEnabled: true,
    rerankModelId: 4,
    retrievalMode: 'HYBRID',
    topK: 8,
    scoreThreshold: 0.35,
    vectorWeight: 0.6,
    bm25Weight: 0.4,
    chunkSize: 800,
    chunkOverlap: 120,
    ownerId: 1,
    ownerName: 'admin',
    visibility: 'PRIVATE',
    status: 'READY',
    docCount: 56,
    chunkCount: 3014,
    createdAt: iso(40, 8, 0),
    updatedAt: iso(0, 9, 12),
  },
  {
    id: 2,
    name: '公司制度规范',
    description: '人事制度、报销流程、安全规范',
    embeddingModelId: 3,
    embeddingModelName: 'bge-m3',
    rerankEnabled: false,
    retrievalMode: 'HYBRID',
    topK: 8,
    scoreThreshold: 0.35,
    vectorWeight: 0.6,
    bm25Weight: 0.4,
    chunkSize: 800,
    chunkOverlap: 120,
    ownerId: 1,
    ownerName: 'admin',
    visibility: 'PRIVATE',
    status: 'INDEXING',
    docCount: 23,
    chunkCount: 1102,
    createdAt: iso(20, 8, 0),
    updatedAt: iso(0, 9, 40),
  },
  {
    id: 3,
    name: '业务指标口径库',
    description: '指标定义与计算口径，供 NL2SQL 语义层引用',
    embeddingModelId: 3,
    embeddingModelName: 'bge-m3',
    rerankEnabled: false,
    retrievalMode: 'VECTOR',
    topK: 5,
    scoreThreshold: 0.3,
    vectorWeight: 1,
    bm25Weight: 0,
    chunkSize: 800,
    chunkOverlap: 120,
    ownerId: 1,
    ownerName: 'admin',
    visibility: 'PRIVATE',
    status: 'EMPTY',
    docCount: 0,
    chunkCount: 0,
    createdAt: iso(10, 8, 0),
    updatedAt: iso(10, 8, 0),
  },
]

export const mockDocs: DocumentItem[] = [
  doc(7, 1, '产品使用手册 v3.2.pdf', 'pdf', 4404019, 182340, 481, 'READY', iso(0, 9, 12)),
  doc(8, 1, 'REST API 接口说明.docx', 'docx', 1153433, 64020, 204, 'READY', iso(0, 9, 12)),
  doc(9, 1, '版本变更记录.md', 'md', 98304, 18200, 58, 'EMBEDDING', iso(0, 9, 40)),
  doc(10, 1, 'Sales_Report_2025Q4.pdf', 'pdf', 13421772, 0, 0, 'FAILED', iso(0, 8, 2)),
  doc(11, 1, '快速入门.html', 'html', 221184, 0, 0, 'PENDING', iso(0, 10, 1)),
  doc(12, 1, '常见问题 FAQ 与排障指南.txt', 'txt', 61440, 9200, 17, 'READY', iso(1, 15, 20)),
  doc(13, 1, '密码学基础概念.md', 'md', 40960, 6200, 12, 'READY', iso(2, 11, 5)),
  doc(14, 2, '员工报销管理办法.pdf', 'pdf', 2097152, 48000, 96, 'READY', iso(1, 10, 0)),
]

function doc(
  id: number,
  kbId: number,
  name: string,
  fileType: string,
  fileSize: number,
  charCount: number,
  chunkCount: number,
  status: DocumentItem['status'],
  updatedAt: string,
): DocumentItem {
  return {
    id,
    kbId,
    name,
    fileType,
    fileSize,
    charCount,
    chunkCount,
    status,
    progress: status === 'READY' ? 100 : status === 'FAILED' ? 0 : 42,
    errorMsg: status === 'FAILED' ? '文档解析失败：PDF 结构损坏，无法提取正文' : null,
    createdAt: updatedAt,
    updatedAt,
  }
}

export const mockChunks: Record<number, ChunkItem[]> = {
  7: [
    chunk(1280, 128, 612, '管理员密码重置：进入「系统管理 → 用户管理」→ 选择目标用户 → 点击「重置密码」。系统将生成一次性临时密码，用户首次登录后会被强制修改密码。', { section: '3.4 账户安全', page: 42 }),
    chunk(1281, 129, 588, '密码策略：连续输错 5 次将锁定账户 30 分钟；临时密码有效期 24 小时；新密码需 8–64 位且同时包含字母与数字。', { section: '3.4 账户安全', page: 43 }),
    chunk(1282, 130, 640, 'API 鉴权方式：所有业务接口需在请求头携带 `Authorization: Bearer {accessToken}`；accessToken 有效期 120 分钟，过期后用 refreshToken 换取新令牌。', { section: '5.1 认证', page: 61 }),
    chunk(1283, 131, 601, '权限模型：USER 仅能操作自己创建的资源；ADMIN 可管理全平台知识库、文档与会话；SUPERADMIN 独占用户管理、模型配置与系统参数。', { section: '2.3 角色', page: 12 }),
  ],
  8: [
    chunk(1290, 0, 540, 'GET /api/v1/knowledge-bases 返回分页知识库列表，统一响应体为 { code, message, data, traceId }。', { section: '4.1 知识点', page: 3 }),
    chunk(1291, 1, 522, 'POST /api/v1/knowledge-bases 创建知识库；embeddingModelId 必须为 EMBEDDING 类型且维度等于全局维度（1024），否则返回 40006。', { section: '4.2 知识点', page: 4 }),
  ],
  12: [
    chunk(1300, 0, 468, '数据源连接失败排查：先确认目标库网络可达与端口开放，再核对账号密码与 sslmode；只读账号需具备目标 schema 的 USAGE 与 SELECT 权限。', { section: '排障 · 数据源', page: 2 }),
  ],
}

function chunk(
  id: number,
  chunkIndex: number,
  tokenCount: number,
  content: string,
  metadata: Record<string, unknown>,
): ChunkItem {
  return { id, chunkIndex, tokenCount, content, hasEmbedding: true, metadata, createdAt: iso(0, 9, 12) }
}

// ---------------- 知识库 ----------------

export function mockKbPage(q: KbQuery) {
  let list = [...mockKbs]
  if (q.keyword) list = list.filter((k) => k.name.includes(q.keyword!))
  if (q.status) list = list.filter((k) => k.status === q.status)
  return paginate(list, q.page ?? 1, q.size ?? 20)
}

export function mockKbDetail(id: number): KnowledgeBase | undefined {
  return mockKbs.find((k) => k.id === id)
}

export function mockKbOptions(): KbOption[] {
  return mockKbs
    .filter((k) => k.status !== 'EMPTY')
    .map((k) => ({ id: k.id, name: k.name, status: k.status, chunkCount: k.chunkCount }))
}

export function mockKbCreate(payload: KbCreatePayload): KnowledgeBase {
  const now = new Date().toISOString()
  const created: KnowledgeBase = {
    id: ++kbSeq,
    name: payload.name,
    description: payload.description ?? '',
    embeddingModelId: payload.embeddingModelId,
    embeddingModelName: 'bge-m3',
    rerankEnabled: payload.rerankEnabled ?? false,
    rerankModelId: payload.rerankModelId ?? null,
    retrievalMode: payload.retrievalMode ?? 'HYBRID',
    topK: payload.topK ?? 8,
    scoreThreshold: payload.scoreThreshold ?? 0.35,
    vectorWeight: payload.vectorWeight ?? 0.6,
    bm25Weight: payload.bm25Weight ?? 0.4,
    chunkSize: payload.chunkSize ?? 800,
    chunkOverlap: payload.chunkOverlap ?? 120,
    ownerId: 1,
    ownerName: 'admin',
    visibility: payload.visibility ?? 'PRIVATE',
    status: 'EMPTY',
    docCount: 0,
    chunkCount: 0,
    createdAt: now,
    updatedAt: now,
  }
  mockKbs.unshift(created)
  return created
}

export function mockKbUpdate(id: number, payload: KbUpdatePayload) {
  const kb = mockKbs.find((k) => k.id === id)
  if (!kb) return null
  const needReindex =
    (payload.embeddingModelId !== undefined && payload.embeddingModelId !== kb.embeddingModelId) ||
    (payload.chunkSize !== undefined && payload.chunkSize !== kb.chunkSize) ||
    (payload.chunkOverlap !== undefined && payload.chunkOverlap !== kb.chunkOverlap)
  Object.assign(kb, payload, { updatedAt: new Date().toISOString() })
  return { ...kb, needReindex }
}

export function mockKbDelete(id: number): boolean {
  const idx = mockKbs.findIndex((k) => k.id === id)
  if (idx < 0) return false
  mockKbs.splice(idx, 1)
  for (let i = mockDocs.length - 1; i >= 0; i--) {
    if (mockDocs[i].kbId === id) mockDocs.splice(i, 1)
  }
  return true
}

export function mockKbStats(id: number): KbStats {
  const kb = mockKbs.find((k) => k.id === id)
  const docs = mockDocs.filter((d) => d.kbId === id)
  const docStatus: Record<string, number> = {}
  for (const d of docs) docStatus[d.status] = (docStatus[d.status] ?? 0) + 1
  return {
    docCount: kb?.docCount ?? docs.length,
    chunkCount: kb?.chunkCount ?? 0,
    docStatus,
    storageBytes: docs.reduce((sum, d) => sum + d.fileSize, 0),
    lastIndexedAt: iso(0, 9, 12),
    avgChunkTokens: 612,
  }
}

export function mockReindex(kbId: number, _payload: ReindexPayload) {
  const kb = mockKbs.find((k) => k.id === kbId)
  const docs = mockDocs.filter((d) => d.kbId === kbId)
  if (kb) kb.status = 'INDEXING'
  for (const d of docs) {
    d.status = 'PENDING'
    d.progress = 5
    advanceDoc(d.id)
  }
  return { accepted: true, documentCount: docs.length, kbStatus: 'INDEXING' as const }
}

export function mockRetrieve(kbId: number, req: RetrievalRequest) {
  const all = Object.values(mockChunks).flat()
  const pool: RetrievalReference[] = all.map((c, i) => {
    const d = mockDocs.find((x) => x.id === findDocIdOfChunk(c.id)) ?? mockDocs[0]
    const base = 0.95 - i * 0.12
    return {
      index: i + 1,
      chunkId: c.id,
      documentId: d.id,
      documentName: d.name,
      kbId,
      chunkIndex: c.chunkIndex,
      score: Number(base.toFixed(4)),
      vectorScore: Number((base - 0.06).toFixed(4)),
      bm25Score: Number((18.4 - i * 3).toFixed(2)),
      vectorRank: i + 1,
      bm25Rank: i + 3,
      rerankScore: req.rerankEnabled === false ? undefined : Number(base.toFixed(4)),
      snippet: c.content.slice(0, 120),
      metadata: c.metadata,
    }
  })
  const topK = req.topK ?? 8
  return {
    query: req.query,
    mode: req.mode ?? 'HYBRID',
    rerankUsed: req.rerankEnabled ?? false,
    elapsedMs: 412,
    timings: { vectorMs: 63, bm25Ms: 38, rerankMs: req.rerankEnabled === false ? 0 : 210, totalMs: 412 },
    references: pool.slice(0, Math.min(topK, 3)),
  }
}

function findDocIdOfChunk(chunkId: number): number {
  for (const [docId, list] of Object.entries(mockChunks)) {
    if (list.some((c) => c.id === chunkId)) return Number(docId)
  }
  return mockDocs[0]?.id ?? 7
}

// ---------------- 文档 ----------------

export function mockDocPage(kbId: number, q: DocumentQuery) {
  let list = mockDocs.filter((d) => d.kbId === kbId)
  if (q.keyword) list = list.filter((d) => d.name.includes(q.keyword!))
  if (q.status) list = list.filter((d) => d.status === q.status)
  return paginate(list, q.page ?? 1, q.size ?? 20)
}

export function mockDocDetail(docId: number): DocumentItem | undefined {
  return mockDocs.find((d) => d.id === docId)
}

export function mockDocUpload(kbId: number, files: File[]): UploadResult {
  const accepted: UploadResult['accepted'] = []
  const rejected: UploadResult['rejected'] = []
  for (const f of files) {
    const ext = (f.name.split('.').pop() ?? '').toLowerCase()
    if (!['pdf', 'docx', 'doc', 'md', 'markdown', 'txt', 'html', 'htm'].includes(ext)) {
      rejected.push({ name: f.name, code: 40003, message: '不支持的文件格式' })
      continue
    }
    if (f.size > 50 * 1024 * 1024) {
      rejected.push({ name: f.name, code: 40004, message: '文件超出大小限制（>50MB）' })
      continue
    }
    const created = doc(++docSeq, kbId, f.name, ext, f.size, 0, 0, 'PENDING', new Date().toISOString())
    created.progress = 3
    mockDocs.unshift(created)
    accepted.push({ documentId: created.id, name: created.name, status: 'PENDING' })
    advanceDoc(created.id)
  }
  const kb = mockKbs.find((k) => k.id === kbId)
  if (kb) {
    kb.docCount += accepted.length
    if (kb.status === 'EMPTY') kb.status = 'INDEXING'
  }
  return { accepted, rejected }
}

/** 让一个文档的状态机自己往前走，前端轮询才看得到进度 */
function advanceDoc(docId: number) {
  const stages: DocumentItem['status'][] = ['PARSING', 'CHUNKING', 'EMBEDDING', 'READY']
  let step = 0
  const tick = () => {
    const d = mockDocs.find((x) => x.id === docId)
    if (!d || d.status === 'FAILED') return
    const next = stages[step++]
    if (!next) return
    d.status = next
    d.progress = next === 'READY' ? 100 : 20 + step * 20
    if (next === 'READY') {
      d.chunkCount = 30 + ((d.id * 7) % 60)
      d.charCount = d.chunkCount * 600
      const kb = mockKbs.find((k) => k.id === d.kbId)
      if (kb) {
        kb.chunkCount += d.chunkCount
        kb.status = mockDocs.some((x) => x.kbId === kb.id && x.status !== 'READY' && x.status !== 'FAILED')
          ? 'INDEXING'
          : 'READY'
      }
      return
    }
    window.setTimeout(tick, 1400)
  }
  window.setTimeout(tick, 900)
}

export function mockDocDelete(docId: number): boolean {
  const idx = mockDocs.findIndex((d) => d.id === docId)
  if (idx < 0) return false
  const [removed] = mockDocs.splice(idx, 1)
  const kb = mockKbs.find((k) => k.id === removed.kbId)
  if (kb) {
    kb.docCount = Math.max(0, kb.docCount - 1)
    kb.chunkCount = Math.max(0, kb.chunkCount - removed.chunkCount)
  }
  delete mockChunks[docId]
  return true
}

export function mockDocReindex(docId: number): boolean {
  const d = mockDocs.find((x) => x.id === docId)
  if (!d) return false
  d.status = 'PENDING'
  d.progress = 3
  d.errorMsg = null
  advanceDoc(docId)
  return true
}

export function mockDocRetry(docId: number): { ok: boolean; message?: string } {
  const d = mockDocs.find((x) => x.id === docId)
  if (!d) return { ok: false, message: '文档不存在' }
  if (d.status !== 'FAILED') return { ok: false, message: '仅失败文档可重试' }
  d.status = 'PENDING'
  d.progress = 3
  d.errorMsg = null
  advanceDoc(docId)
  return { ok: true }
}

// ---------------- 分片 ----------------

export function mockChunkPage(docId: number, q: ChunkQuery) {
  let list = mockChunks[docId] ?? []
  if (q.keyword) list = list.filter((c) => c.content.includes(q.keyword!))
  return paginate(list, q.page ?? 1, q.size ?? 20)
}

export function mockChunkDetail(chunkId: number): ChunkItem | undefined {
  return Object.values(mockChunks)
    .flat()
    .find((c) => c.id === chunkId)
}

export function mockChunkUpdate(chunkId: number, content: string): ChunkItem | null {
  for (const list of Object.values(mockChunks)) {
    const c = list.find((x) => x.id === chunkId)
    if (c) {
      c.content = content
      c.tokenCount = Math.round(content.length / 1.6)
      c.hasEmbedding = true
      return c
    }
  }
  return null
}

export function mockChunkDelete(chunkId: number): boolean {
  for (const list of Object.values(mockChunks)) {
    const i = list.findIndex((x) => x.id === chunkId)
    if (i >= 0) {
      list.splice(i, 1)
      return true
    }
  }
  return false
}

/** 供下一页自增使用 */
export function nextChunkId() {
  return ++chunkSeq
}
