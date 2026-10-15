import type { ReactNode } from 'react'
import { AlertTriangle, CheckCircle2, Info, Loader2, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

/** 加载指示（行内旋转图标） */
export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn('size-4 animate-spin text-ink-3', className)} aria-hidden="true" />
}

/** 骨架块 */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-md bg-[linear-gradient(90deg,var(--bg-section)_25%,var(--bg-hover)_37%,var(--bg-section)_63%)] bg-[length:400%_100%]',
        className,
      )}
      aria-hidden="true"
    />
  )
}

/** 占位空态 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode
  title: string
  description?: ReactNode
  action?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex flex-col items-center justify-center px-6 py-12 text-center', className)}>
      {icon && (
        <div className="mb-3 grid size-11 place-items-center rounded-xl bg-bg-section text-ink-4">{icon}</div>
      )}
      <p className="text-[14.5px] font-medium text-ink">{title}</p>
      {description && <p className="mt-1.5 max-w-[320px] text-[13.5px] leading-relaxed text-ink-3">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

/** 列表加载中占位 */
export function LoadingBlock({ label = '加载中…', className }: { label?: string; className?: string }) {
  return (
    <div className={cn('flex items-center justify-center gap-2 py-10 text-[13.5px] text-ink-3', className)}>
      <Spinner />
      {label}
    </div>
  )
}

/** 错误占位 */
export function ErrorBlock({ message, className }: { message: string; className?: string }) {
  return (
    <div className={cn('flex items-center justify-center gap-2 py-10 text-[13.5px] text-danger', className)}>
      <XCircle className="size-4" />
      {message}
    </div>
  )
}

const ALERT_TONES = {
  info: { cls: 'bg-info-bg text-info', icon: <Info /> },
  success: { cls: 'bg-ok-bg text-ok', icon: <CheckCircle2 /> },
  warn: { cls: 'bg-warn-bg text-warn', icon: <AlertTriangle /> },
  error: { cls: 'bg-danger-bg text-danger', icon: <XCircle /> },
} as const

export type AlertTone = keyof typeof ALERT_TONES

/** 提示条（原型 `.alert`） */
export function Alert({
  tone = 'info',
  children,
  className,
}: {
  tone?: AlertTone
  children: ReactNode
  className?: string
}) {
  const t = ALERT_TONES[tone]
  return (
    <div className={cn('flex gap-2.5 rounded-md px-3 py-2.5 text-[13.5px] leading-relaxed', t.cls, className)}>
      <span className="mt-px flex-none [&_svg]:size-[15px]">{t.icon}</span>
      <div className="min-w-0">{children}</div>
    </div>
  )
}
