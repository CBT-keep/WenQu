import { useEffect, useRef, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { Flower2 } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { BrandMark } from '@/components/brand-mark'
import { ThemeToggle } from '@/components/theme-toggle'
import { login } from '@/api/auth'
import { toApiError } from '@/lib/http'
import { useAuthStore } from '@/stores/auth'
import { cn } from '@/lib/utils'

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()
  const setSession = useAuthStore((s) => s.setSession)

  const [flipped, setFlipped] = useState(false)
  /** 背面内的两个视图：登录表单 / 找回密码提示 */
  const [view, setView] = useState<'login' | 'forgot'>('login')
  // 不预填任何账号：默认值会让"空表单"看起来像已填好，既掩盖校验、
  // 也把初始口令写进了前端产物。自动填充交给浏览器的 autoComplete，别硬编码。
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  /** 登录已通过，正在退场（等动画播完再换路由） */
  const [leaving, setLeaving] = useState(false)

  const userRef = useRef<HTMLInputElement>(null)
  const backToLoginRef = useRef<HTMLButtonElement>(null)
  const expired = new URLSearchParams(location.search).get('expired') === '1'

  useEffect(() => {
    if (expired) setError('登录状态已过期，请重新登录')
  }, [expired])

  // 翻到背面后把焦点交给用户名，少点一次鼠标。
  // 必须等 640ms：背面那半程还挂着 invisible（visibility:hidden），
  // 隐藏元素接不住 focus()，早了这一步就是白做。
  useEffect(() => {
    if (!flipped) return
    const timer = setTimeout(() => userRef.current?.focus({ preventScroll: true }), 640)
    return () => clearTimeout(timer)
  }, [flipped])

  // 卡内翻转到新视图后，把焦点带到该视图的第一个交互点，
  // 免得键盘用户还得从头 Tab 一遍（也是为了让焦点别落到 body 上）。
  // 翻卡那一下这条也会跑一次，但那时背面还不可见、focus() 无效，不会跟上面打架。
  useEffect(() => {
    if (!flipped) return
    const target = view === 'forgot' ? backToLoginRef.current : userRef.current
    const timer = setTimeout(() => target?.focus({ preventScroll: true }), 420)
    return () => clearTimeout(timer)
  }, [flipped, view])

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
      // 预置门禁读的缓存，省掉一次 /auth/me 往返；也避免落地页短暂"不知道要不要改密"
      if (data.user) {
        queryClient.setQueryData(['me'], { ...data.user, mustChangePassword: data.mustChangePassword })
      }
      // 先退场再换页：直接 navigate 是硬切，两屏之间空无一物，很生硬。
      // 这里刻意不复位 submitting —— 正在淡出，按钮不该闪回可点的状态。
      setLeaving(true)
      window.setTimeout(() => {
        // doc/04 §3.1：mustChangePassword=true 时强制进入修改密码页
        navigate(data.mustChangePassword ? '/change-password' : '/chat', { replace: true })
      }, LEAVE_MS)
    } catch (err) {
      setError(toApiError(err).message)
      setSubmitting(false)
    }
  }

  return (
    <div
      className={cn(
        'dot-bg relative grid min-h-full place-items-center px-5 py-14',
        'transition-opacity duration-[280ms] ease-in',
        leaving && 'opacity-0',
      )}
    >
      {/* 页面级品牌：左上角 */}
      <div className="absolute top-0 left-0 flex items-center gap-2.5 p-[30px]">
        <BrandMark className="size-6 text-accent" />
        <span className="text-[16.5px] font-medium tracking-[0.01em]">WenQu</span>
      </div>

      {/*
        退场：整屏淡出 + 卡片微微放大，像镜头朝卡片推过去。
        缩放单独套一层，不挂在带 perspective 的元素上 ——
        那个元素的 transform 会参与 3D 上下文，能不动就不动。
      */}
      <div
        className={cn(
          'transition-transform duration-[280ms] ease-in',
          leaving && 'scale-[1.04]',
        )}
      >
        {/* 翻转卡片：外层是「品牌面 ⇄ 背面」，背面内再翻一次「登录 ⇄ 忘密」 */}
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
                <span className="mt-[22px] font-serif text-[43px] leading-none font-medium tracking-[0.01em]">
                  Welcome
                </span>
                <button
                  type="button"
                  onClick={() => setFlipped(true)}
                  className={cn(pillBtn, 'mt-[46px]')}
                >
                  Get Start
                  <ArrowGlyph className="size-[15px]" />
                </button>
              </div>
            </div>

            {/* ---------- 背面：登录表单 / 找回密码提示 ---------- */}
            {/*
              底色刻意与品牌面同用 bg-bg-section，而不是 bg-bg-card：
              两面颜色不一致的话，翻卡过程中会看到卡片"暗一档"的跳变。
              品牌面那层点阵是唯一的差别，正好把"品牌 / 表单"两种气质分开。
            */}
            <div
              className={cn(
                faceBase,
                'bg-bg-section p-10 px-11 [transform:rotateY(180deg)]',
                flipped ? 'visible' : 'invisible',
              )}
            >
              {/* 语义是「退一步」：忘密页退回登录页，登录页退回品牌面 */}
              <button
                type="button"
                onClick={() => (view === 'forgot' ? setView('login') : setFlipped(false))}
                className="absolute top-4 left-4 z-10 grid size-[30px] cursor-pointer place-items-center rounded-sm border-0 bg-transparent text-ink-2 transition-colors hover:bg-bg-hover hover:text-ink"
                title="返回"
                aria-label="返回"
              >
                <ArrowGlyph dir="left" className="size-4" />
              </button>

              {/*
                卡内是第二次翻卡，跟外层同一族动效（Y 轴翻转 + 同一根缓动曲线），
                只是行程更短（620ms < 820ms）——「忘记密码」是次要操作，
                不该跟主翻卡抢戏，也不该换一套完全不同的位移语言。

                两个视图各自是一张面：登录表单为正面（net 0°），忘密提示为背面（180°）。
                外层容器给 perspective，翻转子层给 preserve-3d，
                两张面靠 backface-visibility 互为反正，转过去的那张自动不渲染。
                非当前视图挂 inert：退出 Tab 顺序，读屏也不会念到它。
              */}
              <div className="relative w-full flex-1 [perspective:1000px]">
                <div
                  className={cn(
                    'absolute inset-0 [transform-style:preserve-3d]',
                    'transition-transform duration-[620ms] ease-[cubic-bezier(.62,.04,.2,1)]',
                    view === 'forgot' && '[transform:rotateY(180deg)]',
                  )}
                >
                  <form
                    onSubmit={handleSubmit}
                    inert={view !== 'login'}
                    className={cn(
                      'absolute inset-0 flex flex-col justify-center [backface-visibility:hidden]',
                    )}
                  >
                    <p className="mb-1 text-[13.5px] text-ink-3">欢迎回来</p>
                    <h2 className="mb-7 text-[22px] font-medium">登录 WenQu 控制台</h2>

                    <div className="mb-4">
                      <Label htmlFor="username" className="mb-1.5 block text-[13.5px] text-ink-2">
                        用户名
                      </Label>
                      <Input
                        id="username"
                        ref={userRef}
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        autoComplete="username"
                        className="h-[38px] rounded-sm border-line-strong bg-bg-card px-3 text-[15px] focus-visible:ring-accent/20"
                      />
                    </div>

                    <div className="mb-4">
                      <Label htmlFor="password" className="mb-1.5 block text-[13.5px] text-ink-2">
                        密码
                      </Label>
                      <Input
                        id="password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        autoComplete="current-password"
                        className="h-[38px] rounded-sm border-line-strong bg-bg-card px-3 text-[15px] focus-visible:ring-accent/20"
                      />
                    </div>

                    <div className="my-1 mb-[22px] flex items-center justify-between text-[13.5px] text-ink-2">
                      <Label className="cursor-pointer gap-2 text-[13.5px] font-normal">
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
                        onClick={() => {
                          setError(null)
                          setView('forgot')
                        }}
                      >
                        忘记密码？
                      </button>
                    </div>

                    {error && (
                      <p
                        role="alert"
                        className="mb-3 rounded-sm bg-danger-bg px-3 py-2 text-center text-[13.5px] text-danger"
                      >
                        {error}
                      </p>
                    )}

                    <button type="submit" disabled={submitting} className={primaryBtn}>
                      {submitting ? '登录中…' : '登 录'}
                    </button>

                    <p className="mt-4 text-center text-[13px] text-ink-3">
                      账号由管理员创建，如需开通请联系系统管理员
                    </p>
                  </form>

                  {/*
                    找回密码：只交代「找谁办」，不做自助流程（doc/04 §3.6 密码由管理员重置）。
                    排版对齐品牌面 —— 居中、一图一题一句一钮，不加卡片、不加备注行。
                  */}
                  <div
                    inert={view !== 'forgot'}
                    className={cn(
                      'absolute inset-0 flex flex-col items-center justify-center text-center',
                      '[transform:rotateY(180deg)] [backface-visibility:hidden]',
                    )}
                  >
                    <Flower2
                      className="size-[92px] text-accent"
                      strokeWidth={1.4}
                      aria-hidden="true"
                    />
                    <h2 className="mt-[26px] font-serif text-[35px] leading-none font-medium tracking-[0.01em]">
                      忘记密码
                    </h2>
                    <p className="mt-[14px] text-[14px] text-ink-2">
                      账号由管理员创建，请联系管理员重置密码
                    </p>
                    <button
                      ref={backToLoginRef}
                      type="button"
                      onClick={() => setView('login')}
                      className={cn(pillBtn, 'mt-[42px]')}
                    >
                      <ArrowGlyph dir="left" className="size-[15px]" />
                      返回登录
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <ThemeToggle className="absolute right-6 bottom-[22px]" />
    </div>
  )
}

