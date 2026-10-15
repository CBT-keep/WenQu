import type { ReactNode } from 'react'

/**
 * 路由进场：整页淡入 + 轻微上浮。
 *
 * 这里用 CSS animation 而不是 transition：transition 需要"先渲染出初始态、再改属性"，
 * 而在挂载的那一帧做这件事，React 的批量更新很容易把两帧并成一帧 ——
 * 浏览器只看到终态，过渡根本不触发。animation 天生从第一帧播，不需要 JS 掺和。
 *
 * 退场不在这里管：它属于"上一屏"，由各页面自己在离开前播（见 login / change-password）。
 * 硬要做成真正的交叉淡入就得延迟卸载整棵旧树，代价远比收益大。
 */
export function PageTransition({ children }: { children: ReactNode }) {
  return <div className="page-enter h-full">{children}</div>
}
