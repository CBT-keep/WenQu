import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

const TONES = {
  gray: 'bg-bg-hover text-ink-2',
  green: 'bg-ok-bg text-ok',
  red: 'bg-danger-bg text-danger',
  amber: 'bg-warn-bg text-warn',
  accent: 'bg-accent-tint text-accent-deep',
} as const

export type TagTone = keyof typeof TONES

/**
 * 小徽标。组件与"业务调色映射"分开放 —— 这个文件只导出组件，
 * 调色映射由使用方（如设置页）按业务需要自定义。
 */
export function Tag({
  tone = 'gray',
  children,
  className,
}: {
  tone?: TagTone
  children: ReactNode
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex h-5 items-center rounded-sm px-1.5 text-[11px] font-medium whitespace-nowrap',
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}
