import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { ChevronDown, ChevronLeft } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { BrandMark } from '@/components/brand-mark'
import { ThemeToggle } from '@/components/theme-toggle'
import { Typewriter } from '@/components/typewriter'
import { changePassword, fetchMe, login } from '@/api/auth'
import { toApiError } from '@/lib/http'
import { useAuthStore } from '@/stores/auth'
import { cn } from '@/lib/utils'

/**
 * 修改密码页 —— doc/04 §3.6
 *
 * 首次登录（must_change_password=true）先进「打招呼」阶段：一段打字机台词，
 * 再落到表单。理由是开场直接甩一张要去填的表太冷了 ——
 * 这个页面通常是用户第一次见到系统，值得有半句话的过渡。
 * 主动改密（从应用里进来）不走打招呼，那是熟面孔。
 *
 * 改密成功后后端会吊销全部 refresh token，所以这里用新密码静默重新登录一次，
 * 直接拿到 mustChangePassword=false 的新会话，避免把用户踢回登录页。
 */

/** 打招呼台词。放模块级常量，引用稳定，打字机的计时器才不会被每次渲染抖掉 */
const GREETING_LINES = ['你好呀…新朋友？', '那么看起来，你需要先做一点使用前的设置']
/**
 * 两句都用衬线体 = 同一个声音在说话，只靠字号和颜色分层。
 * 第二句如果用小号的非衬线体，会读成"标题 + 注释"，不像一句接一句的对话。
 */
const GREETING_STYLES = [
  'font-serif text-[26px] leading-snug font-medium tracking-[0.01em]',
  'mt-2.5 font-serif text-[17px] leading-relaxed text-ink-2',
]

