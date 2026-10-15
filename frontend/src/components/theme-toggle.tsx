import { useTheme, type Theme } from '@/hooks/use-theme'
import { cn } from '@/lib/utils'

/**
 * 主题开关。
 *
 * - `ThemeToggle`：两段式胶囊（亮/暗各一格）。占位大，用在登录 / 改密这类空旷页面。
 * - `ThemeToggleButton`：紧凑单图标按钮，用于侧栏用户行这种窄位置。
 *   图标显示的是"点下去会切到哪套主题"（目标态），与 GitHub 等一致。
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
        <SunGlyph />
      </ThemeSlot>
      <ThemeSlot
        mode="dark"
        active={theme === 'dark'}
        label="切换到暗色模式"
        onClick={(el) => switchTheme('dark', el)}
      >
        <MoonGlyph />
      </ThemeSlot>
    </div>
  )
}

/** 紧凑版：单按钮，点一下切到另一套主题 */
export function ThemeToggleButton({ className }: { className?: string }) {
  const { theme, switchTheme } = useTheme()
  const next: Theme = theme === 'dark' ? 'light' : 'dark'
  const label = next === 'dark' ? '切换到暗色模式' : '切换到浅色模式'

  return (
    <button
      type="button"
      data-theme-toggle
      title={label}
      aria-label={label}
      onClick={(e) => switchTheme(next, e.currentTarget)}
      className={className}
    >
      <span className="relative grid size-[15px] place-items-center">
        <SunGlyph
          className={cn(
            'absolute transition-[transform,opacity] duration-300',
            theme === 'dark' ? 'rotate-0 opacity-100' : '-rotate-90 opacity-0',
          )}
        />
        <MoonGlyph
          className={cn(
            'absolute transition-[transform,opacity] duration-300',
            theme === 'dark' ? 'rotate-90 opacity-0' : 'rotate-0 opacity-100',
          )}
        />
      </span>
    </button>
  )
}

function ThemeSlot({
  mode,
  active,
  label,
  onClick,
  children,
}: {
  mode: Theme
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
      {children}
    </button>
  )
}

/** 太阳 / 月亮共用一支笔画，两处控件图标才一致 */
function SunGlyph({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn('size-[15px]', className)}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
    </svg>
  )
}

function MoonGlyph({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn('size-[15px]', className)}
      aria-hidden="true"
    >
      <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
    </svg>
  )
}
