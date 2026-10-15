import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import type { ReactElement } from 'react'
import LoginPage from '@/pages/login'
import ChatWelcomePage from '@/pages/chat-welcome'
import ChangePasswordPage from '@/pages/change-password'
import SettingsPage from '@/pages/settings'
import { AppShell } from '@/components/app-shell'
import { PageTransition } from '@/components/page-transition'
import { isAuthenticated } from '@/lib/token'

/** 未登录 → 跳登录页；已登录访问 /login → 放行进应用 */
function RequireAuth({ children }: { children: ReactElement }) {
  const location = useLocation()
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }
  return children
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

      {/* 改密页是登录链路上的"门禁"，不属于应用壳 —— 首登时它先于应用出现 */}
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

      {/* 应用壳：侧栏 + 业务页。后续 /kb、/sqlbot 等页面加进这个 layout 即可 */}
      <Route
        element={
          <RequireAuth>
            <AppShell />
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
          path="/settings"
          element={
            <PageTransition>
              <SettingsPage />
            </PageTransition>
          }
        />
      </Route>

      <Route path="/" element={<Navigate to="/chat" replace />} />
      <Route path="*" element={<Navigate to="/chat" replace />} />
    </Routes>
  )
}
