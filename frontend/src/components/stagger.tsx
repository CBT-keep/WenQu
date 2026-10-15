import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/**
 * 内容分组入场：与路由进场同一根曲线、同一时长，只错开 delay。
 * 用在欢迎页这种"一页里好几块内容"的场景，避免整屏一起淡入的呆板感。
 */
export function Stagger({
  delay = 0,
  className,
  children,
}: {
  /** 相对页面进场的错开量，毫秒 */
  delay?: number
  className?: string
  children: ReactNode
}) {
  return (
    <div className={cn('stagger-in', className)} style={{ animationDelay: `${delay}ms` }}>
      {children}
    </div>
  )
}