/** 退场时长。要略短于目标页的进场（400ms），两段才接得上、不显得拖沓 */
const LEAVE_MS = 280

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

/**
 * 面内的胶囊按钮：品牌面 Get Start 与忘密面「返回登录」共用，
 * 两处长得一样，页面的性格才连得上（只有登录表单那条提交键走通栏 primaryBtn）。
 */
const pillBtn =
  'inline-flex h-[46px] cursor-pointer items-center justify-center gap-2.5 rounded-pill border-0 ' +
  'bg-accent px-[26px] text-[15px] text-on-accent ' +
  'transition-[background,transform,box-shadow] duration-200 ' +
  'hover:-translate-y-px hover:bg-accent-deep hover:shadow-[0_6px_18px_rgba(62,79,42,.26)]'

/** 卡片内的主按钮：登录表单的提交键（表单要通栏，视觉重量比胶囊重一档） */
const primaryBtn =
  'h-[44px] w-full cursor-pointer rounded-pill border-0 bg-accent text-[15px] text-on-accent ' +
  'transition-[background,transform,box-shadow] duration-200 ' +
  'hover:-translate-y-px hover:bg-accent-deep hover:shadow-[0_6px_18px_rgba(62,79,42,.26)] ' +
  'disabled:pointer-events-none disabled:opacity-60'

/** 卡内共用的箭头（返回键、Get Start、返回登录三处同一支笔画） */
function ArrowGlyph({ dir = 'right', className }: { dir?: 'left' | 'right'; className?: string }) {
  return (
    <svg
      viewBox="0 0 14 14"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {dir === 'right' ? <path d="M1 7h11M9 4l3 3-3 3" /> : <path d="M13 7H2M5 4L2 7l3 3" />}
    </svg>
  )
}
