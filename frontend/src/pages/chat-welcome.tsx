import { useEffect, useRef, useState, type ReactNode } from 'react'
import {
  ArrowRight,
  BookOpen,
  Check,
  ChevronDown,
  Database,
  HelpCircle,
  Library,
  Paperclip,
  Send,
  Sparkles,
} from 'lucide-react'
import { Stagger } from '@/components/stagger'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'
import { cn } from '@/lib/utils'

/**
 * 智能问答 · 欢迎页 —— 登录链路的落点。
 * 布局参照 doc/prototype/wenqu-prototype.html 的 #page-chat-welcome，
 * 对话 / 知识库 / 模型的后端尚未就绪：交互做到"能选模式、能填问题、能发"为止，
 * 发送先给轻提示占位，接口通了把 send() 换成真请求。
 */

type ChatMode = 'rag' | 'sql'

const MODES: { key: ChatMode; label: string; desc: string; icon: ReactNode }[] = [
  {
    key: 'rag',
    label: 'RAG 问答',
    desc: '检索知识库并生成带引用的回答',
    icon: <Sparkles className="size-4" />,
  },
  {
    key: 'sql',
    label: 'SQLBot 查询',
    desc: '自然语言转 SQL，结果成表成图',
    icon: <Database className="size-4" />,
  },
]

const RECOMMENDED = [
  '如何重置管理员密码？',
  '报销流程是怎么走的？需要哪些材料？',
  'v3.2 相比 v3.1 有哪些变更？',
]

