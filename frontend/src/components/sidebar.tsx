import { useMemo, useState, type ReactNode } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import {
  BarChart3,
  Database,
  LibraryBig,
  LogOut,
  MessageCirclePlus,
  PanelLeft,
  PanelLeftOpen,
  Search,
  Settings2,
} from 'lucide-react'
import { ProfileModal } from '@/components/profile-modal'
import { BrandMark } from '@/components/brand-mark'
import { Tooltip } from '@/components/ui/tooltip'
import { ThemeToggleButton } from '@/components/theme-toggle'
import { logout } from '@/api/auth'
import { useRecentConversations, type ChatConversationEntry } from '@/hooks/use-conversations'
import { formatTime } from '@/lib/format'
import { MODE_META, modeTextClass } from '@/lib/mode'
import { useAuthStore } from '@/stores/auth'
import type { UserRole } from '@/types'
import { cn } from '@/lib/utils'

interface NavEntry {
  to: string
  label: string
  icon: ReactNode
  roles?: UserRole[]
}

const NAV: NavEntry[] = [
  { to: '/kb', label: '知识库', icon: <LibraryBig className="size-4" /> },
  { to: '/sqlbot/datasources', label: '数据源', icon: <Database className="size-4" /> },
  { to: '/dashboard', label: '仪表盘', icon: <BarChart3 className="size-4" />, roles: ['ADMIN', 'SUPERADMIN'] },
  { to: '/settings', label: '设置', icon: <Settings2 className="size-4" />, roles: ['SUPERADMIN'] },
]

/**
 * 应用侧边栏 —— 布局参照 doc/prototype/wenqu-prototype.html 的 .sidebar（Codex 式）。
 * 会话列表占主体，资源入口沉底；配色走 v3 暖色令牌。
 */
