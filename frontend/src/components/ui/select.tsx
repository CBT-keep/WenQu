import * as React from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

/** 原生 select + 自绘箭头，观感与 `.input` 一致 */
export function Select({
  className,
  wrapperClassName,
  children,
  ...props
}: React.ComponentProps<'select'> & { wrapperClassName?: string }) {
  return (
    <div className={cn('relative', wrapperClassName ?? 'w-full')}>
      <select
        className={cn(
          'h-8 w-full cursor-pointer appearance-none rounded-md border border-line-strong bg-bg-card px-2.5 pr-7 text-[14px] text-ink-2 outline-none',
          'transition-colors hover:border-accent-soft focus:border-accent disabled:cursor-not-allowed disabled:opacity-50',
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute top-1/2 right-2 size-3.5 -translate-y-1/2 text-ink-3" />
    </div>
  )
}
