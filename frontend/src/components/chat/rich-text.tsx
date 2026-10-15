import { Fragment, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

/**
 * 轻量富文本：把回答里的 `**粗体**`、`[n]` 引用角标、有序/无序列表渲染出来。
 *
 * 刻意不引 markdown 依赖 —— 后端目前只产出这几种内联语法，
 * 一个正则分词器足够，且不会把用户内容里的 `<` `>` 当 HTML 解析（无 dangerouslySetInnerHTML）。
 */
export function RichText({
  content,
  onCite,
  className,
}: {
  content: string
  onCite?: (index: number) => void
  className?: string
}) {
  const lines = content.split('\n')
  return (
    <div className={cn('text-[15px] leading-[1.78] text-ink-2', className)}>
      {lines.map((line, i) => {
        if (line.trim() === '') return <div key={i} className="h-2" />
        const ordered = /^\s*(\d+)\.\s+(.*)$/.exec(line)
        if (ordered) {
          return (
            <div key={i} className="mt-1 flex gap-2 pl-1">
              <span className="flex-none tabular-nums text-ink-3">{ordered[1]}.</span>
              <span className="min-w-0">{renderInline(ordered[2], onCite)}</span>
            </div>
          )
        }
        const bullet = /^\s*[-*]\s+(.*)$/.exec(line)
        if (bullet) {
          return (
            <div key={i} className="mt-1 flex gap-2 pl-1">
              <span className="mt-[9px] size-1 flex-none rounded-full bg-ink-4" />
              <span className="min-w-0">{renderInline(bullet[1], onCite)}</span>
            </div>
          )
        }
        return (
          <p key={i} className="mt-1 first:mt-0">
            {renderInline(line, onCite)}
          </p>
        )
      })}
    </div>
  )
}

/** 内联分词：**粗体** 与 [n] 角标 */
function renderInline(text: string, onCite?: (index: number) => void): ReactNode[] {
  const out: ReactNode[] = []
  const regex = /\*\*([^*]+)\*\*|\[(\d+)\]/g
  let last = 0
  let match: RegExpExecArray | null
  let key = 0
  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) out.push(<Fragment key={key++}>{text.slice(last, match.index)}</Fragment>)
    if (match[1] !== undefined) {
      out.push(
        <strong key={key++} className="font-medium text-ink">
          {match[1]}
        </strong>,
      )
    } else if (match[2] !== undefined) {
      const index = Number(match[2])
      out.push(<Citation key={key++} index={index} onClick={onCite} />)
    }
    last = match.index + match[0].length
  }
  if (last < text.length) out.push(<Fragment key={key++}>{text.slice(last)}</Fragment>)
  return out
}

function Citation({ index, onClick }: { index: number; onClick?: (index: number) => void }) {
  return (
    <button
      type="button"
      onClick={() => onClick?.(index)}
      title={`引用来源 ${index}`}
      className="mx-0.5 inline-flex h-[15px] min-w-[15px] -translate-y-1.5 cursor-pointer items-center justify-center rounded-sm border-0 bg-accent-tint px-1 text-[11px] font-medium text-accent-deep align-super transition-colors hover:bg-accent-tint-2"
    >
      {index}
    </button>
  )
}
