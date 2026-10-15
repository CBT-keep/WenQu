import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/** 页面标题区（原型 `.page-head`）：左标题+描述，右操作区 */
export function PageHeader({
  title,
  badge,
  description,
  actions,
  className,
}: {
  title: ReactNode
  badge?: ReactNode
  description?: ReactNode
  actions?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('mb-4 flex flex-wrap items-center justify-between gap-3', className)}>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-[19px] font-medium tracking-[0.01em] text-ink">{title}</h1>
          {badge}
        </div>
        {description && <p className="mt-1 text-[13.5px] text-ink-3">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

/** 内容面板（原型 `.card`）：白底 + 细描边 + 可选头部 */
export function Panel({
  title,
  extra,
  children,
  className,
  bodyClassName,
  flush,
}: {
  title?: ReactNode
  extra?: ReactNode
  children: ReactNode
  className?: string
  bodyClassName?: string
  /** 表格类内容自带内边距，用 flush 去掉 body 的 padding */
  flush?: boolean
}) {
  return (
    <section className={cn('overflow-hidden rounded-xl border border-line bg-bg-card', className)}>
      {(title || extra) && (
        <header className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-3">
          {title && <h2 className="text-[14.5px] font-medium text-ink">{title}</h2>}
          <div className="ml-auto flex flex-wrap items-center gap-2">{extra}</div>
        </header>
      )}
      <div className={cn(flush ? '' : 'p-4', bodyClassName)}>{children}</div>
    </section>
  )
}

/** 指标卡（原型 `.stat-value` / `.stat-label`） */
export function StatCard({
  label,
  value,
  unit,
  hint,
  badge,
  className,
}: {
  label: ReactNode
  value: ReactNode
  unit?: string
  hint?: ReactNode
  badge?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('rounded-xl border border-line bg-bg-card p-5', className)}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[14px] text-ink-2">{label}</span>
        {badge}
      </div>
      <div className="mt-2 text-[27px] leading-none font-medium tabular-nums text-ink">
        {value}
        {unit && <span className="ml-1 text-[14px] font-normal text-ink-3">{unit}</span>}
      </div>
      {hint && <div className="mt-1.5 text-[13px] text-ink-3">{hint}</div>}
    </div>
  )
}

/** 工具条：搜索/筛选 + 右侧操作 */
export function Toolbar({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('mb-4 flex flex-wrap items-center gap-2', className)}>{children}</div>
}

/** 可点击的资源胶囊（原型 `.chip-select`） */
export function Chip({
  children,
  onClick,
  tone = 'accent',
  className,
  title,
  disabled,
}: {
  children: ReactNode
  onClick?: () => void
  tone?: 'accent' | 'info'
  className?: string
  title?: string
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'inline-flex h-8 items-center gap-1.5 rounded-md border border-line-strong bg-bg-card px-2.5 text-[13.5px] text-ink-2',
        'transition-colors disabled:cursor-not-allowed disabled:opacity-50',
        tone === 'info' ? 'hover:border-info hover:text-info' : 'hover:border-accent-soft hover:text-ink',
        className,
      )}
    >
      {children}
    </button>
  )
}
