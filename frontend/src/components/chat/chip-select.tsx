import { useState, type ReactNode } from 'react'
import { Check, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * 输入框左下角的资源/模式胶囊及其下拉（原型 `.chip-select` / `.select-menu`，参照 Codex）。
 * 内容用 render prop 传入，以便子项点击后能 close()。
 */
export function ChipSelect({
  icon,
  label,
  tone = 'accent',
  disabled,
  title,
  menuWidth = 'min-w-[240px]',
  children,
}: {
  icon?: ReactNode
  label: string
  tone?: 'accent' | 'info'
  disabled?: boolean
  title?: string
  menuWidth?: string
  children: (close: () => void) => ReactNode
}) {
  const [open, setOpen] = useState(false)
  const close = () => setOpen(false)

  return (
    <div className="relative">
      <button
        type="button"
        title={title}
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-md border border-line-strong bg-bg-card px-2.5 text-[13.5px] text-ink-2 transition-colors',
          'disabled:cursor-not-allowed disabled:opacity-50',
          tone === 'info' ? 'hover:border-info hover:text-info' : 'hover:border-accent-soft hover:text-ink',
        )}
      >
        {icon && <span className={tone === 'info' ? 'text-info' : 'text-accent'}>{icon}</span>}
        <span className="max-w-[160px] truncate">{label}</span>
        <ChevronDown className="size-[13px] text-ink-3" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={close} />
          <div
            className={cn(
              'absolute bottom-full left-0 z-20 mb-1.5 overflow-hidden rounded-lg border border-line-edge bg-bg-card py-1 shadow-[var(--shadow-pop)]',
              menuWidth,
            )}
          >
            {children(close)}
          </div>
        </>
      )}
    </div>
  )
}

/** 胶囊下拉里的普通选项（单行） */
export function ChipOption({
  active,
  disabled,
  onClick,
  children,
}: {
  active?: boolean
  disabled?: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-2 px-3 py-2 text-left text-[14px] transition-colors',
        disabled ? 'cursor-not-allowed text-ink-4' : 'cursor-pointer text-ink-2 hover:bg-bg-hover hover:text-ink',
      )}
    >
      <span className="min-w-0 flex-1 truncate">{children}</span>
      {active && <Check className="size-[13px] flex-none text-accent" />}
    </button>
  )
}

/** 胶囊下拉里的"说明型"选项（图标 + 标题 + 一句话，模式切换用） */
export function ChipOptionRich({
  icon,
  title,
  desc,
  active,
  tone = 'accent',
  onClick,
}: {
  icon: ReactNode
  title: string
  desc: string
  active?: boolean
  tone?: 'accent' | 'info'
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full cursor-pointer items-start gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-bg-hover"
    >
      <span className={cn('mt-0.5 flex-none', tone === 'info' ? 'text-info' : 'text-accent')}>{icon}</span>
      <span className="min-w-0">
        <span className="flex items-center gap-1.5 text-[14px] font-medium text-ink">
          {title}
          {active && <Check className="size-[13px] text-accent" />}
        </span>
        <span className="mt-0.5 block text-[12.5px] leading-relaxed text-ink-3">{desc}</span>
      </span>
    </button>
  )
}
