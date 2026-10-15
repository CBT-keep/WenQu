import { useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from '@/components/sidebar'
import { ToastHost } from '@/components/toast-host'
import { fetchMe } from '@/api/auth'
import { isAuthenticated } from '@/lib/token'
import { useAuthStore } from '@/stores/auth'

/**
 * 应用外壳：侧边栏 + 主区。/chat 及以后的业务页都挂在这个 layout 下。
 *
 * 壳本身在「登录 → 应用」时整体播一次 page-enter（和离开登录页的那次退场接上）；
 * 壳内部换页由各自路由上的 PageTransition 负责。
 */
export function AppShell() {
  const setUser = useAuthStore((s) => s.setUser)

  // 硬刷新时 zustand 里的 user 会丢（token 在 localStorage 里还在）——
  // 启动时静默补一次 /auth/me，问候语、侧栏头像才能拿到人。
  useEffect(() => {
    if (!isAuthenticated() || useAuthStore.getState().user) return
    fetchMe()
      .then((user) => setUser(user))
      .catch(() => undefined)
    // 只在挂载时跑一次；会话期间 user 由登录 / 改密流程写入
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
