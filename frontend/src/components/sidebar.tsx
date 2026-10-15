import { useNavigate } from 'react-router-dom'
import {
  BarChart3,
  Database,
  LibraryBig,
  LogOut,
  MessageCirclePlus,
  PanelLeft,
  Search,
  Settings2,
} from 'lucide-react'
import { BrandMark } from '@/components/brand-mark'
import { logout } from '@/api/auth'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'

/**
 * 应用侧边栏 —— 布局参照 doc/prototype/wenqu-prototype.html 的 .sidebar，
 * 配色走 v3 暖色令牌（--bg-sidebar / --accent）。
 *
 * 会话列表、知识库等模块的后端还没就绪：入口先挂 toast 占位，
 * 结构留在原地，接口通了把 onClick 换成真导航即可。
 */
export function Sidebar() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const clear = useAuthStore((s) => s.clear)
  const pushToast = useToastStore((s) => s.push)

  const comingSoon = (name: string) => () => pushToast(`${name}模块开发中，敬请期待`)

  async function handleLogout() {
    await logout().catch(() => undefined)
    clear()
    navigate('/login', { replace: true })
  }

  const displayName = user?.nickname ?? user?.username ?? '—'

  return (
    <aside className="flex h-full w-[236px] flex-none select-none flex-col border-r border-line bg-bg-sidebar">
      {/* 品牌 */}
      <div className="flex h-12 flex-none items-center gap-2 px-4 pt-1">
        <BrandMark className="size-5 text-accent" />
        <span className="text-[15px] font-medium tracking-[0.01em]">WenQu</span>
        <div className="ml-auto flex items-center">
          <button type="button" className={iconBtn} title="搜索会话" onClick={comingSoon('会话搜索')}>
            <Search className="size-[15px]" />
          </button>
          <button type="button" className={iconBtn} title="折叠侧栏" onClick={comingSoon('侧栏折叠')}>
            <PanelLeft className="size-[15px]" />
          </button>
        </div>
      </div>

      {/* 新建对话 */}
      <div className="flex-none px-3 pt-2">
        <button type="button" className={newChatBtn} onClick={() => navigate('/chat')}>
          <MessageCirclePlus className="size-4" />
          新建对话
        </button>
      </div>

      {/* 最近会话（后端未就绪，先给空态） */}
      <div className="flex min-h-0 flex-1 flex-col px-3 pt-4">
        <div className="px-2 pb-2 text-[12px] font-medium text-ink-3">最近会话</div>
        <div className="flex flex-1 flex-col items-center justify-center gap-1.5 px-4 text-center">
          <p className="text-[12.5px] text-ink-3">还没有会话</p>
          <p className="text-[11.5px] leading-relaxed text-ink-4">
            在下方输入第一个问题，
            <br />
            开始第一段对话
          </p>
        </div>
      </div>

      {/* 底部：模块入口 + 当前用户 */}
      <div className="flex flex-none flex-col gap-0.5 px-3 pb-3 pt-2">
        <button type="button" className={navItem} onClick={comingSoon('知识库')}>
          <LibraryBig className="size-4" />
          知识库
        </button>
        <button type="button" className={navItem} onClick={comingSoon('数据源')}>
          <Database className="size-4" />
          数据源
        </button>
        <button type="button" className={navItem} onClick={comingSoon('仪表盘')}>
          <BarChart3 className="size-4" />
          仪表盘
        </button>
        <button type="button" className={navItem} onClick={() => navigate('/settings')}>
          <Settings2 className="size-4" />
          设置
        </button>

        <div className="mt-1.5 flex h-9 items-center gap-1 rounded-md px-1.5 transition-colors hover:bg-bg-hover">
          <button
            type="button"
            className="flex min-w-0 flex-1 items-center gap-2"
            onClick={() => navigate('/change-password')}
            title="修改密码"
          >
            <span className="grid size-[22px] flex-none place-items-center rounded-full bg-accent text-[11px] font-medium text-on-accent">
              {displayName.slice(0, 1)}
            </span>
            <span className="min-w-0 flex-1 text-left">
              <span className="block truncate text-[13px] leading-tight">{displayName}</span>
              <span className="block text-[10.5px] leading-tight text-ink-3">{user?.role ?? ''}</span>
            </span>
          </button>
          <button
            type="button"
            className="grid size-7 flex-none cursor-pointer place-items-center rounded-md border-0 bg-transparent text-ink-3 transition-colors hover:bg-bg-hover hover:text-danger"
            title="退出登录"
            onClick={handleLogout}
          >
            <LogOut className="size-[15px]" />
          </button>
        </div>
      </div>
    </aside>
  )
}

const iconBtn =
  'grid size-7 cursor-pointer place-items-center rounded-md border-0 bg-transparent text-ink-3 transition-colors hover:bg-bg-hover hover:text-ink'

const newChatBtn =
  'flex h-9 w-full cursor-pointer items-center gap-2 rounded-lg border border-line-strong bg-bg-card px-3 ' +
  'text-[13.5px] font-medium text-accent-deep transition-[border-color,box-shadow,transform] duration-200 ' +
  'hover:-translate-y-px hover:border-accent-soft hover:shadow-[var(--shadow-pop)]'

const navItem =
  'flex h-8 w-full cursor-pointer items-center gap-2.5 rounded-md border-0 bg-transparent px-2.5 ' +
  'text-[13.5px] text-ink-2 transition-colors hover:bg-bg-hover hover:text-ink'
