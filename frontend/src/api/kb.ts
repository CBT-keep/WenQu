import { ApiError, http, unwrap } from '@/lib/http'
import { mockEnabled, mockDelay } from '@/lib/mock'
import { downloadBlob, saveBlob } from '@/lib/download'
import type { ApiResponse, PageResult } from '@/types/api'
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
  KbUpdateResult,
  KnowledgeBase,
  ReindexPayload,
  ReindexResult,
  RetrievalRequest,
  RetrievalResult,
  UploadResult,
} from '@/types/kb'
import * as mock from '@/mock/kb'

/** 知识库 / 文档 / 分片 API —— doc/04 第五、六部分。 */

// ---------------- 知识库 ----------------

export function fetchKnowledgeBases(q: KbQuery): Promise<PageResult<KnowledgeBase>> {
  if (mockEnabled('kb')) return mockDelay(mock.mockKbPage(q))
  return unwrap(http.get<ApiResponse<PageResult<KnowledgeBase>>>('/knowledge-bases', { params: q }))
}

export function fetchKnowledgeBase(id: number): Promise<KnowledgeBase> {
  if (mockEnabled('kb')) {
    const kb = mock.mockKbDetail(id)
    return kb ? mockDelay(kb) : Promise.reject(new ApiError(40001, '知识库不存在'))
  }
  return unwrap(http.get<ApiResponse<KnowledgeBase>>(`/knowledge-bases/${id}`))
}

export function createKnowledgeBase(payload: KbCreatePayload): Promise<KnowledgeBase> {
  if (mockEnabled('kb')) return mockDelay(mock.mockKbCreate(payload))
  return unwrap(http.post<ApiResponse<KnowledgeBase>>('/knowledge-bases', payload))
}

export function updateKnowledgeBase(id: number, payload: KbUpdatePayload): Promise<KbUpdateResult> {
  if (mockEnabled('kb')) {
    const res = mock.mockKbUpdate(id, payload)
    return res ? mockDelay(res) : Promise.reject(new ApiError(40001, '知识库不存在'))
  }
  return unwrap(http.put<ApiResponse<KbUpdateResult>>(`/knowledge-bases/${id}`, payload))
}

export async function deleteKnowledgeBase(id: number): Promise<null> {
  if (mockEnabled('kb')) {
    mock.mockKbDelete(id)
    return mockDelay(null)
  }
  return unwrap(http.delete<ApiResponse<null>>(`/knowledge-bases/${id}`))
}

export function fetchKbStats(id: number): Promise<KbStats> {
  if (mockEnabled('kb')) return mockDelay(mock.mockKbStats(id))
  return unwrap(http.get<ApiResponse<KbStats>>(`/knowledge-bases/${id}/stats`))
}

export function retrieve(kbId: number, payload: RetrievalRequest): Promise<RetrievalResult> {
  if (mockEnabled('kb')) return mockDelay(mock.mockRetrieve(kbId, payload))
  return unwrap(http.post<ApiResponse<RetrievalResult>>(`/knowledge-bases/${kbId}/retrieve`, payload))
}

export function reindexKnowledgeBase(kbId: number, payload: ReindexPayload = {}): Promise<ReindexResult> {
  if (mockEnabled('kb')) return mockDelay(mock.mockReindex(kbId, payload))
  return unwrap(http.post<ApiResponse<ReindexResult>>(`/knowledge-bases/${kbId}/reindex`, payload))
}

export function fetchKbOptions(): Promise<KbOption[]> {
  if (mockEnabled('kb')) return mockDelay(mock.mockKbOptions())
  return unwrap(http.get<ApiResponse<KbOption[]>>('/knowledge-bases/options'))
}

// ---------------- 文档 ----------------

export function fetchDocuments(kbId: number, q: DocumentQuery): Promise<PageResult<DocumentItem>> {
  if (mockEnabled('kb')) return mockDelay(mock.mockDocPage(kbId, q))
  return unwrap(http.get<ApiResponse<PageResult<DocumentItem>>>(`/knowledge-bases/${kbId}/documents`, { params: q }))
}

