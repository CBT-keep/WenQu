import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import type { ReactElement } from 'react'
import { Loader2, LogOut, RefreshCw } from 'lucide-react'
import LoginPage from '@/pages/login'
import ChatWelcomePage from '@/pages/chat-welcome'
import ChatConversationPage from '@/pages/chat-conversation'
import SqlConversationPage from '@/pages/sql-conversation'
import ChangePasswordPage from '@/pages/change-password'
import KbListPage from '@/pages/kb-list'
import KbDetailPage from '@/pages/kb-detail'
import KbRetrievePage from '@/pages/kb-retrieve'
import DatasourceListPage from '@/pages/datasource-list'
import TableBrowserPage from '@/pages/table-browser'
import DashboardPage from '@/pages/dashboard'
import SettingsPage from '@/pages/settings'
import { AppShell } from '@/components/app-shell'
import { PageTransition } from '@/components/page-transition'
import { useMe } from '@/hooks/use-me'
import { isAuthenticated } from '@/lib/token'
import { useAuthStore } from '@/stores/auth'
import { btnGhost, btnPrimary } from '@/lib/styles'
import type { UserRole } from '@/types'

/** 未登录 → 跳登录页。只看"有没有 token"，不涉及账号状态 */
function RequireAuth({ children }: { children: ReactElement }) {
  const location = useLocation()
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }
  return children
}

/**
 * 业务界面的门禁：登录 + 账号状态。
 *
 * ⚠️ 「首次登录强制改密」必须在这里拦，而不是只在登录成功那一跳里 navigate ——
 * 否则用户直接在地址栏敲 `/chat`（或刷新）就进来了，门禁等于没有。
 * 判据取自服务端 `/auth/me`（见 useMe），所以刷新也绕不过去。
 */
function RequireApp({ children }: { children: ReactElement }) {
  const location = useLocation()
  const { me, isPending, isStale, error, refetch } = useMe()

  if (error) return <GateError onRetry={() => void refetch()} />
  if (isPending || !me) return <GateLoading />
  if (me.mustChangePassword) {
    // 判定"必须改密"时先确认数据新鲜：拿一份过期缓存就把人拦回去，
    // 会出现"刚改完密又被弹回改密页"的死循环 —— 宁可多转一下等最新结果。
    if (isStale) return <GateLoading />
    return <Navigate to="/change-password" replace state={{ from: location.pathname }} />
  }
  return children
}

/**
 * 角色守卫（体验层；后端仍独立鉴权）。执行到这里时 me 已就绪，不会再误判。
 */
function RequireRole({ roles, children }: { roles: UserRole[]; children: ReactElement }) {
  const user = useAuthStore((s) => s.user)
  if (!user) return <GateLoading />
  if (!roles.includes(user.role)) return <Navigate to="/chat" replace />
  return children
}

function GateLoading() {
  return (
    <div className="grid h-full place-items-center bg-bg text-ink-3">
      <Loader2 className="size-5 animate-spin" />
    </div>
  )
}

/** /auth/me 拿不到时别把用户卡死：给重试与重新登录两条路 */
function GateError({ onRetry }: { onRetry: () => void }) {
  const clear = useAuthStore((s) => s.clear)
  return (
    <div className="dot-bg grid h-full place-items-center px-6">
      <div className="max-w-[360px] text-center">
        <p className="text-[16px] font-medium text-ink">无法获取账号信息</p>
        <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink-2">
          可能是网络或后端异常。重试无效时可退出后重新登录。
        </p>
        <div className="mt-5 flex justify-center gap-2">
          <button type="button" className={btnGhost} onClick={onRetry}>
            <RefreshCw className="size-4" />
            重试
          </button>
          <button
            type="button"
            className={btnPrimary}
            onClick={() => {
              clear()
              window.location.replace('/login')
            }}
          >
            <LogOut className="size-4" />
            重新登录
          </button>
        </div>
      </div>
    </div>
  )
}

export function AppRoutes() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <PageTransition>
            <LoginPage />
          </PageTransition>
        }
      />

      {/*
        改密页是登录链路上的"门禁"，只要求登录、不要求账号状态 ——
        否则"必须改密"会把它自己也挡住，转成死循环。
      */}
      <Route
        path="/change-password"
        element={
          <RequireAuth>
            <PageTransition>
              <ChangePasswordPage />
            </PageTransition>
          </RequireAuth>
        }
      />

      {/* 应用壳：侧栏 + 业务页。整棵子树都要过"登录 + 账号状态"门禁 */}
      <Route
        element={
          <RequireAuth>
            <RequireApp>
              <AppShell />
            </RequireApp>
          </RequireAuth>
        }
      >
        <Route
          path="/chat"
          element={
            <PageTransition>
              <ChatWelcomePage />
            </PageTransition>
          }
        />
        <Route
          path="/chat/rag/:id"
          element={
            <PageTransition>
              <ChatConversationPage />
            </PageTransition>
          }
        />
        <Route
          path="/chat/sql/:id"
          element={
            <PageTransition>
              <SqlConversationPage />
            </PageTransition>
          }
        />

        <Route
          path="/kb"
          element={
            <PageTransition>
              <KbListPage />
            </PageTransition>
          }
        />
        <Route
          path="/kb/:id/retrieve"
          element={
            <PageTransition>
              <KbRetrievePage />
            </PageTransition>
          }
        />
        <Route
          path="/kb/:id"
          element={
            <PageTransition>
              <KbDetailPage />
            </PageTransition>
          }
        />

        <Route
          path="/sqlbot/datasources"
          element={
            <PageTransition>
              <DatasourceListPage />
            </PageTransition>
          }
        />
        <Route
          path="/sqlbot/datasources/:id/tables"
          element={
            <PageTransition>
              <TableBrowserPage />
            </PageTransition>
          }
        />

        <Route
          path="/dashboard"
          element={
            <RequireRole roles={['ADMIN', 'SUPERADMIN']}>
              <PageTransition>
                <DashboardPage />
              </PageTransition>
            </RequireRole>
          }
        />
        <Route
          path="/settings"
          element={
            <RequireRole roles={['SUPERADMIN']}>
              <PageTransition>
                <SettingsPage />
              </PageTransition>
            </RequireRole>
          }
        />
      </Route>

      <Route path="/" element={<Navigate to="/chat" replace />} />
      <Route path="*" element={<Navigate to="/chat" replace />} />
    </Routes>
  )
}
