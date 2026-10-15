import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Paperclip, Send, Square, X } from 'lucide-react'
import { formatBytes } from '@/lib/format'
import { useToastStore } from '@/stores/toast'
import { cn } from '@/lib/utils'

/** 单次最多带几个附件（与后端上限无关，纯前端防呆） */
const MAX_FILES = 10

/**
 * 对话输入框。RAG / SQLBot 两种模式共用：
 * 差异全交给 `leftSlot`（模式胶囊、知识库/数据源胶囊）。
 *
 * 附件：选择文件 + **拖拽到输入框**都能添加，已选的在输入框上方以 chip 呈现。
 * ⚠️ 上传接口尚未定义（doc/04 没有"对话附件"端点），所以这里只做到"选好、可移除、
 * 随消息一起交给上层"，上层拿到非空附件时给一句明确提示，而不是悄悄丢弃。
 */
export function Composer({
  value,
  onChange,
  onSend,
  onStop,
  streaming,
  placeholder = '给 WenQu 发送消息…（Enter 发送，Shift+Enter 换行）',
  leftSlot,
  disabled,
  className,
  footer,
}: {
  value: string
  onChange: (value: string) => void
  onSend: (files: File[]) => void
  onStop?: () => void
  streaming?: boolean
  placeholder?: string
  leftSlot?: ReactNode
  disabled?: boolean
  className?: string
  footer?: ReactNode
}) {
  const pushToast = useToastStore((s) => s.push)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const dragDepth = useRef(0)

  const [files, setFiles] = useState<File[]>([])
  const [dragging, setDragging] = useState(false)

  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 180)}px`
  }, [value])

  const focus = () => textareaRef.current?.focus({ preventScroll: true })

  function addFiles(list: FileList | null) {
    if (!list || list.length === 0) return
    setFiles((prev) => {
      const merged = [...prev, ...Array.from(list)]
      if (merged.length > MAX_FILES) {
        pushToast(`最多添加 ${MAX_FILES} 个附件`)
        return merged.slice(0, MAX_FILES)
      }
      return merged
    })
    focus()
  }

  function removeFile(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    // isComposing：拼音选字阶段的 Enter 是"上屏"，不是发送
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault()
      if (!streaming) handleSend()
    }
  }

  const canSend = !!value.trim() && !disabled

  function handleSend() {
    const attached = files
    if (attached.length > 0) {
      // 对话附件的上传端点尚未定义（doc/04 无此端点）。明确告知，不静默丢弃 ——
      // 后端就绪后只需改这一处：把 attached 先上传、拿回 fileId 再随消息提交。
      pushToast('附件上传接口尚未实现，本次仅发送文字')
      setFiles([])
    }
    onSend(attached)
  }

  return (
    <div className={cn('mx-auto w-full', className)}>
      <div
        // 拖拽相关都挂在卡片上：整个输入框都是投放区，比只认那个别针按钮好按
        onDragEnter={(e) => {
          e.preventDefault()
          dragDepth.current += 1
          setDragging(true)
        }}
        onDragOver={(e) => {
          // 不 preventDefault 浏览器就会拒绝 drop
          e.preventDefault()
        }}
        onDragLeave={(e) => {
          e.preventDefault()
          dragDepth.current -= 1
          if (dragDepth.current <= 0) {
            dragDepth.current = 0
            setDragging(false)
          }
        }}
        onDrop={(e) => {
          e.preventDefault()
          dragDepth.current = 0
          setDragging(false)
          addFiles(e.dataTransfer?.files ?? null)
        }}
        className={cn(
          'relative rounded-xl border border-line-strong bg-bg-card shadow-[var(--shadow-card)] transition-colors focus-within:border-accent-soft',
          dragging && 'border-accent bg-accent-tint/30',
        )}
      >
        {dragging && (
          <div className="pointer-events-none absolute inset-0 z-10 grid place-items-center rounded-xl border-2 border-dashed border-accent bg-bg-card/85">
            <span className="text-[13px] text-accent-deep">松开即可添加附件</span>
          </div>
        )}

        {files.length > 0 && (
          <div className="flex flex-wrap gap-1.5 px-3 pt-3">
            {files.map((file, i) => (
              <span
                key={`${file.name}-${file.size}-${i}`}
                className="inline-flex max-w-[240px] items-center gap-1.5 rounded-md border border-line bg-bg-section px-2 py-1 text-[12px] text-ink-2"
              >
                <Paperclip className="size-3 flex-none text-ink-4" />
                <span className="truncate">{file.name}</span>
                <span className="flex-none text-ink-4">{formatBytes(file.size)}</span>
                <button
                  type="button"
                  aria-label={`移除附件 ${file.name}`}
                  title="移除"
                  onClick={() => removeFile(i)}
                  className="grid size-3.5 flex-none cursor-pointer place-items-center rounded-sm border-0 bg-transparent text-ink-4 transition-colors hover:text-danger"
                >
                  <X className="size-3" />
                </button>
              </span>
            ))}
          </div>
        )}

        <textarea
          ref={textareaRef}
          rows={2}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full resize-none bg-transparent px-4 pt-3 pb-1 text-[15px] leading-relaxed text-ink outline-none placeholder:text-ink-4 disabled:opacity-60"
        />

        <div className="flex flex-wrap items-center gap-2 px-3 pb-3">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            {leftSlot}
            <button
              type="button"
              title="添加附件（也可直接把文件拖进来）"
              aria-label="添加附件"
              onClick={() => inputRef.current?.click()}
              className="grid size-8 cursor-pointer place-items-center rounded-md border-0 bg-transparent text-ink-3 transition-colors hover:bg-bg-hover hover:text-ink"
            >
              <Paperclip className="size-4" />
            </button>
            <input
              ref={inputRef}
              type="file"
              multiple
              hidden
              onChange={(e) => {
                addFiles(e.target.files)
                // 清空 value：同一个文件连选两次也要能触发 change
                e.target.value = ''
              }}
            />
          </div>

          <div className="ml-auto flex items-center gap-2.5">
            <span className="hidden text-[12px] text-ink-4 sm:inline">Enter 发送</span>
            {streaming ? (
              <button type="button" onClick={onStop} className={stopBtn}>
                <Square className="size-[13px]" />
                停止生成
              </button>
            ) : (
              <button type="button" className={sendBtn} disabled={!canSend} onClick={handleSend}>
                <Send className="size-[15px]" />
                发送
              </button>
            )}
          </div>
        </div>
      </div>
      {footer}
    </div>
  )
}

const stopBtn =
  'inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-md border border-line-strong bg-bg-card px-3 text-[14px] text-ink-2 transition-colors hover:border-danger hover:text-danger'

const sendBtn =
  'inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-md border-0 bg-accent px-3.5 text-[14px] text-on-accent ' +
  'transition-[background,transform,box-shadow] duration-200 ' +
  'hover:-translate-y-px hover:bg-accent-deep hover:shadow-[0_6px_18px_rgba(62,79,42,.26)] ' +
  'disabled:pointer-events-none disabled:opacity-50'
