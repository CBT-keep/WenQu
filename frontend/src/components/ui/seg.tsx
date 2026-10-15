import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/** 分段控件（原型 `.seg`）：灰底槽 + 白色选中块 */
export function Seg<T extends string>({
  value,
  onChange,
  options,
  className,
}: {
  value: T
  onChange: (value: T) => void
  options: { value: T; label: ReactNode }[]
  className?: string
}) {
  return (
    <div className={cn('inline-flex items-center gap-0.5 rounded-md bg-bg-section p-[3px]', className)} role="tablist">
      {options.map((opt) => {
        const active = opt.value === value
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(opt.value)}
            className={cn(
              'inline-flex h-[26px] cursor-pointer items-center gap-1 rounded-sm border-0 px-2.5 text-[13.5px] whitespace-nowrap transition-colors',
              active
                ? 'bg-bg-card font-medium text-ink shadow-[0_1px_3px_rgba(0,0,0,.08)]'
                : 'bg-transparent text-ink-2 hover:text-ink',
            )}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}
