import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import {
  ArrowRight,
  BookMarked,
  Check,
  HelpCircle,
  Library,
  Server,
  Sparkles,
} from 'lucide-react'
import { Composer } from '@/components/chat/composer'
import { ChipSelect, ChipOption, ChipOptionRich } from '@/components/chat/chip-select'
import { ParticleTitle } from '@/components/particle-title'
import { Stagger } from '@/components/stagger'
import { createConversation } from '@/api/chat'
import { fetchKbOptions } from '@/api/kb'
import { fetchModelOptions } from '@/api/model'
import { createSqlConversation, fetchDatasources } from '@/api/sqlbot'
import { toApiError } from '@/lib/http'
import { MODE_META, MODE_ORDER, type ChatMode } from '@/lib/mode'
import { useInvalidateConversations } from '@/hooks/use-conversations'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'
import { cn } from '@/lib/utils'

const RECOMMENDED: Record<ChatMode, string[]> = {
  rag: ['如何重置管理员密码？', '报销流程是怎么走的？需要哪些材料？', 'v3.2 相比 v3.1 有哪些变更？'],
  sql: ['查一下 9 月份各区域的销售额排名，前 5 名', '华东区订单量环比', '哪些客户超过 90 天未下单'],
}

export default function ChatWelcomePage() {
  const navigate = useNavigate()
  const pushToast = useToastStore((s) => s.push)
  const invalidateConversations = useInvalidateConversations()
  const user = useAuthStore((s) => s.user)

  const [mode, setMode] = useState<ChatMode>('rag')
  const [draft, setDraft] = useState('')
  const [kbIds, setKbIds] = useState<number[]>([])
  const [chatModelId, setChatModelId] = useState<number | undefined>()
  const [datasourceId, setDatasourceId] = useState<number | undefined>()
  const [metricKbId, setMetricKbId] = useState<number | undefined>()

  const kbOptions = useQuery({ queryKey: ['kb-options'], queryFn: fetchKbOptions })
  const chatModels = useQuery({ queryKey: ['model-options', 'CHAT'], queryFn: () => fetchModelOptions('CHAT') })
  const datasources = useQuery({
    queryKey: ['datasources', { page: 1, size: 50 }],
    queryFn: () => fetchDatasources({ page: 1, size: 50 }),
  })

  // 默认选中：第一个可用知识库 / 默认 Chat 模型 / 第一个数据源
  useEffect(() => {
    if (kbIds.length === 0 && kbOptions.data?.length) setKbIds([kbOptions.data[0].id])
  }, [kbOptions.data, kbIds.length])
  useEffect(() => {
    if (!chatModelId && chatModels.data?.length) {
      setChatModelId((chatModels.data.find((m) => m.isDefault) ?? chatModels.data[0]).id)
    }
  }, [chatModels.data, chatModelId])
  useEffect(() => {
    if (!datasourceId && datasources.data?.records.length) setDatasourceId(datasources.data.records[0].id)
  }, [datasources.data, datasourceId])

  const chosenKbs = useMemo(
    () => (kbOptions.data ?? []).filter((kb) => kbIds.includes(kb.id)),
    [kbOptions.data, kbIds],
  )
  const chosenDatasource = datasources.data?.records.find((d) => d.id === datasourceId)
  const chosenModel = chatModels.data?.find((m) => m.id === chatModelId)
  const metricKb = kbOptions.data?.find((kb) => kb.id === metricKbId)

  const createRagMut = useMutation({
    mutationFn: (content: string) =>
      createConversation({
        title: content.slice(0, 20),
        kbIds,
        chatModelId,
      }),
    onSuccess: (conv, content) => {
      invalidateConversations()
      navigate(`/chat/rag/${conv.id}`, { state: { firstMessage: content } })
    },
    onError: (e) => pushToast(toApiError(e).message),
  })

  const createSqlMut = useMutation({
    mutationFn: (content: string) =>
      createSqlConversation({ datasourceId: datasourceId!, kbId: metricKbId, title: content.slice(0, 20) }),
    onSuccess: (conv, content) => {
      invalidateConversations()
      navigate(`/chat/sql/${conv.id}`, { state: { firstMessage: content } })
    },
    onError: (e) => pushToast(toApiError(e).message),
  })

  const sending = createRagMut.isPending || createSqlMut.isPending

  function send() {
    const content = draft.trim()
    if (!content || sending) return
    if (mode === 'rag') {
      createRagMut.mutate(content)
    } else {
      if (!datasourceId) {
        pushToast('请先选择数据源；如无可用数据源，请到「数据源」页添加')
        return
      }
      createSqlMut.mutate(content)
    }
  }

  const displayName = user?.nickname ?? user?.username
  const ModeIcon = MODE_META[mode].Icon

  return (
    <div className="dot-bg flex h-full min-h-0 flex-col">
      <header className="flex h-12 flex-none items-center gap-2 border-b border-line bg-bar-bg px-5 backdrop-blur-[8px]">
        <span className="text-[15px] font-medium">新对话</span>
        <span
          className={cn(
            'rounded-sm px-1.5 py-0.5 text-[12px] font-medium',
            mode === 'rag' ? 'bg-accent-tint text-accent-deep' : 'bg-info-bg text-info',
          )}
        >
          {MODE_META[mode].label}
        </span>
      </header>

      <div className="flex flex-1 flex-col items-center justify-center overflow-y-auto px-6 py-8">
        <div className="w-full max-w-[760px]">
          <Stagger className="text-center">
            {/* 品牌粒子标题：原型同款，光标扫过时粒子让路（实现见 ParticleTitle） */}
            <ParticleTitle className="h-[132px] md:h-[200px]" />
            <h1 className="mt-6 text-[25px] font-medium tracking-[0.01em]">
              {displayName ? `${displayName}，` : ''}今天想了解点什么？
            </h1>
          </Stagger>

          <Stagger delay={70} className="mt-8 grid grid-cols-1 gap-3 md:grid-cols-2">
            {MODE_ORDER.map((m) => {
              const { Icon, cardTitle, cardDesc, tone } = MODE_META[m]
              return (
                <ModeCard
                  key={m}
                  icon={<Icon className="size-4" />}
                  title={cardTitle}
                  desc={cardDesc}
                  tone={tone}
                  active={mode === m}
                  onClick={() => setMode(m)}
                />
              )
            })}
          </Stagger>

          {mode === 'rag' && metricKb === undefined && chosenModel === undefined && null}

          <Stagger delay={140} className="mt-7">
            <p className="mb-2.5 text-[13px] font-medium text-ink-3">推荐问题</p>
            <div className="space-y-2">
              {RECOMMENDED[mode].map((q) => (
                <button key={q} type="button" className={questionCard} onClick={() => setDraft(q)}>
                  <HelpCircle className="size-4 flex-none text-ink-4" />
                  <span className="truncate text-[14.5px]">{q}</span>
                  <ArrowRight className="ml-auto size-[15px] flex-none text-ink-4" />
                </button>
              ))}
            </div>
          </Stagger>
        </div>
      </div>

      <Stagger delay={210} className="flex-none px-5 pb-4">
        <Composer
          className="max-w-[760px]"
          value={draft}
          onChange={setDraft}
          onSend={send}
          disabled={sending}
          placeholder={
            mode === 'rag'
              ? '给 WenQu 发送消息…（Enter 发送，Shift+Enter 换行）'
              : '用自然语言描述你想查询的数据，例如「上个月华东区订单量环比」'
          }
          leftSlot={
            <>
              {/* 模式切换 */}
              <ChipSelect
                icon={<ModeIcon className="size-[14px]" />}
                label={MODE_META[mode].label}
                tone={MODE_META[mode].tone}
                menuWidth="min-w-[260px]"
              >
                {(close) =>
                  MODE_ORDER.map((m) => {
                    const { Icon, label, shortDesc, tone } = MODE_META[m]
                    return (
                      <ChipOptionRich
                        key={m}
                        icon={<Icon className="size-4" />}
                        title={label}
                        desc={shortDesc}
                        tone={tone}
                        active={mode === m}
                        onClick={() => {
                          setMode(m)
                          close()
                        }}
                      />
                    )
                  })
                }
              </ChipSelect>

              {mode === 'rag' ? (
                <>
                  <ChipSelect
                    icon={<Library className="size-[14px]" />}
                    label={chosenKbs.length ? chosenKbs.map((k) => k.name).join('、') : '不引用知识库'}
                    menuWidth="min-w-[280px]"
                  >
                    {(close) => (
                      <>
                        {(kbOptions.data ?? []).map((kb) => {
                          const checked = kbIds.includes(kb.id)
                          return (
                            <ChipOption
                              key={kb.id}
                              active={checked}
                              onClick={() =>
                                setKbIds((prev) =>
                                  prev.includes(kb.id) ? prev.filter((x) => x !== kb.id) : [...prev, kb.id],
                                )
                              }
                            >
                              + {kb.name}
                            </ChipOption>
                          )
                        })}
                        {(kbOptions.data?.length ?? 0) === 0 && (
                          <p className="px-3 py-2 text-[13px] text-ink-3">暂无可用知识库</p>
                        )}
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
                  <ChipSelect
                    icon={<Sparkles className="size-[14px]" />}
                    label={chosenModel?.name ?? '默认模型'}
                    menuWidth="min-w-[220px]"
                  >
                    {(close) =>
                      (chatModels.data ?? []).map((m) => (
                        <ChipOption
                          key={m.id}
                          active={m.id === chatModelId}
                          onClick={() => {
                            setChatModelId(m.id)
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
              ) : (
                <>
                  <ChipSelect
                    icon={<Server className="size-[14px]" />}
                    label={chosenDatasource?.name ?? '选择数据源'}
                    tone="info"
                    menuWidth="min-w-[260px]"
                  >
                    {(close) =>
                      (datasources.data?.records ?? []).map((d) => (
                        <ChipOption
                          key={d.id}
                          active={d.id === datasourceId}
                          onClick={() => {
                            setDatasourceId(d.id)
                            close()
                          }}
                        >
                          {d.name}
                        </ChipOption>
                      ))
                    }
                  </ChipSelect>
                  <ChipSelect
                    icon={<BookMarked className="size-[14px]" />}
                    label={metricKb ? metricKb.name : '口径库（可选）'}
                    tone="info"
                    menuWidth="min-w-[260px]"
                  >
                    {(close) => (
                      <>
                        <ChipOption
                          active={metricKbId === undefined}
                          onClick={() => {
                            setMetricKbId(undefined)
                            close()
                          }}
                        >
                          不使用口径库
                        </ChipOption>
                        {(kbOptions.data ?? []).map((kb) => (
                          <ChipOption
                            key={kb.id}
                            active={kb.id === metricKbId}
                            onClick={() => {
                              setMetricKbId(kb.id)
                              close()
                            }}
                          >
                            {kb.name}
                          </ChipOption>
                        ))}
                      </>
                    )}
                  </ChipSelect>
                </>
              )}
            </>
          }
          footer={
            <p className="mt-2 text-center text-[12px] text-ink-4">
              内容由 AI 生成，请核对引用来源后再采纳
            </p>
          }
        />
      </Stagger>
    </div>
  )
}

function ModeCard({
  icon,
  title,
  desc,
  active,
  onClick,
  tone = 'accent',
}: {
  icon: ReactNode
  title: string
  desc: string
  active: boolean
  onClick: () => void
  tone?: 'accent' | 'info'
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-xl border bg-bg-card p-4 text-left transition-[border-color,box-shadow,transform] duration-200',
        'hover:-translate-y-px hover:shadow-[var(--shadow-pop)]',
        active
          ? tone === 'info'
            ? 'border-info'
            : 'border-accent'
          : 'border-line-strong hover:border-accent-soft',
      )}
    >
      <span
        className={cn(
          'mb-2 grid size-8 place-items-center rounded-lg',
          active ? (tone === 'info' ? 'bg-info-bg text-info' : 'bg-accent-tint text-accent') : 'bg-bg-hover text-ink-2',
        )}
      >
        {icon}
      </span>
      <span className="flex items-center gap-1.5 text-[14.5px] font-medium text-ink">
        {title}
        {active && <Check className="size-3.5 text-accent" />}
      </span>
      <span className="mt-1 block text-[13px] leading-relaxed text-ink-2">{desc}</span>
    </button>
  )
}

const questionCard =
  'flex w-full cursor-pointer items-center gap-3 rounded-xl border border-line-strong bg-bg-card px-4 py-2.5 text-left ' +
  'transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-px hover:border-accent-soft hover:shadow-[var(--shadow-pop)]'
