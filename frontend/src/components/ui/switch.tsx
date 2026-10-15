import { cn } from '@/lib/utils'

/** 开关。原型 `.switch`：34×18 胶囊 + 14px 圆钮 */
export function Switch({
  checked,
  onChange,
  disabled,
  className,
  'aria-label': ariaLabel,
}: {
  checked: boolean
  onChange: (next: boolean) => void
  disabled?: boolean
  className?: string
  'aria-label'?: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative h-[18px] w-[34px] flex-none cursor-pointer rounded-pill border-0 p-0 transition-colors',
        checked ? 'bg-accent' : 'bg-bg-active',
        disabled && 'cursor-not-allowed opacity-50',
        className,
      )}
    >
      <span
        className={cn(
          'absolute top-[2px] left-[2px] size-[14px] rounded-full bg-white shadow-[0_1px_2px_rgba(0,0,0,.25)] transition-transform duration-200',
          checked && 'translate-x-4',
        )}
      />
    </button>
  )
}
