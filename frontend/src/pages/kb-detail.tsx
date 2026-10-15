import { useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ChevronLeft,
  Download,
  FileCode,
  FileText,
  Layers,
  RefreshCw,
  RotateCcw,
  Search,
  Settings2,
  Trash2,
  Upload,
} from 'lucide-react'
import { PageHeader, Panel } from '@/components/layout/page'
import { Tag } from '@/components/ui/tag'
import { Input } from '@/components/ui/input'
import { Field } from '@/components/ui/field'
import { Select } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Seg } from '@/components/ui/seg'
import { Button } from '@/components/ui/button'
import { Alert, EmptyState, ErrorBlock, LoadingBlock, Spinner } from '@/components/ui/feedback'
import { ConfirmModal, Modal } from '@/components/ui/modal'
import { Pagination } from '@/components/ui/pagination'
import {
  deleteChunk,
  deleteDocument,
  downloadDocument,
  fetchChunks,
  fetchDocuments,
  fetchKbStats,
  fetchKnowledgeBase,
  reindexDocument,
  reindexKnowledgeBase,
  retryDocument,
  updateChunk,
  updateKnowledgeBase,
  uploadDocuments,
} from '@/api/kb'
import { toApiError } from '@/lib/http'
import { formatBytes, formatNumber, formatTime } from '@/lib/format'
import { DOC_STATUS, KB_STATUS, RETRIEVAL_MODE } from '@/lib/status'
import { btnGhost, btnPrimary, btnPrimarySm, inputCls, rowBtn, rowBtnDanger, tagCol, tagColWide } from '@/lib/styles'
import type { ChunkItem, DocumentItem, DocumentQuery, KbUpdatePayload, KnowledgeBase, RetrievalMode } from '@/types'
import { useToastStore } from '@/stores/toast'
import { cn } from '@/lib/utils'

const ACTIVE_DOC_STATUS = ['PENDING', 'PARSING', 'CHUNKING', 'EMBEDDING']

