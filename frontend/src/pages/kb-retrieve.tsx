import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { ExternalLink, Play } from 'lucide-react'
import { PageHeader, Panel } from '@/components/layout/page'
import { Tag } from '@/components/ui/tag'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Field } from '@/components/ui/field'
import { Select } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Seg } from '@/components/ui/seg'
import { EmptyState, ErrorBlock, LoadingBlock } from '@/components/ui/feedback'
import { Modal } from '@/components/ui/modal'
import { fetchChunk, retrieve } from '@/api/kb'
import { fetchKbOptions } from '@/api/kb'
import { toApiError } from '@/lib/http'
import { formatMs } from '@/lib/format'
import { btnGhost, btnPrimary } from '@/lib/styles'
import { useToastStore } from '@/stores/toast'
import type { RetrievalMode, RetrievalRequest, RetrievalResult, RetrievalReference } from '@/types'

export default function KbRetrievePage() {
  const { id } = useParams()
  const pushToast = useToastStore((s) => s.push)
  const [openChunk, setOpenChunk] = useState<RetrievalReference | null>(null)

  const kbOptions = useQuery({ queryKey: ['kb-options'], queryFn: fetchKbOptions })

  const [kbId, setKbId] = useState(Number(id))
  const [form, setForm] = useState<RetrievalRequest>({
    query: '如何重置管理员密码？',
    topK: 8,
    scoreThreshold: 0.35,
    mode: 'HYBRID',
    vectorWeight: 0.6,
    bm25Weight: 0.4,
    rerankEnabled: true,
    includeExplanation: true,
  })

  const runMut = useMutation({
    mutationFn: () => retrieve(kbId, form),
    onError: (e) => pushToast(toApiError(e).message),
  })

  const result = runMut.data as RetrievalResult | undefined

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto p-6">
        <PageHeader
          title="检索测试"
          description="在不发起对话的情况下，直接验证某个知识库的召回质量"
        />

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-5">
          {/* 参数表单 */}
          <Panel className="xl:col-span-2">
            <div className="space-y-4">
              <Field label="目标知识库">
                <Select value={String(kbId)} onChange={(e) => setKbId(Number(e.target.value))}>
                  {(kbOptions.data ?? []).map((kb) => (
                    <option key={kb.id} value={kb.id}>
                      {kb.name}
                    </option>
                  ))}
                </Select>
              </Field>

              <Field label="查询语句">
                <Textarea
                  rows={4}
                  value={form.query}
                  onChange={(e) => setForm((f) => ({ ...f, query: e.target.value }))}
                />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="召回 TopK">
                  <Input
                    type="number"
                    className="h-9"
                    value={form.topK}
                    onChange={(e) => setForm((f) => ({ ...f, topK: Number(e.target.value) }))}
                  />
                </Field>
                <Field label="相似度阈值">
                  <Input
                    type="number"
                    step="0.05"
                    className="h-9"
                    value={form.scoreThreshold}
                    onChange={(e) => setForm((f) => ({ ...f, scoreThreshold: Number(e.target.value) }))}
                  />
                </Field>
              </div>

              <Field label="检索方式">
                <Seg
                  value={form.mode ?? 'HYBRID'}
                  onChange={(v) => setForm((f) => ({ ...f, mode: v as RetrievalMode }))}
                  options={[
                    { value: 'HYBRID', label: '混合' },
                    { value: 'VECTOR', label: '仅向量' },
                    { value: 'BM25', label: '仅关键词' },
                  ]}
                />
              </Field>

              {form.mode === 'HYBRID' && (
                <div className="grid grid-cols-2 gap-3">
                  <Field label="向量权重">
                    <Input
                      type="number"
                      step="0.1"
                      className="h-9"
                      value={form.vectorWeight}
                      onChange={(e) => setForm((f) => ({ ...f, vectorWeight: Number(e.target.value) }))}
                    />
                  </Field>
                  <Field label="BM25 权重">
                    <Input
                      type="number"
                      step="0.1"
                      className="h-9"
                      value={form.bm25Weight}
                      onChange={(e) => setForm((f) => ({ ...f, bm25Weight: Number(e.target.value) }))}
                    />
                  </Field>
                </div>
              )}

              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 text-[14px] text-ink-2">
                  <Switch
                    checked={!!form.rerankEnabled}
                    onChange={(v) => setForm((f) => ({ ...f, rerankEnabled: v }))}
                    aria-label="启用重排"
                  />
                  启用重排
                </label>
                <button
                  type="button"
                  className={btnPrimary}
                  disabled={runMut.isPending || !form.query.trim()}
                  onClick={() => runMut.mutate()}
                >
                  <Play className="size-4" />
                  {runMut.isPending ? '检索中…' : '执行检索'}
                </button>
              </div>
            </div>
          </Panel>

          {/* 结果 */}
          <div className="space-y-3 xl:col-span-3">
            {runMut.isPending ? (
              <Panel>
                <div className="space-y-3">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="h-20 animate-pulse rounded-lg bg-bg-section" />
                  ))}
                </div>
              </Panel>
            ) : runMut.error ? (
              <Panel>
                <ErrorBlock message={toApiError(runMut.error).message} />
              </Panel>
            ) : !result ? (
              <Panel>
                <EmptyState
                  title="尚未检索"
                  description="填写左侧参数并「执行检索」，这里会显示命中片段与各路得分。"
                />
              </Panel>
            ) : (
              <>
                <div className="flex flex-wrap items-center gap-2 text-[13px] text-ink-3">
                  <span className="font-medium text-ink">命中 {result.references.length} 条</span>
                  {result.timings && (
                    <>
                      <Tag tone="gray">向量 {formatMs(result.timings.vectorMs)}</Tag>
                      <Tag tone="gray">BM25 {formatMs(result.timings.bm25Ms)}</Tag>
                      {result.rerankUsed && <Tag tone="accent">重排 {formatMs(result.timings.rerankMs)}</Tag>}
                      <Tag tone="green">总计 {formatMs(result.timings.totalMs)}</Tag>
                    </>
                  )}
                </div>
                {result.references.length === 0 ? (
                  <Panel>
                    <EmptyState title="没有命中" description="尝试降低相似度阈值，或切换检索方式。" />
                  </Panel>
                ) : (
                  result.references.map((ref) => (
                    <HitCard key={ref.chunkId} ref_={ref} onOpenOriginal={() => setOpenChunk(ref)} />
                  ))
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {openChunk && <ChunkModal reference={openChunk} onClose={() => setOpenChunk(null)} />}
    </div>
  )
}

/** 命中片段 → 打开该分片的完整原文（doc/04 §6.8 `GET /chunks/{chunkId}`） */
function ChunkModal({ reference, onClose }: { reference: RetrievalReference; onClose: () => void }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['chunk', reference.chunkId],
    queryFn: () => fetchChunk(reference.chunkId),
  })

  return (
    <Modal
      open
      onClose={onClose}
      title={`原文 · ${reference.documentName}`}
      width="max-w-[640px]"
      footer={
        <button type="button" className={btnGhost} onClick={onClose}>
          关闭
        </button>
      }
    >
      {isLoading ? (
        <LoadingBlock />
      ) : error || !data ? (
        <ErrorBlock message={toApiError(error).message} />
      ) : (
        <div>
          <div className="mb-3 flex flex-wrap items-center gap-2 text-[12.5px] text-ink-3">
            <Tag tone="gray">分片 #{data.chunkIndex}</Tag>
            <span>{data.tokenCount} tokens</span>
            <span>{data.hasEmbedding ? '已向量化' : '未向量化'}</span>
            {data.metadata?.section ? <span>· {String(data.metadata.section)}</span> : null}
            <span className="ml-auto">相似度 {reference.score.toFixed(4)}</span>
          </div>
          <div className="max-h-[46vh] overflow-y-auto rounded-lg border border-line bg-bg-section p-3 text-[14px] leading-relaxed whitespace-pre-wrap text-ink-2">
            {data.content}
          </div>
        </div>
      )}
    </Modal>
  )
}