export default function ChangePasswordPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()
  const user = useAuthStore((s) => s.user)
  const setSession = useAuthStore((s) => s.setSession)
  const clear = useAuthStore((s) => s.clear)
  /**
   * 是否处于"首登强制改密"。
   * null = 尚未确定：硬刷新后 zustand 里没有会话信息，不能就此认定"不是强制"，
   * 否则刷新一下就把门禁绕过去了 —— 所以这里问一次 /auth/me。
   */
  const [forced, setForced] = useState<boolean | null>(() =>
    useAuthStore.getState().mustChangePassword ? true : null,
  )

  // 只在首次登录演这段。读一次 store 即可，不用订阅 —— 它决定的是"开场"，之后不再变
  const [stage, setStage] = useState<'welcome' | 'form'>(() =>
    useAuthStore.getState().mustChangePassword ? 'welcome' : 'form',
  )
  const [leaving, setLeaving] = useState(false)

  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 内存里已确定是强制就不必再问；否则用 /auth/me 校准，失败按"非强制"处理（软门禁，不阻塞用户）
  useEffect(() => {
    if (forced) return
    let alive = true
    fetchMe()
      .then((me) => {
        if (alive) setForced(!!me.mustChangePassword)
      })
      .catch(() => {
        if (alive) setForced(false)
      })
    return () => {
      alive = false
    }
  }, [forced])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (submitting) return

    if (!oldPassword || !newPassword || !confirmPassword) {
      setError('请填写完整')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('两次输入的新密码不一致')
      return
    }
    if (newPassword.length < 8) {
      setError('新密码至少 8 位')
      return
    }
    if (newPassword === oldPassword) {
      setError('新密码不能与原密码相同')
      return
    }

    setSubmitting(true)
    setError(null)
    try {
      await changePassword({ oldPassword, newPassword })

      // 改密后原 refresh token 已全部作废，用新密码重新登录换取新会话
      const username = user?.username
      if (username) {
        const data = await login({ username, password: newPassword })
        setSession(data)
        // 路由门禁读的是 ['me'] 这份缓存：必须同步成新状态，
        // 否则会被判成"仍需改密"，刚改完就被弹回本页
        if (data.user) {
          queryClient.setQueryData(['me'], { ...data.user, mustChangePassword: data.mustChangePassword })
        } else {
          queryClient.invalidateQueries({ queryKey: ['me'] })
        }
        leaveTo('/chat')
        return
      }
      clear()
      leaveTo('/login')
    } catch (err) {
      setError(toApiError(err).message)
      setSubmitting(false)
    }
  }

  /** 先退场再换页：直接 navigate 是硬切。退场期间不复位 submitting，按钮别闪回可点态 */
  function leaveTo(path: string) {
    setLeaving(true)
    window.setTimeout(() => navigate(path, { replace: true }), LEAVE_MS)
  }

  /**
   * 返回上一页。误触「修改密码」时得能退出去 —— 否则这里像个孤岛。
   * 以 /change-password 作为首个页面直接打开时 history 里没有上一条，
   * 此时回对话页兜底（location.key 为 'default' 即首条记录）。
   */
  function goBack() {
    if (location.key && location.key !== 'default') navigate(-1)
    else navigate('/chat', { replace: true })
  }

  return (
    <div
      className={cn(
        'dot-bg relative grid min-h-full place-items-center px-5 py-14',
        'transition-opacity duration-[280ms] ease-in',
        leaving && 'opacity-0',
      )}
    >
      <div className="absolute top-0 left-0 flex items-center gap-2.5 p-[30px]">
        <BrandMark className="size-6 text-accent" />
        <span className="text-[16.5px] font-medium tracking-[0.01em]">WenQu</span>
      </div>

      <div
        className={cn(
          // 与登录卡片同底色（品牌面用的 bg-bg-section）：
          // 登录 → 改密是一气呵成的换页，两张卡片颜色不一样会露馅
          'w-[420px] max-w-[94vw] rounded-2xl border-[1.5px] border-line-edge bg-bg-section p-9',
          'shadow-[var(--shadow-card),var(--face-inner)]',
          'transition-transform duration-[280ms] ease-in',
          leaving && 'scale-[1.04]',
        )}
      >
        {/* 主动改密才给退路；首登强制改密那一次不出现（那是门禁，不是入口）。forced 未确定时先不显示，避免闪一下又消失 */}
        {forced === false && !leaving && (
          <button
            type="button"
            onClick={goBack}
            className="mb-5 inline-flex cursor-pointer items-center gap-0.5 border-0 bg-transparent p-0 text-[14px] text-ink-2 transition-colors hover:text-ink"
          >
            <ChevronLeft className="size-4" />
            返回
          </button>
        )}

        {/*
          两个阶段叠在同一格：卡片外壳（边框、投影、尺寸）自始至终不动，
          变的只是里面的内容 —— 打招呼往上让位，表单从下方接上来。
          格子高度取两者中高的那个，所以从"两行字"切到"一张表"时卡片不会跳高度。
        */}
        <div className="grid">
          {/* ---------- 阶段一：打招呼 ---------- */}
          <div
            inert={stage !== 'welcome'}
            className={cn(
              stageBase,
              'col-start-1 row-start-1 flex flex-col justify-center',
              stage === 'welcome' ? stageShown : stageOutUp,
            )}
          >
            <Typewriter
              lines={GREETING_LINES}
              lineClassNames={GREETING_STYLES}
              interactive={stage === 'welcome'}
              // 逐行门控：一句打完就停住，等用户点一下才出下一句（最后一句同样等点击才交棒）
              stepByClick
              // 27 个字按默认节奏要 4 秒，收紧到每字 56ms
              charDelay={56}
              waitingHint={
                <>
                  轻点继续
                  <ChevronDown className="hint-bob size-3.5" aria-hidden="true" />
                </>
              }
              onDone={() => setStage('form')}
            />
          </div>

          {/* ---------- 阶段二：改密表单 ---------- */}
          <form
            onSubmit={handleSubmit}
            inert={stage !== 'form'}
            className={cn(
              stageBase,
              'col-start-1 row-start-1',
              stage === 'form' ? stageShown : stageOutDown,
            )}
          >
            <p className="mb-1 text-[13.5px] text-ink-3">账号安全</p>
            <h2 className="mb-2 text-[22px] font-medium">修改密码</h2>
            <p className="mb-7 text-[14px] leading-relaxed text-ink-2">
              {user?.mustChangePassword
                ? '当前使用的是初始密码，请修改后再继续使用。'
                : '修改成功后，其他设备的登录状态会同时失效。'}
            </p>

            <div className="mb-4">
              <Label htmlFor="oldPassword" className="mb-1.5 block text-[13.5px] text-ink-2">
                原密码
              </Label>
              <Input
                id="oldPassword"
                type="password"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                autoComplete="current-password"
                className="h-[38px] rounded-sm border-line-strong bg-bg-card px-3 text-[15px] focus-visible:ring-accent/20"
              />
            </div>

            <div className="mb-4">
              <Label htmlFor="newPassword" className="mb-1.5 block text-[13.5px] text-ink-2">
                新密码
              </Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
                className="h-[38px] rounded-sm border-line-strong bg-bg-card px-3 text-[15px] focus-visible:ring-accent/20"
              />
            </div>

            <div className="mb-5">
              <Label htmlFor="confirmPassword" className="mb-1.5 block text-[13.5px] text-ink-2">
                确认新密码
              </Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                className="h-[38px] rounded-sm border-line-strong bg-bg-card px-3 text-[15px] focus-visible:ring-accent/20"
              />
            </div>

            {error && (
              <p
                role="alert"
                className="mb-3 rounded-sm bg-danger-bg px-3 py-2 text-center text-[13.5px] text-danger"
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="h-[44px] w-full cursor-pointer rounded-pill border-0 bg-accent text-[15px] text-on-accent transition-[background,transform,box-shadow] duration-200 hover:-translate-y-px hover:bg-accent-deep hover:shadow-[0_6px_18px_rgba(62,79,42,.26)] disabled:pointer-events-none disabled:opacity-60"
            >
              {submitting ? '提交中…' : '确认修改'}
            </button>
          </form>
        </div>
      </div>

      <ThemeToggle className="absolute right-6 bottom-[22px]" />
    </div>
  )
}

/** 退场时长。要略短于目标页的进场（400ms），两段才接得上、不显得拖沓 */
const LEAVE_MS = 280

/** 两个阶段共用：只动 transform / opacity，走 ease-out，420ms 与路由进场同速 */
const stageBase =
  'transition-[transform,opacity] duration-[420ms] ease-[cubic-bezier(.22,.61,.36,1)]'

/** 当前阶段：归位、不透明 */
const stageShown = 'translate-y-0 opacity-100'
/** 让位到上方（打完招呼的台词） */
const stageOutUp = 'pointer-events-none -translate-y-4 opacity-0'
/** 等待接位（还没轮到的表单） */
const stageOutDown = 'pointer-events-none translate-y-4 opacity-0'
