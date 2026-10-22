import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowRight,
  BookMarked,
  Copy,
  Library,
  RefreshCw,
  Share2,
  ThumbsDown,
  ThumbsUp,
  Trash2,
} from 'lucide-react'
import { Composer } from '@/components/chat/composer'
import { ChipSelect, ChipOption, ChipOptionRich } from '@/components/chat/chip-select'
import { RichText } from '@/components/chat/rich-text'
import { ReferenceList } from '@/components/chat/reference-list'
import { StepList, type StepItem } from '@/components/chat/step-list'
import { Tag } from '@/components/ui/tag'
import { Button } from '@/components/ui/button'
import { Tooltip } from '@/components/ui/tooltip'
import { Alert, ErrorBlock, LoadingBlock } from '@/components/ui/feedback'
import { ConfirmModal, Modal } from '@/components/ui/modal'
import {
  deleteConversation,
  fetchConversation,
  fetchMessages,
  sendFeedback,
  stopGeneration,
  streamChatMessage,
  updateConversation,
} from '@/api/chat'
import { fetchKbOptions } from '@/api/kb'
import { fetchModelOptions } from '@/api/model'
import { toApiError } from '@/lib/http'
import { MODE_META } from '@/lib/mode'
import { isAbortError, parseEventJson } from '@/lib/sse'
import { formatMs } from '@/lib/format'
import { useInvalidateConversations } from '@/hooks/use-conversations'
import { useToastStore } from '@/stores/toast'
import type { ChatMessage, ChatReference, Conversation } from '@/types'
import { cn } from '@/lib/utils'

/** 乐观消息保留稳定的本地 id，服务端 id 单独存在 serverId 上（点赞/停止生成用） */
type LocalMessage = ChatMessage & { serverId?: number }

