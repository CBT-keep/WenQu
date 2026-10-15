import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import {
  BookMarked,
  Download,
  FileSearch,
  Play,
  Server,
  Trash2,
} from 'lucide-react'
import { Composer } from '@/components/chat/composer'
import { ChipSelect, ChipOption, ChipOptionRich } from '@/components/chat/chip-select'
import { SqlBlock } from '@/components/chat/sql-block'
import { StepList, type StepItem } from '@/components/chat/step-list'
import { ResultView } from '@/components/chat/result-view'
import { EChart } from '@/components/ui/lazy-chart'
import { Tag } from '@/components/ui/tag'
import { Button } from '@/components/ui/button'
import { Tooltip } from '@/components/ui/tooltip'
import { Alert, ErrorBlock, LoadingBlock } from '@/components/ui/feedback'
import { ConfirmModal, Modal } from '@/components/ui/modal'
import {
  deleteSqlConversation,
  executeSql,
  explainSql,
  exportSql,
  fetchSqlConversation,
  fetchSqlMessages,
  streamNl2Sql,
} from '@/api/sqlbot'
import { toApiError } from '@/lib/http'
import { MODE_META } from '@/lib/mode'
import { isAbortError, parseEventJson } from '@/lib/sse'
import { useInvalidateConversations } from '@/hooks/use-conversations'
import { useToastStore } from '@/stores/toast'
import type { SqlExecuteResult, SqlMessage, SqlSseResult } from '@/types'
import { btnGhost } from '@/lib/styles'
import { cn } from '@/lib/utils'

/** 本地暂存的查询结果行（历史消息接口不返回 rows，只有实时流里才有） */
interface LiveResult {
  columns: SqlExecuteResult['columns']
  rows: unknown[][]
  truncated: boolean
}

/** 乐观消息保留稳定的本地 id，服务端 id 存在 serverId 上 */
type LocalSqlMessage = SqlMessage & { serverId?: number }