export function Sidebar() {
  const [profileOpen, setProfileOpen] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const user = useAuthStore((s) => s.user)
  const clear = useAuthStore((s) => s.clear)

  const [collapsed, setCollapsed] = useState(false)
  const [searching, setSearching] = useState(false)
  const [keyword, setKeyword] = useState('')

  const { entries, isLoading } = useRecentConversations()

  const role = user?.role
  const visibleNav = NAV.filter((n) => !n.roles || (role && n.roles.includes(role)))

  const filtered = useMemo(() => {
    if (!keyword.trim()) return entries
    return entries.filter((e) => e.title.includes(keyword.trim()))
  }, [entries, keyword])

  const groups = useMemo(() => groupByDay(filtered), [filtered])

  async function handleLogout() {
    await logout().catch(() => undefined)
    clear()
    navigate('/login', { replace: true })
  }

  const displayName = user?.nickname ?? user?.username ?? '—'
  const activeConvPath = (mode: 'rag' | 'sql', id: number) => `/chat/${mode}/${id}`

  return (
    <aside
      className={cn(
        'flex h-full flex-none select-none flex-col border-r border-line bg-bg-sidebar transition-[width] duration-200',
        collapsed ? 'w-[56px]' : 'w-[236px]',
      )}
    >
      {/* 品牌 */}
      <div className={cn('flex h-12 flex-none items-center gap-2 pt-1', collapsed ? 'justify-center px-2' : 'px-4')}>
        {collapsed ? (
          /*
            收起态只放一个 40×40 的「Logo ⇄ 展开」按钮：
            56px 宽的栏位减掉左右各 8px 内边距只剩 40px，塞不下 Logo + 按钮两件 ——
            原来两件并排会横向溢出（Logo 被裁、图标顶到边缘），这里合成一件，
            悬浮时 Logo 让位给「展开」图标，点一下即展开。
          */
          <Tooltip label="展开侧栏" className="w-full">
            <button
              type="button"
              aria-label="展开侧栏"
              onClick={() => setCollapsed(false)}
              className="group/expand grid h-10 w-full cursor-pointer place-items-center rounded-lg border-0 bg-transparent text-accent transition-colors hover:bg-bg-hover"
            >
              <BrandMark className="size-5 group-hover/expand:hidden" />
              <PanelLeftOpen className="hidden size-[17px] text-ink-2 group-hover/expand:block" />
            </button>
          </Tooltip>
        ) : (
          <>
            <BrandMark className="size-5 flex-none text-accent" />
            <span className="text-[16px] font-medium tracking-[0.01em]">WenQu</span>
            <div className="ml-auto flex items-center">
              <Tooltip label="搜索会话">
                <button type="button" aria-label="搜索会话" className={iconBtn} onClick={() => setSearching((v) => !v)}>
                  <Search className="size-[15px]" />
                </button>
              </Tooltip>
              <Tooltip label="折叠侧栏">
                <button type="button" aria-label="折叠侧栏" className={iconBtn} onClick={() => setCollapsed(true)}>
                  <PanelLeft className="size-[15px]" />
                </button>
              </Tooltip>
            </div>
          </>
        )}
      </div>

      {/* 新建对话 */}
      <div className={cn('flex-none', collapsed ? 'px-2 pt-2' : 'px-3 pt-2')}>
        {collapsed ? (
          /* Tooltip 外层必须自己撑满：它是 inline-flex、宽度由内容决定，
             不给 w-full 的话里面按钮的 w-full 会退化成图标宽度（就成了竖条） */
          <Tooltip label="新建对话" className="w-full">
            <button type="button" aria-label="新建对话" className={newChatIconBtn} onClick={() => navigate('/chat')}>
              <MessageCirclePlus className="size-[18px]" />
            </button>
          </Tooltip>
        ) : (
          <button type="button" className={newChatBtn} onClick={() => navigate('/chat')}>
            <MessageCirclePlus className="size-4" />
            新建对话
          </button>
        )}
      </div>

      {/* 最近会话 */}
      {collapsed ? (
        <div className="flex-1" />
      ) : (
        <div className="flex min-h-0 flex-1 flex-col px-3 pt-4">
          <div className="flex items-center justify-between px-2 pb-2">
            <span className="text-[13px] font-medium text-ink-3">最近会话</span>
          </div>

          {searching && (
            <div className="relative mb-2">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3 -translate-y-1/2 text-ink-4" />
              <input
                autoFocus
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="筛选会话…"
                className="h-8 w-full rounded-md border border-line-strong bg-bg-card pl-7 pr-2 text-[13.5px] text-ink outline-none focus:border-accent"
              />
            </div>
          )}

          <div className="min-h-0 flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="space-y-1 px-1">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="h-7 animate-pulse rounded-md bg-bg-hover" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-1.5 px-4 py-8 text-center">
                <p className="text-[13.5px] text-ink-3">{keyword ? '没有匹配的会话' : '还没有会话'}</p>
                {!keyword && (
                  <p className="text-[12.5px] leading-relaxed text-ink-4">
                    在下方输入第一个问题，
                    <br />
                    开始第一段对话
                  </p>
                )}
              </div>
            ) : (
              groups.map((group) => (
                <div key={group.label} className="mb-1">
                  <div className="px-2 py-1.5 text-[12px] font-medium text-ink-4">{group.label}</div>
                  <div className="space-y-0.5">
                    {group.items.map((item) => {
                      const active = location.pathname === activeConvPath(item.mode, item.id)
                      const ModeIcon = MODE_META[item.mode].Icon
                      return (
                        <button
                          key={`${item.mode}-${item.id}`}
                          type="button"
                          title={`${item.title} · ${formatTime(item.updatedAt)}`}
                          onClick={() => navigate(activeConvPath(item.mode, item.id))}
                          className={cn(
                            'flex h-[30px] w-full cursor-pointer items-center gap-2 rounded-sm border-0 px-2 text-left text-[14px] transition-colors',
                            active
                              ? 'bg-bg-active font-medium text-ink'
                              : 'bg-transparent text-ink-2 hover:bg-bg-hover hover:text-ink',
                          )}
                        >
                          <ModeIcon className={cn('size-3.5 flex-none', modeTextClass(item.mode))} />
                          <span className="min-w-0 flex-1 truncate">{item.title}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* 底部：模块入口 + 当前用户 */}
      <div className={cn('flex flex-none flex-col gap-0.5 pt-2', collapsed ? 'px-2 pb-3' : 'px-3 pb-3')}>
        {visibleNav.map((item) => {
          const active = location.pathname.startsWith(item.to)
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={cn(
                'flex h-8 w-full items-center gap-2.5 rounded-md px-2.5 text-[14.5px] transition-colors',
                collapsed && 'justify-center px-0',
                active ? 'bg-bg-hover font-medium text-ink' : 'text-ink-2 hover:bg-bg-hover hover:text-ink',
              )}
            >
              {item.icon}
              {!collapsed && item.label}
            </NavLink>
          )
        })}

        {/* 收起态没有用户行的横向空间，主题开关单独占一条图标项（与上方导航同宽同高） */}
        {collapsed && (
          <Tooltip label="切换主题" className="w-full">
            <ThemeToggleButton className={railBtn} />
          </Tooltip>
        )}

        <div className={cn('mt-1.5 flex h-9 items-center gap-1 rounded-md px-1.5 transition-colors hover:bg-bg-hover', collapsed && 'justify-center px-0')}>
          <button
            type="button"
            className={cn('flex min-w-0 flex-1 items-center gap-2', collapsed && 'justify-center')}
            onClick={() => setProfileOpen(true)}
            title="个人资料"
          >
            <span className="grid size-[22px] flex-none place-items-center rounded-full bg-accent text-[12px] font-medium text-on-accent">
              {displayName.slice(0, 1)}
            </span>
            {!collapsed && (
              <span className="min-w-0 flex-1 text-left">
                <span className="block truncate text-[14px] leading-tight">{displayName}</span>
                <span className="block text-[11.5px] leading-tight text-ink-3">{user?.role ?? ''}</span>
              </span>
            )}
          </button>
          {!collapsed && <ThemeToggleButton className={logoutBtn} />}
          {!collapsed && (
            <Tooltip label="退出登录">
              <button type="button" className={logoutBtn} onClick={handleLogout}>
                <LogOut className="size-[15px]" />
              </button>
            </Tooltip>
          )}
        </div>
      </div>
      {profileOpen && <ProfileModal onClose={() => setProfileOpen(false)} />}
    </aside>
  )
}

function groupByDay(entries: ChatConversationEntry[]): { label: string; items: ChatConversationEntry[] }[] {
  const today: ChatConversationEntry[] = []
  const earlier: ChatConversationEntry[] = []
  const now = new Date()
  for (const e of entries) {
    const d = new Date(e.updatedAt)
    const sameDay =
      d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate()
    ;(sameDay ? today : earlier).push(e)
  }
  const result: { label: string; items: ChatConversationEntry[] }[] = []
  if (today.length) result.push({ label: '今天', items: today })
  if (earlier.length) result.push({ label: '更早', items: earlier })
  return result
}

const iconBtn =
  'grid size-7 cursor-pointer place-items-center rounded-md border-0 bg-transparent text-ink-3 transition-colors hover:bg-bg-hover hover:text-ink'

const newChatBtn =
  'flex h-9 w-full cursor-pointer items-center gap-2 rounded-lg border border-line-strong bg-bg-card px-3 ' +
  'text-[14.5px] font-medium text-accent-deep transition-[border-color,box-shadow,transform] duration-200 ' +
  'hover:-translate-y-px hover:border-accent-soft hover:shadow-[var(--shadow-pop)]'

const newChatIconBtn =
  'grid h-10 w-full cursor-pointer place-items-center rounded-lg border border-line-strong bg-bg-card text-accent-deep ' +
  'transition-colors hover:border-accent-soft hover:shadow-[var(--shadow-pop)]'

const logoutBtn =
  'grid size-7 flex-none cursor-pointer place-items-center rounded-md border-0 bg-transparent text-ink-3 transition-colors hover:bg-bg-hover hover:text-danger'

/** 收起态里与导航项同宽同高的图标按钮（主题开关用） */
const railBtn =
  'flex h-8 w-full cursor-pointer items-center justify-center rounded-md border-0 bg-transparent text-ink-2 transition-colors hover:bg-bg-hover hover:text-ink'
