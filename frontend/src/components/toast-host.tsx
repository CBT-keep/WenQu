import { useToastStore } from '@/stores/toast'

/** 全局轻提示。pointer-events 全关 —— 它只是告知，不是交互 */
export function ToastHost() {
  const toasts = useToastStore((s) => s.toasts)
  if (toasts.length === 0) return null
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex flex-col items-center gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="toast-in rounded-pill border border-line-edge bg-float-bg px-4 py-2 text-[13px] text-ink shadow-[var(--shadow-pop)] backdrop-blur"
        >
          {t.message}
        </div>
      ))}
    </div>
  )
}
