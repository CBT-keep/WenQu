/**
 * RAG 知识库 / 文档 / 分片类型 —— 严格对齐 doc/04 第五、六部分。
 * 命名一律 camelCase（doc/04 附录 §9）。
 */

export type KbStatus = 'EMPTY' | 'INDEXING' | 'READY'
export type RetrievalMode = 'VECTOR' | 'BM25' | 'HYBRID'
export type Visibility = 'PRIVATE' | 'PUBLIC'

export type DocStatus = 'PENDING' | 'PARSING' | 'CHUNKING' | 'EMBEDDING' | 'READY' | 'FAILED'

export interface KnowledgeBase {
  id: number
  name: string
  description?: string | null
  embeddingModelId: number
  embeddingModelName?: string
  rerankEnabled: boolean
  rerankModelId?: number | null
  retrievalMode: RetrievalMode
  topK: number
  scoreThreshold: number
  vectorWeight: number
  bm25Weight: number
  chunkSize?: number
  chunkOverlap?: number
  separators?: string[]
  ownerId: number
  ownerName?: string
  visibility: Visibility
  status: KbStatus
  docCount: number
  chunkCount: number
  createdAt: string
  updatedAt: string
}

export interface KbStats {
  docCount: number
  chunkCount: number
  docStatus: Record<string, number>
  storageBytes: number
  lastIndexedAt?: string | null
  avgChunkTokens: number
}

export interface KbQuery {
  page?: number
  size?: number
  keyword?: string
  status?: KbStatus | ''
  ownerId?: number
}

export interface KbCreatePayload {
  name: string
  description?: string
  embeddingModelId: number
  rerankModelId?: number
  chunkSize?: number
  chunkOverlap?: number
  separators?: string[]
  retrievalMode?: RetrievalMode
  vectorWeight?: number
  bm25Weight?: number
  rerankEnabled?: boolean
  topK?: number
  scoreThreshold?: number
  visibility?: Visibility
}

/** 更新知识库：字段同创建均可选；改切分/模型会返回 needReindex 提示（doc/04 §5.3） */
export type KbUpdatePayload = Partial<KbCreatePayload>

export interface KbUpdateResult extends KnowledgeBase {
  needReindex?: boolean
}

export interface DocumentItem {
  id: number
  kbId: number
  name: string
  fileType: string
  fileSize: number
  charCount: number
  chunkCount: number
  status: DocStatus
  /** 派生进度，0–100（doc/04 §6.1） */
  progress: number
  errorMsg?: string | null
  createdAt: string
  updatedAt: string
}

export interface DocumentQuery {
  page?: number
  size?: number
  keyword?: string
  status?: DocStatus | ''
}

export interface UploadAccepted {
  documentId: number
  name: string
  status: DocStatus
}

export interface UploadRejected {
  name: string
  code: number
  message: string
}

export interface UploadResult {
  accepted: UploadAccepted[]
  rejected: UploadRejected[]
}

export interface ChunkItem {
  id: number
  chunkIndex: number
  tokenCount: number
  content: string
  hasEmbedding: boolean
  metadata?: Record<string, unknown> | null
  createdAt: string
}

export interface ChunkQuery {
  page?: number
  size?: number
  keyword?: string
}

/** 检索测试引用（doc/04 §5.5，含各路得分与排位） */
export interface RetrievalReference {
  index: number
  chunkId: number
  documentId: number
  documentName: string
  kbId: number
  chunkIndex: number
  score: number
  vectorScore?: number
  bm25Score?: number
  vectorRank?: number
  bm25Rank?: number
  rerankScore?: number
  snippet: string
  metadata?: Record<string, unknown> | null
}

export interface RetrievalRequest {
  query: string
  topK?: number
  mode?: RetrievalMode
  scoreThreshold?: number
  vectorWeight?: number
  bm25Weight?: number
  rerankEnabled?: boolean
  rerankCandidates?: number
  includeExplanation?: boolean
}

export interface RetrievalResult {
  query: string
  mode: RetrievalMode
  rerankUsed: boolean
  elapsedMs: number
  timings?: { vectorMs: number; bm25Ms: number; rerankMs: number; totalMs: number }
  references: RetrievalReference[]
}

export interface ReindexPayload {
  onlyFailed?: boolean
  resetMode?: 'REPLACE' | 'APPEND'
}

export interface ReindexResult {
  accepted: boolean
  documentCount: number
  kbStatus: KbStatus
}

export interface KbOption {
  id: number
  name: string
  status: KbStatus
  chunkCount: number
}