export default function KbDetailPage() {
  const { id } = useParams()
  const kbId = Number(id)
  const navigate = useNavigate()
  const pushToast = useToastStore((s) => s.push)
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [docQuery, setDocQuery] = useState<DocumentQuery>({ page: 1, size: 10, keyword: '', status: '' })
  const [keywordInput, setKeywordInput] = useState('')
  const [selected, setSelected] = useState<number[]>([])
  const [configOpen, setConfigOpen] = useState(false)
  const [chunkDoc, setChunkDoc] = useState<DocumentItem | null>(null)
  const [deleting, setDeleting] = useState<DocumentItem | null>(null)
  const [batchDeleteOpen, setBatchDeleteOpen] = useState(false)
  const [reindexOpen, setReindexOpen] = useState(false)

  const kbQuery = useQuery({ queryKey: ['kb', kbId], queryFn: () => fetchKnowledgeBase(kbId) })
  const statsQuery = useQuery({ queryKey: ['kb-stats', kbId], queryFn: () => fetchKbStats(kbId) })
  const docsQuery = useQuery({
    queryKey: ['docs', kbId, docQuery],
    queryFn: () => fetchDocuments(kbId, docQuery),
    placeholderData: keepPreviousData,
    // 有非终态文档时每 3s 轮询（doc/04 附录 §5）
    refetchInterval: (query) => {
      const records = query.state.data?.records ?? []
      return records.some((d) => ACTIVE_DOC_STATUS.includes(d.status)) ? 3000 : false
    },
  })

  const uploadMut = useMutation({
    mutationFn: (files: File[]) => uploadDocuments(kbId, files),
    onSuccess: (res) => {
      const ok = res.accepted.length
      const bad = res.rejected.length
      if (ok > 0) pushToast(`已受理 ${ok} 个文件，正在解析`)
      if (bad > 0) pushToast(`${bad} 个文件被拒绝：${res.rejected[0].message}`)
      setSelected([])
      invalidateAll()
    },
    onError: (e) => pushToast(toApiError(e).message),
  })

  const reindexDocMut = useMutation({
    mutationFn: (docId: number) => reindexDocument(docId),
    onSuccess: () => {
      pushToast('已提交重建')
      invalidateAll()
    },
    onError: (e) => pushToast(toApiError(e).message),
  })

  const retryMut = useMutation({
    mutationFn: (docId: number) => retryDocument(docId),
    onSuccess: () => {
      pushToast('已提交重试')
      invalidateAll()
    },
    onError: (e) => pushToast(toApiError(e).message),
  })

  const deleteDocMut = useMutation({
    mutationFn: (docId: number) => deleteDocument(docId),
    onSuccess: () => {
      pushToast('文档已删除')
      setDeleting(null)
      setSelected([])
      invalidateAll()
    },
    onError: (e) => pushToast(toApiError(e).message),
  })

  const batchDeleteMut = useMutation({
    mutationFn: async (ids: number[]) => {
      for (const docId of ids) await deleteDocument(docId)
    },
    onSuccess: () => {
      pushToast('已删除所选文档')
      setBatchDeleteOpen(false)
      setSelected([])
      invalidateAll()
    },
    onError: (e) => pushToast(toApiError(e).message),
  })

  const reindexMut = useMutation({
    mutationFn: () => reindexKnowledgeBase(kbId, { onlyFailed: false, resetMode: 'REPLACE' }),
    onSuccess: (res) => {
      pushToast(`已提交重建 ${res.documentCount} 个文档`)
      setReindexOpen(false)
      invalidateAll()
      queryClient.invalidateQueries({ queryKey: ['kb', kbId] })
    },
    onError: (e) => pushToast(toApiError(e).message),
  })

  function invalidateAll() {
    queryClient.invalidateQueries({ queryKey: ['docs', kbId] })
    queryClient.invalidateQueries({ queryKey: ['kb-stats', kbId] })
    queryClient.invalidateQueries({ queryKey: ['kb', kbId] })
  }

  const kb = kbQuery.data
  const records = docsQuery.data?.records ?? []
  const allChecked = records.length > 0 && records.every((d) => selected.includes(d.id))

  const configRows = useMemo(
    () =>
      kb
        ? [
            ['切分策略', '递归字符'],
            ['块大小', `${kb.chunkSize ?? 800} tokens`],
            ['重叠', String(kb.chunkOverlap ?? 120)],
            ['检索方式', `${RETRIEVAL_MODE[kb.retrievalMode]}（${kb.vectorWeight}/${kb.bm25Weight}）`],
            ['TopK / 阈值', `${kb.topK} / ${kb.scoreThreshold}`],
            ['重排', kb.rerankEnabled ? '已启用' : '未启用'],
          ]
        : [],
    [kb],
  )

  if (kbQuery.isLoading) return <LoadingBlock className="h-full" />
  if (kbQuery.error || !kb) return <ErrorBlock className="h-full" message={toApiError(kbQuery.error).message} />

  const status = KB_STATUS[kb.status] ?? KB_STATUS.EMPTY

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto p-6">
        <button type="button" className={cn(btnGhost, 'mb-3 h-8 px-2.5')} onClick={() => navigate('/kb')}>
          <ChevronLeft className="size-4" />
          返回知识库
        </button>

        <PageHeader
          title={
            <span className="flex flex-wrap items-center gap-2">
              {kb.name}
              <Tag tone={status.tone}>{status.label}</Tag>
              <Tag tone="gray">{kb.embeddingModelName ?? 'embedding'} / 1024</Tag>
              <Tag tone="gray">
                {RETRIEVAL_MODE[kb.retrievalMode]}
                {kb.rerankEnabled ? ' + 重排' : ''}
              </Tag>
            </span>
          }
          description={kb.description || '暂无描述'}
          actions={
            <>
              <Button variant="outline" size="lg" onClick={() => setConfigOpen(true)}>
                <Settings2 />
                切分配置
              </Button>
              <Button variant="outline" size="lg" onClick={() => setReindexOpen(true)}>
                <RefreshCw />
                重建索引
              </Button>
              <button
                type="button"
                className={btnPrimary}
                disabled={uploadMut.isPending}
                onClick={() => fileInputRef.current?.click()}
              >
                {uploadMut.isPending ? <Spinner className="size-4" /> : <Upload className="size-4" />}
                上传文档
              </button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                hidden
                accept=".pdf,.docx,.doc,.md,.markdown,.txt,.html,.htm"
                onChange={(e) => {
                  const files = Array.from(e.target.files ?? [])
                  if (files.length > 0) uploadMut.mutate(files)
                  e.target.value = ''
                }}
              />
            </>
          }
        />

        {/* 概览指标 */}
        <div className="mb-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
          <Metric label="文档总数" value={formatNumber(statsQuery.data?.docCount ?? kb.docCount)} />
          <Metric label="分片总数" value={formatNumber(statsQuery.data?.chunkCount ?? kb.chunkCount)} />
          <Metric label="平均分片大小" value={String(statsQuery.data?.avgChunkTokens ?? 0)} unit="tokens" />
          <Metric label="占用存储" value={formatBytes(statsQuery.data?.storageBytes)} />
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-4">
          {/* 文档表 */}
          <Panel flush className="xl:col-span-3">
            <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-3">
              <div className="relative">
                <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-ink-4" />
                <Input
                  value={keywordInput}
                  onChange={(e) => setKeywordInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') setDocQuery((q) => ({ ...q, keyword: keywordInput.trim(), page: 1 }))
                  }}
                  placeholder="搜索文档名…"
                  className="h-8 w-52 rounded-md border-line-strong bg-bg-section pl-8 text-[14px]"
                />
              </div>
              <Select
                wrapperClassName="w-32"
                className="h-8"
                value={docQuery.status ?? ''}
                onChange={(e) => setDocQuery((q) => ({ ...q, status: e.target.value as DocumentQuery['status'], page: 1 }))}
              >
                <option value="">全部状态</option>
                {Object.entries(DOC_STATUS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v.label}
                  </option>
                ))}
              </Select>
              {selected.length > 0 && (
                /* 工具条是 flex-wrap，按钮必须自带 flex-none + nowrap，
                   否则会被压窄成"图标一行、文字一行"（rowBtn 是给表格行内用的，不含这些） */
                <button
                  type="button"
                  className={cn(
                    'inline-flex h-8 flex-none cursor-pointer items-center gap-1.5 rounded-md border-0 bg-transparent px-2 text-[14px] whitespace-nowrap text-ink-2',
                    'transition-colors hover:bg-danger-bg hover:text-danger',
                  )}
                  onClick={() => setBatchDeleteOpen(true)}
                >
                  <Trash2 className="size-3.5 flex-none" />
                  删除所选（{selected.length}）
                </button>
              )}
            </div>

            {docsQuery.isLoading ? (
              <LoadingBlock />
            ) : docsQuery.error ? (
              <ErrorBlock message={toApiError(docsQuery.error).message} />
            ) : records.length === 0 ? (
              <EmptyState
                icon={<FileText className="size-5" />}
                title="还没有文档"
                description="上传 PDF / Word / Markdown / TXT / HTML，系统会异步完成解析、切分与向量化。"
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[860px] border-collapse text-left text-[14px]">
                  <thead>
                    <tr>
                      <th className="w-9 border-b border-line bg-bg-section px-4 py-2.5">
                        <input
                          type="checkbox"
                          checked={allChecked}
                          onChange={(e) =>
                            setSelected(e.target.checked ? records.map((d) => d.id) : [])
                          }
                        />
                      </th>
                      {['文档名称', '格式', '大小', '分片', '状态', '更新时间', ''].map((h) => (
                        <th
                          key={h}
                          className={cn(
                            'border-b border-line bg-bg-section px-3 py-2.5 text-[13px] font-medium whitespace-nowrap text-ink-3',
                            h === '' && 'text-right',
                          )}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {records.map((doc) => {
                      const st = DOC_STATUS[doc.status] ?? DOC_STATUS.PENDING
                      const Icon = doc.fileType === 'md' || doc.fileType === 'html' ? FileCode : FileText
                      return (
                        <tr key={doc.id} className="border-b border-line last:border-0 hover:bg-bg-hover/60">
                          <td className="px-4 py-3">
                            <input
                              type="checkbox"
                              checked={selected.includes(doc.id)}
                              onChange={(e) =>
                                setSelected((prev) =>
                                  e.target.checked ? [...prev, doc.id] : prev.filter((x) => x !== doc.id),
                                )
                              }
                            />
                          </td>
                          <td className="px-3 py-3">
                            <span className="inline-flex min-w-0 items-center gap-2">
                              <Icon className={cn('size-3.5 flex-none', docIconColor(doc.fileType))} />
                              <span className="truncate font-medium text-ink">{doc.name}</span>
                            </span>
                            {doc.status === 'FAILED' && doc.errorMsg && (
                              <p className="mt-0.5 truncate text-[12.5px] text-danger">{doc.errorMsg}</p>
                            )}
                          </td>
                          <td className="px-3 py-3">
                            <Tag tone="gray" className={tagCol}>
                              {doc.fileType.toUpperCase()}
                            </Tag>
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap text-ink-3">{formatBytes(doc.fileSize)}</td>
                          <td className="px-3 py-3 whitespace-nowrap text-ink-3">{doc.chunkCount || '—'}</td>
                          <td className="px-3 py-3">
                            {/* 进度百分比固定占位：处理中/已就绪的标签才不会左右错位 */}
                            <span className="inline-flex items-center gap-1.5">
                              <Tag tone={st.tone} className={tagColWide}>
                                {st.label}
                              </Tag>
                              <span className="w-9 text-[12px] tabular-nums text-ink-4">
                                {ACTIVE_DOC_STATUS.includes(doc.status) ? `${doc.progress}%` : ''}
                              </span>
                            </span>
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap text-ink-3">{formatTime(doc.updatedAt)}</td>
                          <td className="px-3 py-3">
                            <div className="flex justify-end gap-0.5 whitespace-nowrap">
                              {doc.status === 'READY' && (
                                <button type="button" className={rowBtn} onClick={() => setChunkDoc(doc)}>
                                  <Layers className="mr-1 inline size-3" />
                                  分片
                                </button>
                              )}
                              {doc.status === 'FAILED' && (
                                <button type="button" className={rowBtn} onClick={() => retryMut.mutate(doc.id)}>
                                  <RotateCcw className="mr-1 inline size-3" />
                                  重试
                                </button>
                              )}
                              <button
                                type="button"
                                className={rowBtn}
                                title="下载原文件"
                                onClick={() =>
                                  downloadDocument(doc).catch((e) => pushToast(toApiError(e).message))
                                }
                              >
                                <Download className="size-3.5" />
                              </button>
                              {doc.status === 'READY' && (
                                <button type="button" className={rowBtn} onClick={() => reindexDocMut.mutate(doc.id)}>
                                  重建
                                </button>
                              )}
                              <button type="button" className={rowBtnDanger} onClick={() => setDeleting(doc)}>
                                删除
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {docsQuery.data && docsQuery.data.total > 0 && (
              <Pagination
                className="border-t border-line px-4 py-3"
                page={docsQuery.data.page}
                pages={docsQuery.data.pages}
                total={docsQuery.data.total}
                label="个文档"
                extra={selected.length > 0 ? `已选 ${selected.length} 项` : undefined}
                onPage={(p) => setDocQuery((q) => ({ ...q, page: p }))}
              />
            )}
          </Panel>

          {/* 右侧：配置 */}
          <div className="space-y-4">
            <Panel title="切分与检索配置" extra={<Button variant="ghost" size="xs" onClick={() => setConfigOpen(true)}>编辑</Button>}>
              <div className="space-y-2.5 text-[13.5px]">
                {configRows.map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between gap-2">
                    <span className="text-ink-3">{k}</span>
                    <span className="text-right text-ink">{v}</span>
                  </div>
                ))}
              </div>
            </Panel>
            <Panel title="文档状态分布">
              <div className="space-y-2 text-[13.5px]">
                {Object.entries(DOC_STATUS).map(([key, style]) => {
                  const count = statsQuery.data?.docStatus?.[key] ?? 0
                  if (count === 0 && key !== 'READY') return null
                  return (
                    <div key={key} className="flex items-center justify-between">
                      <Tag tone={style.tone}>{style.label}</Tag>
                      <span className="tabular-nums text-ink">{count}</span>
                    </div>
                  )
                })}
              </div>
            </Panel>
          </div>
        </div>
      </div>

      {configOpen && (
        <ConfigModal kb={kb} onClose={() => setConfigOpen(false)} onSaved={invalidateAll} />
      )}
      {chunkDoc && <ChunkModal doc={chunkDoc} onClose={() => setChunkDoc(null)} />}

      <ConfirmModal
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={() => deleting && deleteDocMut.mutate(deleting.id)}
        title="删除文档"
        description={
          <>
            确定删除 <b>{deleting?.name}</b> 吗？其分片与本地文件将被移除，不可恢复。
          </>
        }
        confirmText="删除"
        danger
        loading={deleteDocMut.isPending}
      />
      <ConfirmModal
        open={batchDeleteOpen}
        onClose={() => setBatchDeleteOpen(false)}
        onConfirm={() => batchDeleteMut.mutate(selected)}
        title="批量删除"
        description={<>确定删除所选的 {selected.length} 个文档吗？该操作不可恢复。</>}
        confirmText="删除"
        danger
        loading={batchDeleteMut.isPending}
      />
      <ConfirmModal
        open={reindexOpen}
        onClose={() => setReindexOpen(false)}
        onConfirm={() => reindexMut.mutate()}
        title="重建索引"
        description="将对全库文档重新执行解析、切分与向量化（REPLACE 模式会先删除旧分片）。知识库将进入「索引中」状态。"
        confirmText="开始重建"
        loading={reindexMut.isPending}
      />
    </div>
  )
}

function Metric({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div className="rounded-xl border border-line bg-bg-card p-4">
      <div className="text-[13px] text-ink-3">{label}</div>
      <div className="mt-1 text-[23px] leading-none font-medium tabular-nums text-ink">
        {value}
        {unit && <span className="ml-1 text-[14px] font-normal text-ink-3">{unit}</span>}
      </div>
    </div>
  )
}

function docIconColor(type: string): string {
  switch (type) {
    case 'pdf':
      return 'text-danger'
    case 'docx':
    case 'doc':
      return 'text-info'
    case 'html':
    case 'htm':
      return 'text-warn'
    case 'md':
    case 'markdown':
      return 'text-ink-3'
    default:
      return 'text-ok'
  }
}

// ---------------- 切分配置 ----------------

function ConfigModal({
  kb,
  onClose,
  onSaved,
}: {
  kb: KnowledgeBase
  onClose: () => void
  onSaved: () => void
}) {
  const pushToast = useToastStore((s) => s.push)
  const [form, setForm] = useState({
    chunkSize: kb.chunkSize ?? 800,
    chunkOverlap: kb.chunkOverlap ?? 120,
    retrievalMode: kb.retrievalMode,
    vectorWeight: kb.vectorWeight,
    bm25Weight: kb.bm25Weight,
    topK: kb.topK,
    scoreThreshold: kb.scoreThreshold,
    rerankEnabled: kb.rerankEnabled,
  })

  const saveMut = useMutation({
    mutationFn: () => updateKnowledgeBase(kb.id, form as KbUpdatePayload),
    onSuccess: (res) => {
      pushToast(res.needReindex ? '已保存；切分/模型变更需重建索引才生效' : '已保存')
      onSaved()
      onClose()
    },
    onError: (e) => pushToast(toApiError(e).message),
  })

  return (
    <Modal
      open
      onClose={onClose}
      title="切分与检索配置"
      width="max-w-[560px]"
      footer={
        <>
          <button type="button" className={btnGhost} onClick={onClose}>
            取消
          </button>
          <button type="button" className={btnPrimary} disabled={saveMut.isPending} onClick={() => saveMut.mutate()}>
            保存
          </button>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-4">
        <Field label="块大小（tokens）">
          <Input
            type="number"
            value={form.chunkSize}
            onChange={(e) => setForm((f) => ({ ...f, chunkSize: Number(e.target.value) }))}
            className={inputCls}
          />
        </Field>
        <Field label="重叠">
          <Input
            type="number"
            value={form.chunkOverlap}
            onChange={(e) => setForm((f) => ({ ...f, chunkOverlap: Number(e.target.value) }))}
            className={inputCls}
          />
        </Field>
        <Field label="召回 TopK">
          <Input
            type="number"
            value={form.topK}
            onChange={(e) => setForm((f) => ({ ...f, topK: Number(e.target.value) }))}
            className={inputCls}
          />
        </Field>
        <Field label="相似度阈值">
          <Input
            type="number"
            step="0.05"
            value={form.scoreThreshold}
            onChange={(e) => setForm((f) => ({ ...f, scoreThreshold: Number(e.target.value) }))}
            className={inputCls}
          />
        </Field>
      </div>

      <div className="mt-4">
        <Field label="检索方式">
          <Seg
            value={form.retrievalMode}
            onChange={(v) => setForm((f) => ({ ...f, retrievalMode: v as RetrievalMode }))}
            options={[
              { value: 'HYBRID', label: '混合检索' },
              { value: 'VECTOR', label: '仅向量' },
              { value: 'BM25', label: '仅关键词' },
            ]}
          />
        </Field>
      </div>

      {form.retrievalMode === 'HYBRID' && (
        <div className="mt-4 grid grid-cols-2 gap-4">
          <Field label="向量权重">
            <Input
              type="number"
              step="0.1"
              value={form.vectorWeight}
              onChange={(e) => setForm((f) => ({ ...f, vectorWeight: Number(e.target.value) }))}
              className={inputCls}
            />
          </Field>
          <Field label="BM25 权重">
            <Input
              type="number"
              step="0.1"
              value={form.bm25Weight}
              onChange={(e) => setForm((f) => ({ ...f, bm25Weight: Number(e.target.value) }))}
              className={inputCls}
            />
          </Field>
        </div>
      )}

      <div className="mt-4 flex items-center justify-between rounded-md border border-line px-3 py-2.5">
        <span className="text-[14px] text-ink">启用重排</span>
        <Switch
          checked={form.rerankEnabled}
          onChange={(v) => setForm((f) => ({ ...f, rerankEnabled: v }))}
          aria-label="启用重排"
        />
      </div>

      <Alert tone="warn" className="mt-4">
        修改块大小 / 重叠会使已索引分片失效，需手动「重建索引」后生效（doc/04 §5.3）。
      </Alert>
    </Modal>
  )
}

// ---------------- 分片管理 ----------------

function ChunkModal({ doc, onClose }: { doc: DocumentItem; onClose: () => void }) {
  const pushToast = useToastStore((s) => s.push)
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [editing, setEditing] = useState<ChunkItem | null>(null)
  const [draft, setDraft] = useState('')
  const [removing, setRemoving] = useState<ChunkItem | null>(null)

  const { data, isLoading, error } = useQuery({
    queryKey: ['chunks', doc.id, page],
    queryFn: () => fetchChunks(doc.id, { page, size: 10 }),
    placeholderData: keepPreviousData,
  })

  const saveMut = useMutation({
    mutationFn: (vars: { id: number; content: string }) => updateChunk(vars.id, vars.content),
    onSuccess: () => {
      pushToast('分片已更新，向量已重算')
      setEditing(null)
      queryClient.invalidateQueries({ queryKey: ['chunks', doc.id] })
    },
    onError: (e) => pushToast(toApiError(e).message),
  })

  const deleteMut = useMutation({
    mutationFn: (id: number) => deleteChunk(id),
    onSuccess: () => {
      pushToast('分片已删除')
      setRemoving(null)
      queryClient.invalidateQueries({ queryKey: ['chunks', doc.id] })
    },
    onError: (e) => pushToast(toApiError(e).message),
  })

  return (
    <Modal
      open
      onClose={onClose}
      title={`分片 · ${doc.name}`}
      width="max-w-[720px]"
      footer={
        <button type="button" className={btnGhost} onClick={onClose}>
          关闭
        </button>
      }
    >
      {isLoading ? (
        <LoadingBlock />
      ) : error ? (
        <ErrorBlock message={toApiError(error).message} />
      ) : (data?.records.length ?? 0) === 0 ? (
        <EmptyState icon={<Layers className="size-5" />} title="暂无分片" />
      ) : (
        <div className="max-h-[52vh] space-y-2 overflow-y-auto pr-1">
          {data!.records.map((c) => (
            <div key={c.id} className="rounded-lg border border-line p-3">
              <div className="mb-1.5 flex items-center gap-2 text-[12.5px] text-ink-3">
                <Tag tone="gray">#{c.chunkIndex}</Tag>
                <span>{c.tokenCount} tokens</span>
                <span>{c.hasEmbedding ? '已向量化' : '未向量化'}</span>
                <div className="ml-auto flex gap-0.5">
                  <button
                    type="button"
                    className={rowBtn}
                    onClick={() => {
                      setEditing(c)
                      setDraft(c.content)
                    }}
                  >
                    编辑
                  </button>
                  <button type="button" className={rowBtnDanger} onClick={() => setRemoving(c)}>
                    删除
                  </button>
                </div>
              </div>
              {editing?.id === c.id ? (
                <div>
                  <textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    rows={5}
                    className="w-full resize-y rounded-md border border-line-strong bg-bg-card px-3 py-2 text-[14px] leading-relaxed text-ink outline-none focus:border-accent"
                  />
                  <div className="mt-2 flex justify-end gap-2">
                    <Button variant="outline" size="sm" onClick={() => setEditing(null)}>
                      取消
                    </Button>
                    <button
                      type="button"
                      className={btnPrimarySm}
                      disabled={saveMut.isPending}
                      onClick={() => saveMut.mutate({ id: c.id, content: draft })}
                    >
                      保存并重算
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-[14px] leading-relaxed text-ink-2">{c.content}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {data && data.total > 0 && (
        <Pagination
          className="mt-3"
          page={data.page}
          pages={data.pages}
          total={data.total}
          label="个分片"
          onPage={setPage}
        />
      )}

      <ConfirmModal
        open={!!removing}
        onClose={() => setRemoving(null)}
        onConfirm={() => removing && deleteMut.mutate(removing.id)}
        title="删除分片"
        description={<>确定删除分片 #{removing?.chunkIndex} 吗？该操作不可恢复。</>}
        confirmText="删除"
        danger
        loading={deleteMut.isPending}
      />
    </Modal>
  )
}