export default function ChatWelcomePage() {
  const user = useAuthStore((s) => s.user)
  const pushToast = useToastStore((s) => s.push)

  const [mode, setMode] = useState<ChatMode>('rag')
  const [modeOpen, setModeOpen] = useState(false)
  const [draft, setDraft] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // 输入框随内容长高，封顶 160px 后出内部滚动条
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`
  }, [draft])

  function focusComposer() {
    textareaRef.current?.focus({ preventScroll: true })
  }

  function send() {
    if (!draft.trim()) return
    // 对话服务还没实现。保留草稿不丢，只提示。
    pushToast('对话服务尚未实现，敬请期待')
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    // isComposing：拼音选字阶段的 Enter 是"上屏"，不是"发送"
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault()
      send()
    }
  }

  const displayName = user?.nickname ?? user?.username

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* 顶栏 */}
      <header className="flex h-12 flex-none items-center gap-2 border-b border-line px-5">
        <span className="text-[14px] font-medium">新对话</span>
        <span className="rounded-sm bg-accent-tint px-1.5 py-0.5 text-[11px] font-medium text-accent-deep">
          RAG 问答
        </span>
      </header>

      {/* 中部内容 */}
      <div className="flex flex-1 flex-col items-center overflow-y-auto px-6 py-8">
        <div className="w-full max-w-[760px]">
          <Stagger className="text-center">
            <div className="mx-auto mb-4 grid size-12 place-items-center rounded-[14px] bg-accent-tint text-accent">
              <Sparkles className="size-6" />
            </div>
            <h1 className="text-[24px] font-medium tracking-[0.01em]">
              {displayName ? `${displayName}，` : ''}今天想了解点什么？
            </h1>
            <p className="mt-2 text-[14px] text-ink-2">
              检索知识库获得带引用的答案，或直接查询业务数据
            </p>
          </Stagger>

          <Stagger delay={70} className="mt-8 grid grid-cols-1 gap-3 md:grid-cols-2">
            <ModeCard
              icon={<BookOpen className="size-4" />}
              title="RAG 问答 · 查文档"
              desc="检索知识库并生成带引用的回答，也可查询指标口径定义"
              active={mode === 'rag'}
              onClick={() => {
                setMode('rag')
                focusComposer()
              }}
            />
            <ModeCard
              icon={<Database className="size-4" />}
              title="SQLBot 查询 · 查数据"
              desc="自然语言转 SQL，结果成表成图，可导出"
              active={mode === 'sql'}
              onClick={() => {
                setMode('sql')
                focusComposer()
              }}
            />
          </Stagger>

          <Stagger delay={140} className="mt-7">
            <p className="mb-2.5 text-[12px] font-medium text-ink-3">推荐问题</p>
            <div className="space-y-2">
              {RECOMMENDED.map((q) => (
                <button
                  key={q}
                  type="button"
                  className={questionCard}
                  onClick={() => {
                    setDraft(q)
                    focusComposer()
                  }}
                >
                  <HelpCircle className="size-4 flex-none text-ink-4" />
                  <span className="truncate text-[13.5px]">{q}</span>
                  <ArrowRight className="ml-auto size-[15px] flex-none text-ink-4" />
                </button>
              ))}
            </div>
          </Stagger>
        </div>
      </div>

      {/* 输入区 */}
      <Stagger delay={210} className="flex-none px-5 pb-4">
        <div className="mx-auto max-w-[760px]">
          {/* 聚焦反馈挂在卡片上而不是输入框：输入框自身 outline-none，
              卡片 focus-within 时描边转橄榄色，克制且一眼可知"正在输入" */}
          <div className="rounded-xl border border-line-strong bg-bg-card shadow-[var(--shadow-card)] transition-colors focus-within:border-accent-soft">
            <textarea
              ref={textareaRef}
              rows={2}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="给 WenQu 发送消息…（Enter 发送，Shift+Enter 换行）"
              className="w-full resize-none bg-transparent px-4 pt-3 pb-1 text-[14px] leading-relaxed outline-none placeholder:text-ink-4"
            />
            <div className="flex items-center gap-2 px-3 pb-3">
              {/* 模式选择 */}
              <div className="relative">
                <button
                  type="button"
                  className={chip}
                  onClick={() => setModeOpen((v) => !v)}
                >
                  <span className={mode === 'rag' ? 'text-accent' : 'text-info'}>
                    {MODES.find((m) => m.key === mode)?.icon}
                  </span>
                  {MODES.find((m) => m.key === mode)?.label}
                  <ChevronDown className="size-[13px] text-ink-3" />
                </button>
                {modeOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setModeOpen(false)} />
                    <div className="absolute bottom-full left-0 z-20 mb-1.5 w-64 overflow-hidden rounded-lg border border-line-edge bg-bg-card py-1 shadow-[var(--shadow-pop)]">
                      {MODES.map((m) => (
                        <button
                          key={m.key}
                          type="button"
                          className="flex w-full items-start gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-bg-hover"
                          onClick={() => {
                            setMode(m.key)
                            setModeOpen(false)
                            focusComposer()
                          }}
                        >
                          <span className={cn('mt-0.5 flex-none', m.key === 'rag' ? 'text-accent' : 'text-info')}>
                            {m.icon}
                          </span>
                          <span className="min-w-0">
                            <span className="flex items-center gap-1.5 text-[13px] font-medium">
                              {m.label}
                              {mode === m.key && <Check className="size-[13px] text-accent" />}
                            </span>
                            <span className="mt-0.5 block text-[11.5px] leading-relaxed text-ink-3">
                              {m.desc}
                            </span>
                          </span>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>

              <button
                type="button"
                className={chip}
                onClick={() => pushToast('知识库选择开发中')}
              >
                <Library className="size-[14px]" />
                产品手册知识库
                <ChevronDown className="size-[13px] text-ink-3" />
              </button>

              <button
                type="button"
                className={iconBtn}
                title="上传附件"
                onClick={() => pushToast('附件上传开发中')}
              >
                <Paperclip className="size-4" />
              </button>

              <div className="ml-auto flex items-center gap-2.5">
                <span className="text-[11px] text-ink-4">Enter 发送</span>
                <button
                  type="button"
                  className={sendBtn}
                  disabled={!draft.trim()}
                  onClick={send}
                >
                  <Send className="size-[15px]" />
                  发送
                </button>
              </div>
            </div>
          </div>
          <p className="mt-2 text-center text-[11px] text-ink-4">
            内容由 AI 生成，请核对引用来源后再采纳
          </p>
        </div>
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
}: {
  icon: ReactNode
  title: string
  desc: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-xl border bg-bg-card p-4 text-left transition-[border-color,box-shadow,transform] duration-200',
        'hover:-translate-y-px hover:shadow-[var(--shadow-pop)]',
        active ? 'border-accent' : 'border-line-strong hover:border-accent-soft',
      )}
    >
      <span
        className={cn(
          'mb-2 grid size-8 place-items-center rounded-lg',
          active ? 'bg-accent-tint text-accent' : 'bg-bg-hover text-ink-2',
        )}
      >
        {icon}
      </span>
      <span className="block text-[13.5px] font-medium">{title}</span>
      <span className="mt-1 block text-[12px] leading-relaxed text-ink-2">{desc}</span>
    </button>
  )
}

const chip =
  'inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-md border border-line-strong bg-bg-card px-2.5 ' +
  'text-[12.5px] text-ink-2 transition-colors hover:border-accent-soft hover:text-ink'

const iconBtn =
  'grid size-8 cursor-pointer place-items-center rounded-md border-0 bg-transparent text-ink-3 transition-colors hover:bg-bg-hover hover:text-ink'

const questionCard =
  'flex w-full cursor-pointer items-center gap-3 rounded-xl border border-line-strong bg-bg-card px-4 py-2.5 text-left ' +
  'transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-px hover:border-accent-soft hover:shadow-[var(--shadow-pop)]'

const sendBtn =
  'inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-md border-0 bg-accent px-3.5 text-[13px] text-on-accent ' +
  'transition-[background,transform,box-shadow] duration-200 ' +
  'hover:-translate-y-px hover:bg-accent-deep hover:shadow-[0_6px_18px_rgba(62,79,42,.26)] ' +
  'disabled:pointer-events-none disabled:opacity-50'