function HitCard({ ref_, onOpenOriginal }: { ref_: RetrievalReference; onOpenOriginal: () => void }) {
  return (
    <Panel>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="text-[14px] font-medium text-ink">
          #{ref_.index} {ref_.documentName}
          {ref_.metadata?.section ? ` · ${String(ref_.metadata.section)}` : ''} · 分片 #{ref_.chunkIndex}
        </span>
        <div className="ml-auto flex flex-wrap items-center gap-1.5">
          {ref_.vectorScore !== undefined && <Tag tone="gray">向量 {ref_.vectorScore.toFixed(3)}</Tag>}
          {ref_.bm25Score !== undefined && <Tag tone="green">BM25 {ref_.bm25Score.toFixed(1)}</Tag>}
          {ref_.rerankScore !== undefined && <Tag tone="accent">重排 {ref_.rerankScore.toFixed(3)}</Tag>}
        </div>
      </div>
      <p className="text-[14px] leading-relaxed text-ink-2">{ref_.snippet}</p>
      <div className="mt-3 flex items-center gap-2">
        <Tag tone="gray">最终分 {ref_.score.toFixed(4)}</Tag>
        <button
          type="button"
          className="inline-flex cursor-pointer items-center gap-1 rounded-md border-0 bg-transparent px-1.5 py-0.5 text-[13px] text-ink-3 transition-colors hover:text-ink"
          onClick={onOpenOriginal}
        >
          <ExternalLink className="size-3" />
          查看原文
        </button>
      </div>
    </Panel>
  )
}
