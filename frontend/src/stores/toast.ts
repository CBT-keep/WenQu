import { create } from 'zustand'

export interface ToastItem {
  id: number
  message: string
}

interface ToastState {
  toasts: ToastItem[]
  /** 弹出一条轻提示，约 2.6s 后自动消失；最多并排 3 条 */
  push: (message: string) => void
  dismiss: (id: number) => void
}

let seq = 0

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  push: (message) => {
    const id = ++seq
    // slice(-2) + 新的一条 = 最多 3 条，免得连点导航时糊成一片
    set((s) => ({ toasts: [...s.toasts.slice(-2), { id, message }] }))
    window.setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }))
    }, 2600)
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}))
