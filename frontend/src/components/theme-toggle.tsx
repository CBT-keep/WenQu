import { useTheme } from '@/hooks/use-theme'
import { cn } from '@/lib/utils'

/**
 * 右下角主题切换：分段控件 + 滑动指示（与样式样张一致）。
 * 指示器在图标之下（z-0），图标在上（z-1）取 --on-accent 前景色。
 */
export function ThemeToggle({ className }: { className?: string }) {
  const { theme, switchTheme } = useTheme()

  return (
    <div
      className={cn(
        'relative inline-flex items-center rounded-pill border border-line bg-float-bg p-[3px] shadow-[var(--shadow-pop)] backdrop-blur-[10px]',
        className,
      )}
      role="group"
      aria-label="主题切换"
      data-mode={theme}
    >
      <span
        className={cn(
          'tt-knob pointer-events-none absolute z-0 size-[30px] rounded-pill bg-accent',
          'translate-x-0',
          theme === 'dark' && 'translate-x-[30px]',
        )}
        style={{ top: 3, left: 3, transition: 'transform .34s cubic-bezier(.62,.04,.2,1)' }}
      />
      <ThemeSlot
        mode="light"
        active={theme === 'light'}
        label="切换到浅色模式"
        onClick={(el) => switchTheme('light', el)}
      >
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
      </ThemeSlot>
      <ThemeSlot
        mode="dark"
        active={theme === 'dark'}
        label="切换到暗色模式"
        onClick={(el) => switchTheme('dark', el)}
      >
        <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
      </ThemeSlot>
    </div>
  )
}

function ThemeSlot({
  mode,
  active,
  label,
  onClick,
  children,
}: {
  mode: 'light' | 'dark'
  active: boolean
  label: string
  onClick: (el: HTMLElement) => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      data-theme-set={mode}
      title={label}
      aria-label={label}
      aria-pressed={active}
      onClick={(e) => onClick(e.currentTarget)}
      className={cn(
        'relative z-[1] grid size-[30px] place-items-center rounded-pill border-0 bg-transparent cursor-pointer transition-colors duration-[250ms]',
        active ? 'text-on-accent' : 'text-ink-3 hover:text-ink',
      )}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="size-[15px]"
        aria-hidden="true"
      >
        {children}
      </svg>
    </button>
  )
}
