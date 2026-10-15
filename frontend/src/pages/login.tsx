import { useEffect, useRef, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { BrandMark } from '@/components/brand-mark'
import { ThemeToggle } from '@/components/theme-toggle'
import { login, isMockMode } from '@/api/auth'
import { toApiError } from '@/lib/http'
import { useAuthStore } from '@/stores/auth'
import { cn } from '@/lib/utils'

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const setSession = useAuthStore((s) => s.setSession)

  const [flipped, setFlipped] = useState(false)
  const [username, setUsername] = useState('admin')
  const [password, setPassword] = useState('admin@123')
  const [remember, setRemember] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const userRef = useRef<HTMLInputElement>(null)
  const expired = new URLSearchParams(location.search).get('expired') === '1'

  useEffect(() => {
    if (expired) setError('登录状态已过期，请重新登录')
  }, [expired])

  // 翻到背面后把焦点交给用户名，少点一次鼠标
  useEffect(() => {
    if (!flipped) return
    const timer = setTimeout(() => userRef.current?.focus({ preventScroll: true }), 640)
    return () => clearTimeout(timer)
  }, [flipped])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (submitting) return
    if (!username.trim() || !password) {
      setError('请输入用户名和密码')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const data = await login({ username: username.trim(), password })
      setSession(data)
      // doc/04 §3.1：mustChangePassword=true 时强制进入修改密码页
      navigate(data.mustChangePassword ? '/change-password' : '/chat', { replace: true })
    } catch (err) {
      setError(toApiError(err).message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="dot-bg relative grid min-h-full place-items-center px-5 py-14">
      {/* 页面级品牌：左上角 */}
      <div className="absolute top-0 left-0 flex items-center gap-2.5 p-[30px]">
        <BrandMark className="size-6 text-accent" />
        <span className="text-[15.5px] font-medium tracking-[0.01em]">WenQu</span>
      </div>

      {/* 翻转卡片 */}
      <div className="w-[520px] max-w-[94vw]" style={{ perspective: 1600 }}>
        <div
          className={cn(
            'relative h-[580px] [transform-style:preserve-3d]',
            'transition-transform duration-[820ms] ease-[cubic-bezier(.62,.04,.2,1)]',
            flipped && '[transform:rotateY(180deg)]',
          )}
        >
          {/* ---------- 正面：品牌页 ---------- */}
          <div
            className={cn(
              faceBase,
              'face-dots bg-bg-section',
              flipped ? 'invisible' : 'visible',
            )}
          >
            <div className="m-auto flex flex-col items-center px-10 pb-3.5 text-center">
              <BrandMark className="size-[98px] text-accent" strokeWidth={1.4} />
              <span className="mt-[22px] font-serif text-[42px] leading-none font-medium tracking-[0.01em]">
                Welcome
              </span>
              <button
                type="button"
                onClick={() => setFlipped(true)}
                className={cn(
                  'mt-[46px] inline-flex h-[46px] cursor-pointer items-center justify-center gap-2.5',
                  'rounded-pill border-0 bg-accent px-[26px] text-[14px] text-on-accent',
                  'transition-[background,transform,box-shadow] duration-200',
                  'hover:-translate-y-px hover:bg-accent-deep hover:shadow-[0_6px_18px_rgba(62,79,42,.26)]',
                )}
              >
                Get Start
                <svg
                  viewBox="0 0 14 14"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.6}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="size-[15px]"
                  aria-hidden="true"
                >
                  <path d="M1 7h11M9 4l3 3-3 3" />
                </svg>
              </button>
            </div>
          </div>

          {/* ---------- 背面：登录表单 ---------- */}
          <div
            className={cn(
              faceBase,
              'bg-bg-card p-10 px-11 [transform:rotateY(180deg)]',
              flipped ? 'visible' : 'invisible',
            )}
          >
            <button
              type="button"
              onClick={() => setFlipped(false)}
              className="absolute top-4 left-4 grid size-[30px] cursor-pointer place-items-center rounded-sm border-0 bg-transparent text-ink-2 transition-colors hover:bg-bg-hover hover:text-ink"
              title="返回"
              aria-label="返回"
            >
              <svg
                viewBox="0 0 14 14"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.6}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="size-4"
                aria-hidden="true"
              >
                <path d="M13 7H2M5 4L2 7l3 3" />
              </svg>
            </button>

            <form onSubmit={handleSubmit} className="m-auto w-full">
              <p className="mb-1 text-[12.5px] text-ink-3">欢迎回来</p>
              <h2 className="mb-7 text-[21px] font-medium">登录 WenQu 控制台</h2>

              <div className="mb-4">
                <Label htmlFor="username" className="mb-1.5 block text-[12.5px] text-ink-2">
                  用户名
                </Label>
                <Input
                  id="username"
                  ref={userRef}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  className="h-[38px] rounded-sm border-line-strong bg-bg-card px-3 text-[14px] focus-visible:ring-accent/20"
                />
              </div>

              <div className="mb-4">
                <Label htmlFor="password" className="mb-1.5 block text-[12.5px] text-ink-2">
                  密码
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  className="h-[38px] rounded-sm border-line-strong bg-bg-card px-3 text-[14px] focus-visible:ring-accent/20"
                />
              </div>

              <div className="my-1 mb-[22px] flex items-center justify-between text-[12.5px] text-ink-2">
                <Label className="cursor-pointer gap-2 text-[12.5px] font-normal">
                  <Checkbox
                    checked={remember}
                    onCheckedChange={(v) => setRemember(!!v)}
                    className="border-line-strong data-[checked]:border-accent data-[checked]:bg-accent"
                  />
                  记住我
                </Label>
                <button
                  type="button"
                  className="cursor-pointer border-0 bg-transparent p-0 text-accent"
                  onClick={() => setError('请联系系统管理员重置密码')}
                >
                  忘记密码？
                </button>
              </div>

              {error && (
                <p
                  role="alert"
                  className="mb-3 rounded-sm bg-danger-bg px-3 py-2 text-[12.5px] text-danger"
                >
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className={cn(
                  'h-[44px] w-full cursor-pointer rounded-pill border-0 bg-accent text-[14px] text-on-accent',
                  'transition-[background,transform,box-shadow] duration-200',
                  'hover:-translate-y-px hover:bg-accent-deep hover:shadow-[0_6px_18px_rgba(62,79,42,.26)]',
                  'disabled:pointer-events-none disabled:opacity-60',
                )}
              >
                {submitting ? '登录中…' : '登 录'}
              </button>

              <p className="mt-4 text-center text-[12px] text-ink-3">
                账号由管理员创建，如需开通请联系系统管理员
              </p>
            </form>
          </div>
        </div>
      </div>

      <ThemeToggle className="absolute right-6 bottom-[22px]" />
      {isMockMode && (
        <p className="absolute bottom-[22px] left-6 text-[12px] text-ink-3">
          Mock 模式：admin / admin@123
        </p>
      )}
    </div>
  )
}

/**
 * 两个面共用：定宽定高 + 圆角 + 外沿描边 + 顶部高光。
 * visibility 延迟到旋转过半再切换：既防镜像穿透，
 * 也让隐藏的那一面退出 Tab 焦点顺序。
 * 注意 transition 里必须带上 visibility 那一项。
 */
const faceBase =
  'absolute inset-0 flex flex-col overflow-hidden rounded-2xl border-[1.5px] border-line-edge ' +
  '[backface-visibility:hidden] ' +
  '[transition:visibility_0s_linear_.41s,background-color_.35s_ease,border-color_.35s_ease] ' +
  'shadow-[var(--shadow-card),var(--face-inner)]'
