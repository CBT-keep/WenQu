import { useEffect, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * 通用模态框：遮罩点击 / Esc 关闭。
 * 进场用 animation（挂载即播），退场直接卸载 —— 对话框不做退场动画，
 * 管理后台的高频操作里，"干脆地消失"比"依依不舍地淡出"更利索。
 */
export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  width = 'max-w-[440px]',
}: {
  open: boolean
  onClose: () => void
  title: ReactNode
  children: ReactNode
  footer?: ReactNode
  width?: string
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 grid place-items-center px-4">
      <div className="modal-fade absolute inset-0 bg-black/30 backdrop-blur-[2px]" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          'modal-in relative max-h-[90vh] overflow-y-auto w-full rounded-2xl border border-line-edge bg-bg-card p-6 shadow-[var(--shadow-pop)]',
          width,
        )}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-[16px] font-medium">{title}</h3>
          <button
            type="button"
            className="grid size-7 cursor-pointer place-items-center rounded-md border-0 bg-transparent text-ink-3 transition-colors hover:bg-bg-hover hover:text-ink"
            onClick={onClose}
            aria-label="关闭"
          >
            <X className="size-4" />
          </button>
        </div>
        {children}
        {footer && <div className="mt-6 flex justify-end gap-2">{footer}</div>}
      </div>
    </div>
  )
}

/** 确认对话框：危险/不可逆操作前的一停 */
export function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = '确认',
  danger = false,
  loading = false,
}: {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  description: ReactNode
  confirmText?: string
  danger?: boolean
  loading?: boolean
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      width="max-w-[400px]"
      footer={
        <>
          <button type="button" className={ghostBtn} onClick={onClose}>
            取消
          </button>
          <button
            type="button"
            className={danger ? dangerBtn : primaryBtn}
            disabled={loading}
            onClick={onConfirm}
          >
            {loading ? '处理中…' : confirmText}
          </button>
        </>
      }
    >
      <div className="text-[14px] leading-relaxed text-ink-2">{description}</div>
    </Modal>
  )
}

const ghostBtn =
  'h-9 cursor-pointer rounded-md border border-line-strong bg-bg-card px-4 text-[14px] text-ink-2 transition-colors hover:border-accent-soft hover:text-ink'

const primaryBtn =
  'h-9 cursor-pointer rounded-md border-0 bg-accent px-4 text-[14px] text-on-accent transition-colors hover:bg-accent-deep disabled:pointer-events-none disabled:opacity-60'

const dangerBtn =
  'h-9 cursor-pointer rounded-md border-0 bg-danger px-4 text-[14px] text-white transition-opacity hover:opacity-90 disabled:pointer-events-none disabled:opacity-60'
