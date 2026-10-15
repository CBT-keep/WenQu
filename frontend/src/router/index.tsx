import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import type { ReactElement } from 'react'
import LoginPage from '@/pages/login'
import PlaceholderPage from '@/pages/placeholder'
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
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/chat"
        element={
          <RequireAuth>
            <PlaceholderPage title="智能问答" />
          </RequireAuth>
        }
      />
      <Route
        path="/change-password"
        element={
          <RequireAuth>
            <PlaceholderPage title="修改密码" />
          </RequireAuth>
        }
      />
      <Route path="/" element={<Navigate to="/chat" replace />} />
      <Route path="*" element={<Navigate to="/chat" replace />} />
    </Routes>
  )
}