export default function SqlConversationPage() {
  const { id } = useParams()
  const convId = Number(id)
  const location = useLocation()
  const navigate = useNavigate()
  const pushToast = useToastStore((s) => s.push)
  const invalidateConversations = useInvalidateConversations()

  const [messages, setMessages] = useState<LocalSqlMessage[]>([])
  const [liveResults, setLiveResults] = useState<Record<number, LiveResult>>({})
  const [draft, setDraft] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [steps, setSteps] = useState<StepItem[]>([])
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [editing, setEditing] = useState<SqlMessage | null>(null)
  const [plan, setPlan] = useState<string[] | null>(null)

  const abortRef = useRef<AbortController | null>(null)
  const activeIdRef = useRef(0)
  const seededRef = useRef(false)
  const autoSentRef = useRef(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  const convQuery = useQuery({ queryKey: ['sql-conversation', convId], queryFn: () => fetchSqlConversation(convId) })
  const messagesQuery = useQuery({
    queryKey: ['sql-messages', convId],
    queryFn: () => fetchSqlMessages(convId, 1, 100),
  })

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
    if (el) el.scrollTop = el.scrollHeight
  }, [messages, streaming])

  const lastAssistant = useMemo(
    () => [...messages].reverse().find((m) => m.role === 'ASSISTANT' && m.generatedSql),
    [messages],
  )

  async function send(content: string) {
    const text = content.trim()
    if (!text || streaming) return
    setErrorMsg(null)
    setSteps([{ state: 'run', text: '正在理解问题、匹配 Schema 与指标口径…' }])
    setStreaming(true)

    const now = new Date().toISOString()
    const userLocalId = -Date.now()
    const assistantLocalId = userLocalId - 1
    activeIdRef.current = assistantLocalId
    setMessages((m) => [
      ...m,
      { id: userLocalId, role: 'USER', content: text, createdAt: now },
      { id: assistantLocalId, role: 'ASSISTANT', content: '', createdAt: now },
    ])

    const controller = new AbortController()
    abortRef.current = controller
    const patch = (fn: (msg: LocalSqlMessage) => LocalSqlMessage) => {
      const target = activeIdRef.current
      setMessages((list) => list.map((msg) => (msg.id === target ? fn(msg) : msg)))
    }

    try {
      await streamNl2Sql(
        convId,
        { content: text, execute: true },
        {
          signal: controller.signal,
          onEvent: (event, data) => {
            switch (event) {
              case 'meta': {
                const p = parseEventJson<{ messageId: number }>(data)
                if (p) patch((msg) => ({ ...msg, serverId: p.messageId }))
                break
              }
              case 'reasoning': {
                const p = parseEventJson<{ content: string }>(data)
                if (p) {
                  setSteps((prev) => [...prev.map((s) => ({ ...s, state: 'done' as const })), { state: 'run', text: p.content }])
                }
                break
              }
              case 'sql': {
                const p = parseEventJson<{ sql: string; explanation?: string }>(data)
                if (p) {
                  patch((msg) => ({ ...msg, generatedSql: p.sql, sqlExplanation: p.explanation, sqlStatus: 'VALIDATED' }))
                  setSteps((prev) => [
                    ...prev.map((s) => ({ ...s, state: 'done' as const })),
                    { state: 'run', text: '安全校验通过（只读）· 执行中…' },
                  ])
                }
                break
              }
              case 'result': {
                const p = parseEventJson<SqlSseResult>(data)
                if (p) {
                  setLiveResults((r) => ({
                    ...r,
                    [activeIdRef.current]: { columns: p.columns, rows: p.rows, truncated: p.truncated },
                  }))
                  patch((msg) => ({
                    ...msg,
                    sqlStatus: 'EXECUTED',
                    content: msg.content || `查询完成，共 ${p.rowCount} 行。`,
                    resultMeta: { columns: p.columns, rowCount: p.rowCount, elapsedMs: p.elapsedMs, truncated: p.truncated },
                  }))
                  setSteps((prev) => prev.map((s) => ({ ...s, state: 'done' as const })))
                }
                break
              }
              case 'chart': {
                const p = parseEventJson<{ type: SqlMessage['chartType']; option: Record<string, unknown> }>(data)
                if (p) patch((msg) => ({ ...msg, chartType: p.type, chartOption: p.option }))
                break
              }
              case 'error': {
                const p = parseEventJson<{ code: number; message: string }>(data)
                setErrorMsg(p?.message ?? '查询失败')
                patch((msg) => ({ ...msg, errorMsg: p?.message, sqlStatus: 'FAILED' }))
                break
              }
            }
          },
        },
      )
    } catch (e) {
      if (!isAbortError(e)) {
        const message = toApiError(e).message
        setErrorMsg(message)
        patch((msg) => ({ ...msg, errorMsg: message, sqlStatus: 'FAILED' }))
      }
    } finally {
      setStreaming(false)
      setSteps([])
      abortRef.current = null
      activeIdRef.current = 0
      invalidateConversations()
    }
  }

  const deleteMut = useMutation({
    mutationFn: () => deleteSqlConversation(convId),
    onSuccess: () => {
      pushToast('会话已删除')
      invalidateConversations()
      navigate('/chat')
    },
    onError: (e) => pushToast(toApiError(e).message),
  })

  async function explain(sql: string) {
    if (!conv) return
    try {
      const res = await explainSql({ datasourceId: conv.datasourceId, sql })
      setPlan(res.plan)
    } catch (e) {
      pushToast(toApiError(e).message)
    }
  }

  function exportResult(format: 'CSV' | 'XLSX') {
    if (!conv || !lastAssistant?.generatedSql) {
      pushToast('暂无可导出的查询')
      return
    }
    exportSql({ datasourceId: conv.datasourceId, sql: lastAssistant.generatedSql, format })
      .then((name) => pushToast(`已导出 ${name}`))
      .catch((e) => pushToast(toApiError(e).message))
  }

  if (convQuery.isLoading) return <LoadingBlock className="h-full" />
  if (convQuery.error || !conv) return <ErrorBlock className="h-full" message={toApiError(convQuery.error).message} />

  return (
    <div className="dot-bg flex h-full min-h-0 flex-col">
      <header className="flex h-12 flex-none items-center gap-2 border-b border-line bg-bar-bg px-5 backdrop-blur-[8px]">
        <span className="min-w-0 flex-1 truncate text-[15px] font-medium">{conv.title}</span>
        <Tag tone="green">SQLBot</Tag>
        {conv.datasourceName && <Tag tone="gray">{conv.datasourceName}</Tag>}
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={() => exportResult('CSV')}>
            <Download />
            CSV
          </Button>
          <Button variant="ghost" size="sm" onClick={() => exportResult('XLSX')}>
            <Download />
            Excel
          </Button>
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
        <div ref={scrollRef} className="h-full overflow-y-auto">
          <div className="mx-auto max-w-[900px] px-5 pt-6 pb-9">
          {messages.length === 0 && !streaming && (
            <div className="py-16 text-center text-[14px] text-ink-3">
              用自然语言描述你想查的数据，例如「上个月华东区订单量环比」
            </div>
          )}

          {messages.map((msg) =>
            msg.role === 'USER' ? (
              <div key={msg.id} className="mb-6 flex justify-end">
                <div className="max-w-[80%] rounded-xl rounded-br-sm bg-info px-3.5 py-2.5 text-[15px] leading-relaxed text-white">
                  {msg.content}
                </div>
              </div>
            ) : (
              <div key={msg.id} className="mb-6 flex gap-3">
                <div className="mt-0.5 grid size-[26px] flex-none place-items-center rounded-full bg-info text-[11px] font-semibold text-white">
                  SQL
                </div>
                <div className="min-w-0 flex-1 space-y-3">
                  {streaming && steps.length > 0 && msg.id === messages[messages.length - 1]?.id && (
                    <StepList steps={steps} />
                  )}

                  {msg.content && <p className="text-[15px] leading-relaxed text-ink-2">{msg.content}</p>}

                  {msg.generatedSql && (
                    <SqlBlock
                      sql={msg.generatedSql}
                      title={`生成的 SQL · ${conv.datasourceName ?? ''}`}
                      onEdit={() => setEditing(msg)}
                      onExplain={() => explain(msg.generatedSql!)}
                    />
                  )}

                  {msg.sqlExplanation && <p className="text-[13.5px] text-ink-3">口径说明：{msg.sqlExplanation}</p>}

                  <SqlResult message={msg} live={liveResults[msg.id]} />

                  {msg.errorMsg && <Alert tone="error">{msg.errorMsg}</Alert>}

                  {msg.generatedSql && (
                    <div className="flex flex-wrap items-center gap-1 text-[13px] text-ink-4">
                      <span className="mr-1">
                        {msg.sqlStatus === 'EXECUTED' ? '已执行' : msg.sqlStatus === 'SUGGESTED' ? '待执行' : ''}
                        {msg.elapsedMs ? ` · ${(msg.elapsedMs / 1000).toFixed(1)}s` : ''}
                      </span>
                      <button
                        type="button"
                        className={actionBtn}
                        onClick={() => {
                          navigator.clipboard?.writeText(msg.generatedSql!).catch(() => undefined)
                          pushToast('已复制 SQL')
                        }}
                      >
                        复制 SQL
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ),
          )}

          {errorMsg && <Alert tone="error" className="mt-3">{errorMsg}</Alert>}
          </div>
        </div>
        {/* 底部渐隐：替代通栏分割线，消息滚到输入区上方时自然淡出 */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-7 bg-gradient-to-t from-bg to-transparent" />
      </div>

      <div className="flex-none px-5 pt-1 pb-3">
        <div className="mx-auto mb-2 flex max-w-[900px] flex-wrap items-center gap-2 text-[13px] text-ink-3">
          {conv.datasourceName && <Tag tone="green">数据源 {conv.datasourceName}</Tag>}
          {conv.kbName && <Tag tone="amber">口径库 {conv.kbName}</Tag>}
          <span className="inline-flex items-center gap-1">
            <FileSearch className="size-3" />
            只读 · 自动 LIMIT · 超时熔断
          </span>
        </div>
        <Composer
          className="max-w-[900px]"
          value={draft}
          onChange={setDraft}
          onSend={() => {
            const text = draft.trim()
            if (!text) return
            setDraft('')
            void send(text)
          }}
          onStop={() => abortRef.current?.abort()}
          streaming={streaming}
          placeholder="用自然语言描述你想查询的数据，例如「上个月华东区订单量环比」"
          leftSlot={
            <>
              <ChipSelect
                icon={<MODE_META.sql.Icon className="size-[14px]" />}
                label={MODE_META.sql.label}
                tone="info"
                menuWidth="min-w-[260px]"
              >
                {(close) => (
                  <>
                    <ChipOptionRich
                      icon={<MODE_META.rag.Icon className="size-4" />}
                      title={MODE_META.rag.label}
                      desc="检索知识库并生成带引用的回答（将新建会话）"
                      onClick={() => navigate('/chat')}
                    />
                    <ChipOptionRich
                      icon={<MODE_META.sql.Icon className="size-4" />}
                      title={MODE_META.sql.label}
                      desc={MODE_META.sql.shortDesc}
                      active
                      tone="info"
                      onClick={close}
                    />
                  </>
                )}
              </ChipSelect>
              <ChipSelect
                icon={<Server className="size-[14px]" />}
                label={conv.datasourceName ?? '数据源'}
                tone="info"
                disabled
              >
                {() => <ChipOption active onClick={() => undefined}>{conv.datasourceName}</ChipOption>}
              </ChipSelect>
              {conv.kbName && (
                <ChipSelect icon={<BookMarked className="size-[14px]" />} label={conv.kbName} tone="info" disabled>
                  {() => <ChipOption active onClick={() => undefined}>{conv.kbName}</ChipOption>}
                </ChipSelect>
              )}
            </>
          }
        />
      </div>

      {editing && (
        <ManualExecuteModal
          datasourceId={conv.datasourceId}
          message={editing}
          onClose={() => setEditing(null)}
          onExecuted={(result) => {
            setLiveResults((r) => ({ ...r, [editing.id]: { columns: result.columns, rows: result.rows, truncated: result.truncated } }))
            setMessages((list) =>
              list.map((m) =>
                m.id === editing.id
                  ? {
                      ...m,
                      sqlStatus: 'EXECUTED',
                      resultMeta: { columns: result.columns, rowCount: result.rowCount, elapsedMs: result.elapsedMs, truncated: result.truncated },
                      chartType: result.chartType ?? m.chartType,
                      chartOption: result.chartOption ?? m.chartOption,
                    }
                  : m,
              ),
            )
          }}
        />
      )}

      <Modal open={!!plan} onClose={() => setPlan(null)} title="执行计划（EXPLAIN）" width="max-w-[640px]">
        <pre className="overflow-x-auto rounded-md bg-bg-section p-3 font-mono text-[13px] leading-relaxed whitespace-pre text-ink-2">
          {plan?.join('\n')}
        </pre>
      </Modal>

      <ConfirmModal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={() => deleteMut.mutate()}
        title="删除会话"
        description={<>确定删除该查询会话吗？消息将一并删除。</>}
        confirmText="删除"
        danger
        loading={deleteMut.isPending}
      />
    </div>
  )
}

/** 结果卡：有本地行数据时渲染表格/图表；仅有历史 resultMeta 时渲染图表或提示 */
function SqlResult({ message, live }: { message: SqlMessage; live?: LiveResult }) {
  if (live) {
    return (
      <ResultView
        columns={live.columns}
        rows={live.rows}
        chartType={message.chartType}
        chartOption={message.chartOption}
        elapsedMs={message.resultMeta?.elapsedMs}
        truncated={live.truncated}
      />
    )
  }
  if (!message.resultMeta) return null
  const meta = message.resultMeta
  const hasChart = message.chartOption && Object.keys(message.chartOption).length > 0
  return (
    <div className="overflow-hidden rounded-xl border border-line bg-bg-card">
      <div className="flex flex-wrap items-center gap-2 border-b border-line px-3 py-2.5">
        <span className="text-[14px] font-medium text-ink">查询结果</span>
        <Tag tone="green">{meta.rowCount} 行</Tag>
        <span className="text-[12.5px] text-ink-4">执行 {meta.elapsedMs}ms · 历史结果仅保留图表</span>
      </div>
      {hasChart ? (
        <div className="p-3">
          <EChart option={message.chartOption as Record<string, unknown>} height={260} />
        </div>
      ) : (
        <div className="px-3 py-6 text-center text-[13.5px] text-ink-3">该历史查询无可用图表</div>
      )}
    </div>
  )
}

function ManualExecuteModal({
  datasourceId,
  message,
  onClose,
  onExecuted,
}: {
  datasourceId: number
  message: SqlMessage
  onClose: () => void
  onExecuted: (result: SqlExecuteResult) => void
}) {
  const pushToast = useToastStore((s) => s.push)
  const [sql, setSql] = useState(message.generatedSql ?? '')
  const [result, setResult] = useState<SqlExecuteResult | null>(null)

  const execMut = useMutation({
    mutationFn: () => executeSql({ datasourceId, sql, messageId: message.id }),
    onSuccess: (res) => {
      setResult(res)
      onExecuted(res)
      pushToast(`执行成功 · ${res.rowCount} 行`)
    },
    onError: (e) => pushToast(toApiError(e).message),
  })

  return (
    <Modal
      open
      onClose={onClose}
      title="手工执行 SQL"
      width="max-w-[760px]"
      footer={
        <>
          <button type="button" className={btnGhost} onClick={onClose}>
            关闭
          </button>
          <Button variant="outline" onClick={() => execMut.mutate()} disabled={execMut.isPending}>
            <Play />
            {execMut.isPending ? '执行中…' : '执行'}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <Alert tone="info">仍需通过安全校验：仅 SELECT / WITH / EXPLAIN，单语句，超限自动截断。</Alert>
        <textarea
          value={sql}
          onChange={(e) => setSql(e.target.value)}
          rows={8}
          spellCheck={false}
          className={cn(
            'w-full resize-y rounded-md border border-line-strong bg-[#0f1419] px-3 py-2 font-mono text-[13.5px] leading-relaxed text-[#c9d1d9] outline-none focus:border-accent',
          )}
        />
        {result && (
          <ResultView
            columns={result.columns}
            rows={result.rows}
            chartType={result.chartType}
            chartOption={result.chartOption}
            elapsedMs={result.elapsedMs}
            truncated={result.truncated}
          />
        )}
      </div>
    </Modal>
  )
}

const actionBtn =
  'inline-flex cursor-pointer items-center gap-1 rounded-md border-0 bg-transparent px-1.5 py-0.5 text-[13px] text-ink-4 transition-colors hover:bg-bg-hover hover:text-ink'