export function fetchDocument(docId: number): Promise<DocumentItem> {
  if (mockEnabled('kb')) {
    const d = mock.mockDocDetail(docId)
    return d ? mockDelay(d) : Promise.reject(new ApiError(10002, '文档不存在'))
  }
  return unwrap(http.get<ApiResponse<DocumentItem>>(`/documents/${docId}`))
}

export function uploadDocuments(kbId: number, files: File[]): Promise<UploadResult> {
  if (mockEnabled('kb')) return mockDelay(mock.mockDocUpload(kbId, files), 500)
  const form = new FormData()
  for (const f of files) form.append('files', f)
  return unwrap(
    http.post<ApiResponse<UploadResult>>(`/knowledge-bases/${kbId}/documents`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  )
}

export async function deleteDocument(docId: number): Promise<null> {
  if (mockEnabled('kb')) {
    mock.mockDocDelete(docId)
    return mockDelay(null)
  }
  return unwrap(http.delete<ApiResponse<null>>(`/documents/${docId}`))
}

export function reindexDocument(docId: number): Promise<null> {
  if (mockEnabled('kb')) {
    mock.mockDocReindex(docId)
    return mockDelay(null)
  }
  return unwrap(http.post<ApiResponse<null>>(`/documents/${docId}/reindex`))
}

export function retryDocument(docId: number): Promise<null> {
  if (mockEnabled('kb')) {
    const res = mock.mockDocRetry(docId)
    return res.ok ? mockDelay(null) : Promise.reject(new ApiError(10004, res.message ?? '操作不允许'))
  }
  return unwrap(http.post<ApiResponse<null>>(`/documents/${docId}/retry`))
}

/** 下载文档：后端鉴权后流式返回二进制（doc/04 §6.6），前端以 blob 处理 */
export async function downloadDocument(doc: Pick<DocumentItem, 'id' | 'name'>): Promise<string> {
  if (mockEnabled('kb')) {
    // 原文件内容由后端流式返回；Mock 给一个能打开的文本占位，
    // 不冒充原格式（否则会像"导出 xlsx"那样，拿到手打不开）
    const name = `${doc.name}.txt`
    saveBlob(
      new Blob(
        [`（Mock 占位）此处应为《${doc.name}》的原文件内容。\n后端接入 GET /documents/{id}/download 后即为真实文件。`],
        { type: 'text/plain;charset=utf-8' },
      ),
      name,
    )
    return mockDelay(name)
  }
  return downloadBlob(`/documents/${doc.id}/download`, { fallbackName: doc.name })
}

// ---------------- 分片 ----------------

export function fetchChunks(docId: number, q: ChunkQuery): Promise<PageResult<ChunkItem>> {
  if (mockEnabled('kb')) return mockDelay(mock.mockChunkPage(docId, q))
  return unwrap(http.get<ApiResponse<PageResult<ChunkItem>>>(`/documents/${docId}/chunks`, { params: q }))
}

export function fetchChunk(chunkId: number): Promise<ChunkItem> {
  if (mockEnabled('kb')) {
    const c = mock.mockChunkDetail(chunkId)
    return c ? mockDelay(c) : Promise.reject(new ApiError(40008, '分片不存在'))
  }
  return unwrap(http.get<ApiResponse<ChunkItem>>(`/chunks/${chunkId}`))
}

/** 编辑分片内容 —— 后端会重新计算 tsv 与 embedding（doc/04 §6.8） */
export function updateChunk(chunkId: number, content: string): Promise<ChunkItem> {
  if (mockEnabled('kb')) {
    const c = mock.mockChunkUpdate(chunkId, content)
    return c ? mockDelay(c) : Promise.reject(new ApiError(40008, '分片不存在'))
  }
  return unwrap(http.put<ApiResponse<ChunkItem>>(`/chunks/${chunkId}`, { content }))
}

export async function deleteChunk(chunkId: number): Promise<null> {
  if (mockEnabled('kb')) {
    mock.mockChunkDelete(chunkId)
    return mockDelay(null)
  }
  return unwrap(http.delete<ApiResponse<null>>(`/chunks/${chunkId}`))
}
