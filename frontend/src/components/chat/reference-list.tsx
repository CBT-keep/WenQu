import { ChevronDown, FileText } from 'lucide-react'
import type { ChatReference, RetrievalReference } from '@/types'
import { cn } from '@/lib/utils'

/** 引用来源列表（原型 `.snippet`）。RAG 消息与检索测试共用。 */
export function ReferenceList({
  references,
  className,
  highlight,
  onOpen,
}: {
  references: (ChatReference | RetrievalReference)[]
  className?: string
  /** 需要高亮的角标序号（点开引用时滚动/闪烁用） */
  highlight?: number
  onOpen?: (ref: ChatReference | RetrievalReference) => void
}) {
  if (references.length === 0) return null
  return (
    <div className={className}>
      <p className="mb-1.5 text-[13px] font-medium text-ink-3">引用来源</p>
      <div className="space-y-1.5">
        {references.map((ref) => (
          <button
            key={`${ref.index}-${ref.chunkId}`}
            type="button"
            onClick={() => onOpen?.(ref)}
            className={cn(
              'flex w-full cursor-pointer items-center gap-2 rounded-md border px-2.5 py-1.5 text-left text-[13px] transition-colors',
              highlight === ref.index
                ? 'border-accent-soft bg-accent-tint text-accent-deep'
                : 'border-transparent bg-bg-section text-ink-2 hover:border-accent-soft hover:text-ink',
            )}
          >
            <span className="inline-flex h-[15px] min-w-[15px] flex-none items-center justify-center rounded-sm bg-accent-tint px-1 text-[11px] font-medium text-accent-deep">
              {ref.index}
            </span>
            <FileText className="size-3.5 flex-none text-ink-4" />
            <span className="min-w-0 flex-1 truncate">{describe(ref)}</span>
            <span className="flex-none font-mono text-[12px] text-ink-4">{ref.score.toFixed(3)}</span>
            <ChevronDown className="size-3 flex-none text-ink-4" />
          </button>
        ))}
      </div>
    </div>
  )
}

function describe(ref: ChatReference | RetrievalReference): string {
  const section = 'metadata' in ref ? ref.metadata?.section : undefined
  const chunkIndex = 'chunkIndex' in ref ? ref.chunkIndex : undefined
  const parts = [ref.documentName]
  if (typeof section === 'string') parts.push(section)
  if (chunkIndex !== undefined) parts.push(`分片 #${chunkIndex}`)
  return parts.join(' · ')
}
