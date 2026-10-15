import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/**
 * 轻量 Tooltip：纯 CSS（group-hover），无需 portal。
 * 前景/背景用 --ink / --bg 反色，明暗主题下都保持对比。
 */
export function Tooltip({
  label,
  children,
  side = 'right',
  className,
}: {
  label: string
  children: ReactNode
  /** right：侧栏那类贴左边缘的控件；bottom：贴右边缘的控件（向下弹并对齐右边缘，免得往右出屏） */
  side?: 'right' | 'top' | 'bottom'
  className?: string
}) {
  return (
    <span className={cn('group/tip relative inline-flex', className)}>
      {children}
      <span
        role="tooltip"
        className={cn(
          'pointer-events-none absolute z-50 whitespace-nowrap rounded-md bg-ink px-2 py-1 text-[12.5px] leading-none text-bg opacity-0 shadow-[var(--shadow-pop)] transition-opacity duration-150 group-hover/tip:opacity-100',
          side === 'right' && 'top-1/2 left-full ml-2 -translate-y-1/2',
          side === 'bottom' && 'top-full right-0 mt-2',
          side === 'top' && 'bottom-full left-1/2 mb-2 -translate-x-1/2',
        )}
      >
        {label}
      </span>
    </span>
  )
}
