import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { LibraryBig, Plus, Search, Trash2 } from 'lucide-react'
import { PageHeader, Panel } from '@/components/layout/page'
import { Tag } from '@/components/ui/tag'
import { Input } from '@/components/ui/input'
import { Field } from '@/components/ui/field'
import { Select } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Seg } from '@/components/ui/seg'
import { Alert, EmptyState, ErrorBlock, LoadingBlock } from '@/components/ui/feedback'
import { ConfirmModal, Modal } from '@/components/ui/modal'
import { btnGhost, btnPrimary, inputCls } from '@/lib/styles'
import { createKnowledgeBase, deleteKnowledgeBase, fetchKnowledgeBases } from '@/api/kb'
import { fetchModelOptions } from '@/api/model'
import { toApiError } from '@/lib/http'
import { formatTime, formatNumber } from '@/lib/format'
import { KB_STATUS, RETRIEVAL_MODE } from '@/lib/status'
import type { KbCreatePayload, KbQuery, KnowledgeBase, RetrievalMode } from '@/types'
import { useToastStore } from '@/stores/toast'
import { cn } from '@/lib/utils'

export default function KbListPage() {
  const navigate = useNavigate()
  const pushToast = useToastStore((s) => s.push)
  const queryClient = useQueryClient()

  const [keywordInput, setKeywordInput] = useState('')
  const [query, setQuery] = useState<KbQuery>({ page: 1, size: 24, keyword: '' })
  const [createOpen, setCreateOpen] = useState(false)
  const [deleting, setDeleting] = useState<KnowledgeBase | null>(null)

  const { data, isLoading, error } = useQuery({
    queryKey: ['kbs', query],
    queryFn: () => fetchKnowledgeBases(query),
    placeholderData: keepPreviousData,
  })

  const deleteMut = useMutation({
    mutationFn: (id: number) => deleteKnowledgeBase(id),
    onSuccess: () => {
      pushToast('知识库已删除')
      setDeleting(null)
      queryClient.invalidateQueries({ queryKey: ['kbs'] })
    },
    onError: (e) => pushToast(toApiError(e).message),
  })

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto p-6">
        <PageHeader
          title="知识库"
          description="创建与管理 RAG 知识库，导入文档并完成解析、切分、向量化"
          actions={
            <>
              <div className="relative hidden md:block">
                <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-ink-4" />
                <Input
                  value={keywordInput}
                  onChange={(e) => setKeywordInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') setQuery((q) => ({ ...q, keyword: keywordInput.trim() }))
                  }}
                  placeholder="搜索知识库…"
                  className="h-9 w-56 rounded-md border-line-strong bg-bg-card pl-8 text-[14px]"
                />
              </div>
              <button type="button" className={btnPrimary} onClick={() => setCreateOpen(true)}>
                <Plus className="size-4" />
                新建知识库
              </button>
            </>
          }
        />

        {isLoading ? (
          <LoadingBlock />
        ) : error ? (
          <ErrorBlock message={toApiError(error).message} />
        ) : data && data.records.length > 0 ? (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {data.records.map((kb) => (
              <KbCard
                key={kb.id}
                kb={kb}
                onOpen={() => navigate(`/kb/${kb.id}`)}
                onDelete={() => setDeleting(kb)}
              />
            ))}
          </div>
        ) : (
          <Panel>
            <EmptyState
              icon={<LibraryBig className="size-5" />}
              title="还没有知识库"
              description="创建第一个知识库，上传 PDF / Word / Markdown 等文档即可开始检索问答。"
              action={
                <button type="button" className={btnPrimary} onClick={() => setCreateOpen(true)}>
                  <Plus className="size-4" />
                  新建知识库
                </button>
              }
            />
          </Panel>
        )}
      </div>

      {createOpen && (
        <KbFormModal
          onClose={() => setCreateOpen(false)}
          onCreated={(kb) => {
            setCreateOpen(false)
            navigate(`/kb/${kb.id}`)
          }}
        />
      )}

      <ConfirmModal
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={() => deleting && deleteMut.mutate(deleting.id)}
        title="删除知识库"
        description={
          <>
            确定删除知识库 <b>{deleting?.name}</b> 吗？其下全部文档与分片将级联删除，本地文件会异步清理。该操作不可恢复。
          </>
        }
        confirmText="删除"
        danger
        loading={deleteMut.isPending}
      />
    </div>
  )
}

