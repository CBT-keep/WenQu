import { useNavigate } from 'react-router-dom'
import { BrandMark } from '@/components/brand-mark'
import { ThemeToggle } from '@/components/theme-toggle'
import { useAuthStore } from '@/stores/auth'
import { logout } from '@/api/auth'

/**
 * 临时占位页：登录成功后跳转到这里。
 * 真正的对话页 / 修改密码页在后续里程碑实现，这里先把路由闭环跑通。
 */
export default function PlaceholderPage({ title }: { title: string }) {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const clear = useAuthStore((s) => s.clear)

  async function handleLogout() {
    await logout().catch(() => undefined)
    clear()
    navigate('/login', { replace: true })
  }

  return (
    <div className="dot-bg relative grid min-h-full place-items-center px-5">
      <div className="absolute top-0 left-0 flex items-center gap-2.5 p-[30px]">
        <BrandMark className="size-6 text-accent" />
        <span className="text-[15.5px] font-medium">WenQu</span>
      </div>

      <div className="text-center">
        <BrandMark className="mx-auto size-16 text-accent" strokeWidth={1.4} />
        <h1 className="mt-6 font-serif text-[26px] font-medium">{title}</h1>
        <p className="mt-2 text-[13.5px] text-ink-2">
          已登录：{user?.nickname ?? user?.username ?? '—'}（{user?.role ?? '—'}）
        </p>
        <button
          type="button"
          onClick={handleLogout}
          className="mt-8 cursor-pointer rounded-sm border border-line-strong bg-bg-card px-4 py-2 text-[13px] transition-colors hover:border-accent hover:text-accent"
        >
          退出登录
        </button>
      </div>

      <ThemeToggle className="absolute right-6 bottom-[22px]" />
    </div>
  )
}
