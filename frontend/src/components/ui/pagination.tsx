import type { ReactNode } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

/** 分页条：左「共 N 条 / 已选」 + 右「上一页 x/y 下一页」 */
export function Pagination({
  page,
  pages,
  total,
  onPage,
  className,
  label = '条',
  extra,
}: {
  page: number
  pages: number
  total: number
  onPage: (page: number) => void
  className?: string
  label?: string
  extra?: ReactNode
}) {
  const safePages = Math.max(1, pages)
  return (
    <div className={cn('flex flex-wrap items-center justify-between gap-2 text-[13.5px] text-ink-3', className)}>
      <span>
        {extra}
        {extra ? ' · ' : ''}共 {total} {label}
      </span>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="xs"
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
        >
          <ChevronLeft />
          上一页
        </Button>
        <span className="tabular-nums">
          {page} / {safePages}
        </span>
        <Button
          variant="outline"
          size="xs"
          disabled={page >= safePages}
          onClick={() => onPage(page + 1)}
        >
          下一页
          <ChevronRight />
        </Button>
      </div>
    </div>
  )
}