function KbCard({ kb, onOpen, onDelete }: { kb: KnowledgeBase; onOpen: () => void; onDelete: () => void }) {
  const status = KB_STATUS[kb.status] ?? KB_STATUS.EMPTY
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => e.key === 'Enter' && onOpen()}
      className={cn(
        'group cursor-pointer rounded-xl border border-line bg-bg-card p-5 transition-[border-color,box-shadow,transform] duration-200',
        'hover:-translate-y-px hover:border-accent-soft hover:shadow-[var(--shadow-pop)]',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="grid size-10 place-items-center rounded-lg bg-accent-tint text-accent">
          <LibraryBig className="size-5" />
        </div>
        <Tag tone={status.tone}>{status.label}</Tag>
      </div>
      <div className="mt-3 text-[16px] font-medium text-ink">{kb.name}</div>
      <div className="mt-1 line-clamp-1 text-[14px] text-ink-2">{kb.description || '暂无描述'}</div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Tag tone="gray">{kb.embeddingModelName ?? 'embedding'} · 1024</Tag>
        <Tag tone="gray">{RETRIEVAL_MODE[kb.retrievalMode]}{kb.rerankEnabled ? ' + 重排' : ''}</Tag>
      </div>
      <div className="mt-3 flex items-center gap-2 border-t border-line pt-3 text-[13px] text-ink-3">
        <span>{kb.docCount} 文档</span>
        <span>·</span>
        <span>{formatNumber(kb.chunkCount)} 分片</span>
        <span>·</span>
        <span>更新于 {formatTime(kb.updatedAt)}</span>
        <button
          type="button"
          title="删除知识库"
          className="ml-auto grid size-7 place-items-center rounded-md border-0 bg-transparent text-ink-4 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-danger-bg hover:text-danger"
          onClick={(e) => {
            e.stopPropagation()
            onDelete()
          }}
        >
          <Trash2 className="size-3.5" />
        </button>
      </div>
    </div>
  )
}

function KbFormModal({ onClose, onCreated }: { onClose: () => void; onCreated: (kb: KnowledgeBase) => void }) {
  const pushToast = useToastStore((s) => s.push)
  const queryClient = useQueryClient()

  const embedQuery = useQuery({ queryKey: ['model-options', 'EMBEDDING'], queryFn: () => fetchModelOptions('EMBEDDING') })
  const rerankQuery = useQuery({ queryKey: ['model-options', 'RERANK'], queryFn: () => fetchModelOptions('RERANK') })

  const [form, setForm] = useState<KbCreatePayload>({
    name: '',
    description: '',
    embeddingModelId: 0,
    retrievalMode: 'HYBRID',
    rerankEnabled: false,
    visibility: 'PRIVATE',
  })
  const [formError, setFormError] = useState<string | null>(null)

  const embeddingOptions = embedQuery.data ?? []
  const effectiveEmbeddingId = form.embeddingModelId || embeddingOptions[0]?.id

  const submitMut = useMutation({
    mutationFn: () =>
      createKnowledgeBase({
        ...form,
        name: form.name.trim(),
        embeddingModelId: effectiveEmbeddingId!,
        rerankModelId: form.rerankEnabled ? (rerankQuery.data?.[0]?.id ?? undefined) : undefined,
      }),
    onSuccess: (kb) => {
      pushToast('知识库已创建')
      queryClient.invalidateQueries({ queryKey: ['kbs'] })
      onCreated(kb)
    },
    onError: (e) => setFormError(toApiError(e).message),
  })

  function submit() {
    setFormError(null)
    if (!form.name.trim()) {
      setFormError('请输入知识库名称')
      return
    }
    if (!effectiveEmbeddingId) {
      setFormError('请先在「设置 → 模型配置」中添加 EMBEDDING 模型')
      return
    }
    submitMut.mutate()
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="新建知识库"
      width="max-w-[520px]"
      footer={
        <>
          <button type="button" className={btnGhost} onClick={onClose}>
            取消
          </button>
          <button type="button" className={btnPrimary} disabled={submitMut.isPending} onClick={submit}>
            {submitMut.isPending ? '创建中…' : '创建'}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="名称" required>
          <Input
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="如：产品手册知识库"
            className={inputCls}
          />
        </Field>
        <Field label="描述">
          <Input
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            placeholder="可选，一句话说明用途"
            className={inputCls}
          />
        </Field>
        <Field label="Embedding 模型" required>
          <Select
            value={String(effectiveEmbeddingId ?? '')}
            onChange={(e) => setForm((f) => ({ ...f, embeddingModelId: Number(e.target.value) }))}
          >
            {embeddingOptions.length === 0 && <option value="">（无可用模型）</option>}
            {embeddingOptions.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="检索方式">
          <Seg
            value={form.retrievalMode ?? 'HYBRID'}
            onChange={(v) => setForm((f) => ({ ...f, retrievalMode: v as RetrievalMode }))}
            options={[
              { value: 'HYBRID', label: '混合检索' },
              { value: 'VECTOR', label: '仅向量' },
              { value: 'BM25', label: '仅关键词' },
            ]}
          />
        </Field>
        <div className="flex items-center justify-between rounded-md border border-line px-3 py-2.5">
          <div>
            <p className="text-[14px] text-ink">启用重排</p>
            <p className="mt-0.5 text-[12.5px] text-ink-3">对融合结果用 bge-reranker 精排（需配置 RERANK 模型）</p>
          </div>
          <Switch
            checked={!!form.rerankEnabled}
            onChange={(v) => setForm((f) => ({ ...f, rerankEnabled: v }))}
            aria-label="启用重排"
          />
        </div>
        {formError && <Alert tone="error">{formError}</Alert>}
      </div>
    </Modal>
  )
}
