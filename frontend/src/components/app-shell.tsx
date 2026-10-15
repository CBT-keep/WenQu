import { Outlet } from 'react-router-dom'
import { Sidebar } from '@/components/sidebar'
import { ToastHost } from '@/components/toast-host'

/**
 * 应用外壳：侧边栏 + 主区。/chat 及以后的业务页都挂在这个 layout 下。
 *
 * 壳本身在「登录 → 应用」时整体播一次 page-enter（和离开登录页的那次退场接上）；
 * 壳内部换页由各自路由上的 PageTransition 负责。
 *
 * 当前用户由外层路由守卫 `RequireApp` 通过 `useMe()` 拉取并回填 store，
 * 这里不再重复请求 —— 顺带保证「必须改密」的判据也来自服务端。
 */
export function AppShell() {
  return (
    <div className="page-enter flex h-full min-w-[420px]">
      <Sidebar />
      <main className="flex min-w-0 flex-1 flex-col bg-bg">
        <Outlet />
      </main>
      <ToastHost />
    </div>
  )
}