export default function ChatConversationPage() {
  const { id } = useParams()
  const queryClient = useQueryClient()
  const convId = Number(id)
  const location = useLocation()
  const navigate = useNavigate()
  const pushToast = useToastStore((s) => s.push)
  const invalidateConversations = useInvalidateConversations()

  const [messages, setMessages] = useState<LocalMessage[]>([])
  const [draft, setDraft] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [steps, setSteps] = useState<StepItem[]>([])
  const [usage, setUsage] = useState<{ promptTokens: number; completionTokens: number; model: string } | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [openRef, setOpenRef] = useState<ChatReference | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [renaming, setRenaming] = useState(false)
  const [titleDraft, setTitleDraft] = useState('')

  const abortRef = useRef<AbortController | null>(null)
  const activeIdRef = useRef(0)
  const seededRef = useRef(false)
  const autoSentRef = useRef(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const userScrolledUpRef = useRef(false)

  const convQuery = useQuery({ queryKey: ['conversation', convId], queryFn: () => fetchConversation(convId) })
  const messagesQuery = useQuery({ queryKey: ['messages', convId], queryFn: () => fetchMessages(convId, 1, 100) })
  const kbOptions = useQuery({ queryKey: ['kb-options'], queryFn: fetchKbOptions })
  const chatModels = useQuery({ queryKey: ['model-options', 'CHAT'], queryFn: () => fetchModelOptions('CHAT') })

  const conv = convQuery.data

  useEffect(() => {
    if (seededRef.current || !messagesQuery.data) return
    setMessages(messagesQuery.data.records)
    seededRef.current = true
  }, [messagesQuery.data])

  const firstMessage = (location.state as { firstMessage?: string } | null)?.firstMessage
  useEffect(() => {
    if (!firstMessage || autoSentRef.current) return
    autoSentRef.current = true
    seededRef.current = true
    navigate(location.pathname, { replace: true, state: null })
    void send(firstMessage)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firstMessage])

  useEffect(() => {
    const el = scrollRef.current
    if (!el || userScrolledUpRef.current) return
    el.scrollTop = el.scrollHeight
  }, [messages, streaming])

  const kbNames = useMemo(
    () => (kbOptions.data ?? []).filter((kb) => conv?.kbIds.includes(kb.id)).map((kb) => kb.name),
    [kbOptions.data, conv?.kbIds],
  )
  const modelName = chatModels.data?.find((m) => m.id === conv?.chatModelId)?.name ?? conv?.chatModelName

  function patch(fn: (msg: LocalMessage) => LocalMessage) {
    const target = activeIdRef.current
    setMessages((list) => list.map((msg) => (msg.id === target ? fn(msg) : msg)))
  }

  async function send(content: string) {
    const text = content.trim()
    if (!text || streaming) return

    setErrorMsg(null)
    setUsage(null)
    setSteps([{ state: 'run', text: `混合检索${kbNames.length ? `「${kbNames.join('、')}」` : '知识库'}…` }])
    setStreaming(true)

    const now = new Date().toISOString()
    const userLocalId = -Date.now()
    const assistantLocalId = userLocalId - 1
    activeIdRef.current = assistantLocalId
    setMessages((m) => [
      ...m,
      { id: userLocalId, role: 'USER', content: text, createdAt: now },
      { id: assistantLocalId, role: 'ASSISTANT', content: '', createdAt: now, references: [] },
    ])

    const controller = new AbortController()
    abortRef.current = controller

    try {
      await streamChatMessage(
        convId,
        { content: text, kbIds: conv?.kbIds, stream: true },
        {
          signal: controller.signal,
          onEvent: (event, data) => {
            switch (event) {
              case 'meta': {
                const p = parseEventJson<{ messageId: number }>(data)
                if (p) patch((msg) => ({ ...msg, serverId: p.messageId }))
                break
              }
              case 'retrieval': {
                const p = parseEventJson<{ references: ChatReference[] }>(data)
                if (p) {
                  patch((msg) => ({ ...msg, references: p.references }))
                  setSteps([
                    { state: 'done', text: `混合检索命中 ${p.references.length} 条，重排后按分数取前 ${Math.min(p.references.length, 8)} 条` },
                  ])
                }
                break
              }
              case 'delta': {
                const p = parseEventJson<{ content: string }>(data)
                if (p) patch((msg) => ({ ...msg, content: msg.content + p.content }))
                break
              }
              case 'usage': {
                const p = parseEventJson<{ promptTokens: number; completionTokens: number; model: string }>(data)
                if (p) {
                  setUsage(p)
                  patch((msg) => ({
                    ...msg,
                    promptTokens: p.promptTokens,
                    completionTokens: p.completionTokens,
                    modelName: p.model,
                    elapsedMs: 2310,
                  }))
                }
                break
              }
              case 'done': {
                const p = parseEventJson<{ finishReason?: string }>(data)
                patch((msg) => ({ ...msg, finishReason: p?.finishReason ?? 'stop' }))
                break
              }
              case 'error': {
                const p = parseEventJson<{ code: number; message: string }>(data)
                setErrorMsg(p?.message ?? '生成失败')
                patch((msg) => ({ ...msg, errorMsg: p?.message ?? '生成失败' }))
                break
              }
            }
          },
        },
      )
    } catch (e) {
      if (isAbortError(e)) {
        patch((msg) => ({ ...msg, finishReason: 'abort' }))
      } else {
        const message = toApiError(e).message
        setErrorMsg(message)
        patch((msg) => ({ ...msg, errorMsg: message }))
      }
    } finally {
      setStreaming(false)
      setSteps([])
      abortRef.current = null
      activeIdRef.current = 0
      invalidateConversations()
    }
  }

  function stop() {
    abortRef.current?.abort()
    const last = messages[messages.length - 1]
    if (last?.serverId) void stopGeneration(convId, last.serverId).catch(() => undefined)
  }

  function regenerate() {
    const lastUser = [...messages].reverse().find((m) => m.role === 'USER')
    if (!lastUser) return
    setMessages((list) => {
      const idx = list.findIndex((m) => m.id === lastUser.id)
      return list.slice(0, idx + 1)
    })
    void send(lastUser.content)
  }

  const feedbackMut = useMutation({
    mutationFn: (vars: { id: number; value: 'UP' | 'DOWN' | null }) => sendFeedback(vars.id, vars.value),
    onSuccess: (_d, vars) =>
      setMessages((list) => list.map((m) => (m.id === vars.id ? { ...m, feedback: vars.value } : m))),
    onError: (e) => pushToast(toApiError(e).message),
  })

  const kbMut = useMutation({
    mutationFn: (kbIds: number[]) => updateConversation(convId, { kbIds }),
    onSuccess: (updated: Conversation) => pushToast(`已引用 ${updated.kbIds.length} 个知识库`),
    onError: (e) => pushToast(toApiError(e).message),
  })

  const modelMut = useMutation({
    mutationFn: (chatModelId: number) => updateConversation(convId, { chatModelId }),
    onError: (e) => pushToast(toApiError(e).message),
  })

  const deleteMut = useMutation({
    mutationFn: () => deleteConversation(convId),
    onSuccess: () => {
      pushToast('会话已删除')
      invalidateConversations()
      navigate('/chat')
    },
    onError: (e) => pushToast(toApiError(e).message),
  })

  const renameMut = useMutation({
    mutationFn: () => updateConversation(convId, { title: titleDraft.trim() }),
    onSuccess: () => { setRenaming(false); queryClient.invalidateQueries({ queryKey: ['conversation', convId] }); queryClient.invalidateQueries({ queryKey: ['conversations'] }) },
    onError: (e) => pushToast(toApiError(e).message),
  })

  if (convQuery.isLoading) return <LoadingBlock className="h-full" />
  if (convQuery.error || !conv) return <ErrorBlock className="h-full" message={toApiError(convQuery.error).message} />

  const lastAssistant = [...messages].reverse().find((m) => m.role === 'ASSISTANT' && m.finishReason)
  const referenceCount = lastAssistant?.references?.length ?? 0

  return (
    <div className="dot-bg flex h-full min-h-0 flex-col">
      <header className="flex h-12 flex-none items-center gap-2 border-b border-line bg-bar-bg px-5 backdrop-blur-[8px]">
        {renaming ? <form className="flex min-w-0 flex-1 gap-2" onSubmit={(e) => { e.preventDefault(); if (titleDraft.trim()) renameMut.mutate() }}>
          <input autoFocus maxLength={255} aria-label="会话名称" value={titleDraft} onChange={(e) => setTitleDraft(e.target.value)} />
          <button disabled={!titleDraft.trim() || renameMut.isPending}>保存</button>
          <button type="button" onClick={() => setRenaming(false)}>取消</button>
        </form> : <button className="min-w-0 flex-1 truncate text-left text-[15px] font-medium" title="点击重命名" onClick={() => { setTitleDraft(conv.title); setRenaming(true) }}>{conv.title} · 重命名</button>}
        <Tag tone="accent">RAG 问答</Tag>
        {referenceCount > 0 && <Tag tone="gray">引用 {referenceCount} 篇</Tag>}
        {modelName && <Tag tone="gray">{modelName}</Tag>}
        <div className="flex items-center gap-1">
          {/* 分享需要后端定义"只读分享链接"端点（doc/04 目前没有），
              在端点落地前先禁用并说明原因 —— 不留"点了没反应"的按钮 */}
          <Tooltip label="需后端提供会话分享端点">
            <Button variant="ghost" size="sm" disabled aria-label="分享（暂不可用）">
              <Share2 />
              分享
            </Button>
          </Tooltip>
          <Tooltip label="删除会话" side="bottom">
            <Button
              variant="ghost"
              size="icon-sm"
              className="hover:text-danger"
              aria-label="删除会话"
              onClick={() => setDeleteOpen(true)}
            >
              <Trash2 />
            </Button>
          </Tooltip>
        </div>
      </header>

      <div className="relative min-h-0 flex-1">
        <div
          ref={scrollRef}
          onScroll={(e) => {
            const el = e.currentTarget
            userScrolledUpRef.current = el.scrollHeight - el.scrollTop - el.clientHeight > 120
          }}
          className="h-full overflow-y-auto"
        >
          <div className="mx-auto max-w-[820px] px-5 pt-6 pb-9">
          {messages.length === 0 && !streaming && (
            <div className="py-16 text-center text-[14px] text-ink-3">发送第一条消息开始对话</div>
          )}

          {messages.map((msg) =>
            msg.role === 'USER' ? (
              <div key={msg.id} className="mb-6 flex justify-end">
                <div className="max-w-[80%] rounded-xl rounded-br-sm bg-accent px-3.5 py-2.5 text-[15px] leading-relaxed text-on-accent">
                  {msg.content}
                </div>
              </div>
            ) : (
              <div key={msg.id} className="mb-6 flex gap-3">
                <div className="mt-0.5 grid size-[26px] flex-none place-items-center rounded-full bg-accent text-[11px] font-semibold text-on-accent">
                  AI
                </div>
                <div className="min-w-0 flex-1">
                  {streaming && steps.length > 0 && msg.id === messages[messages.length - 1]?.id && (
                    <StepList steps={steps} className="mb-3" />
                  )}
                  {!streaming && msg.references && msg.references.length > 0 && (
                    <StepList
                      className="mb-3"
                      steps={[
                        {
                          state: 'done',
                          text: `引用「${kbNames.join('、') || '知识库'}」命中证据 ${msg.references.length} 条`,
                        },
                      ]}
                    />
                  )}

                  {msg.content ? (
                    <RichText
                      content={msg.content}
                      onCite={(i) =>
                        setOpenRef(msg.references?.find((r) => r.index === i) ?? msg.references?.[0] ?? null)
                      }
                    />
                  ) : (
                    <span className="inline-block h-4 w-2 animate-pulse rounded-sm bg-accent/60 align-middle" />
                  )}

                  {msg.references && msg.references.length > 0 && (
                    <ReferenceList
                      className="mt-3"
                      references={msg.references}
                      onOpen={(ref) => setOpenRef(ref as ChatReference)}
                    />
                  )}

                  {msg.errorMsg && (
                    <Alert tone="error" className="mt-3">
                      {msg.errorMsg}
                    </Alert>
                  )}

                  {(msg.content || msg.errorMsg) && (
                    <div className="mt-3 flex flex-wrap items-center gap-1 text-[13px] text-ink-4">
                      <span className="mr-1">
                        {msg.modelName ?? 'gpt-4o-mini'}
                        {msg.promptTokens
                          ? ` · ${(msg.promptTokens + (msg.completionTokens ?? 0)).toLocaleString()} tokens`
                          : ''}
                        {msg.elapsedMs ? ` · ${formatMs(msg.elapsedMs)}` : ''}
                        {msg.finishReason === 'abort' ? ' · 已停止' : ''}
                      </span>
                      <button
                        type="button"
                        className={actionBtn}
                        onClick={() => {
                          navigator.clipboard?.writeText(msg.content).catch(() => undefined)
                          pushToast('已复制')
                        }}
                      >
                        <Copy className="size-3" />
                        复制
                      </button>
                      <button type="button" className={actionBtn} onClick={regenerate} disabled={streaming}>
                        <RefreshCw className="size-3" />
                        重新生成
                      </button>
                      <button
                        type="button"
                        className={cn(actionBtn, msg.feedback === 'UP' && 'text-ok')}
                        onClick={() =>
                          msg.serverId &&
                          feedbackMut.mutate({ id: msg.serverId, value: msg.feedback === 'UP' ? null : 'UP' })
                        }
                      >
                        <ThumbsUp className="size-3" />
                      </button>
                      <button
                        type="button"
                        className={cn(actionBtn, msg.feedback === 'DOWN' && 'text-danger')}
                        onClick={() =>
                          msg.serverId &&
                          feedbackMut.mutate({ id: msg.serverId, value: msg.feedback === 'DOWN' ? null : 'DOWN' })
                        }
                      >
                        <ThumbsDown className="size-3" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ),
          )}

          {usage && (
            <p className="mt-3 text-center text-[12.5px] text-ink-4">
              本次用量：输入 {usage.promptTokens} · 输出 {usage.completionTokens} tokens · {usage.model}
            </p>
          )}
          {errorMsg && <Alert tone="error" className="mt-3">{errorMsg}</Alert>}
          </div>
        </div>
        {/* 底部渐隐：替代原先那条通栏分割线 —— 消息滚到输入区上方时自然淡出，
            而不是被硬裁一刀。pointer-events-none 保证不挡滚动手势与点击 */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-7 bg-gradient-to-t from-bg to-transparent" />
      </div>

      <div className="flex-none px-5 pt-1 pb-3">
        <Composer
          className="max-w-[820px]"
          value={draft}
          onChange={setDraft}
          onSend={() => {
            const text = draft.trim()
            if (!text) return
            setDraft('')
            void send(text)
          }}
          onStop={stop}
          streaming={streaming}
          placeholder="继续提问…"
          leftSlot={
            <>
              <ChipSelect
                icon={<MODE_META.rag.Icon className="size-[14px]" />}
                label={MODE_META.rag.label}
                menuWidth="min-w-[260px]"
              >
                {(close) => (
                  <>
                    <ChipOptionRich
                      icon={<MODE_META.rag.Icon className="size-4" />}
                      title={MODE_META.rag.label}
                      desc={MODE_META.rag.shortDesc}
                      active
                      onClick={close}
                    />
                    <ChipOptionRich
                      icon={<MODE_META.sql.Icon className="size-4" />}
                      title={MODE_META.sql.label}
                      desc="自然语言转 SQL（将新建会话）"
                      tone="info"
                      onClick={() => navigate('/chat')}
                    />
                  </>
                )}
              </ChipSelect>

              <ChipSelect
                icon={<Library className="size-[14px]" />}
                label={kbNames.length ? kbNames.join('、') : '不引用知识库'}
                menuWidth="min-w-[280px]"
              >
                {(close) => (
                  <>
                    {(kbOptions.data ?? []).map((kb) => {
                      const checked = conv.kbIds.includes(kb.id)
                      return (
                        <ChipOption
                          key={kb.id}
                          active={checked}
                          onClick={() =>
                            kbMut.mutate(checked ? conv.kbIds.filter((x) => x !== kb.id) : [...conv.kbIds, kb.id])
                          }
                        >
                          {kb.name}
                        </ChipOption>
                      )
                    })}
                    <button
                      type="button"
                      onClick={close}
                      className="mt-1 w-full cursor-pointer border-0 border-t border-line bg-transparent px-3 py-2 text-center text-[13px] text-ink-3 hover:text-ink"
                    >
                      完成
                    </button>
                  </>
                )}
              </ChipSelect>

              <ChipSelect icon={<BookMarked className="size-[14px]" />} label={modelName ?? '默认模型'} menuWidth="min-w-[220px]">
                {(close) =>
                  (chatModels.data ?? []).map((m) => (
                    <ChipOption
                      key={m.id}
                      active={m.id === conv.chatModelId}
                      onClick={() => {
                        modelMut.mutate(m.id)
                        close()
                      }}
                    >
                      {m.name}
                      {m.isDefault ? '（默认）' : ''}
                    </ChipOption>
                  ))
                }
              </ChipSelect>
            </>
          }
          footer={<p className="mt-2 text-center text-[12px] text-ink-4">内容由 AI 生成，请核对引用来源后再采纳</p>}
        />
      </div>

      <Modal open={!!openRef} onClose={() => setOpenRef(null)} title={`引用来源 #${openRef?.index ?? ''}`} width="max-w-[560px]">
        {openRef && (
          <div>
            <p className="text-[14px] font-medium text-ink">{openRef.documentName}</p>
            <p className="mt-1 text-[13px] text-ink-3">相似度 {openRef.score.toFixed(4)}</p>
            <div className="mt-3 rounded-lg border border-line bg-bg-section p-3 text-[14px] leading-relaxed text-ink-2">
              {openRef.snippet}
            </div>
            <button
              type="button"
              className="mt-3 inline-flex cursor-pointer items-center gap-1 border-0 bg-transparent text-[13.5px] text-accent"
              onClick={() => navigate(`/kb/${openRef.kbId}`)}
            >
              在知识库中查看
              <ArrowRight className="size-3" />
            </button>
          </div>
        )}
      </Modal>

      <ConfirmModal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={() => deleteMut.mutate()}
        title="删除会话"
        description={<>确定删除该会话吗？消息与引用关系将一并删除。</>}
        confirmText="删除"
        danger
        loading={deleteMut.isPending}
      />
    </div>
  )
}

const actionBtn =
  'inline-flex cursor-pointer items-center gap-1 rounded-md border-0 bg-transparent px-1.5 py-0.5 text-[13px] text-ink-4 transition-colors hover:bg-bg-hover hover:text-ink disabled:pointer-events-none disabled:opacity-50'
