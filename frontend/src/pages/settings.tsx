import { useState } from 'react'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, Plus, Search } from 'lucide-react'
import { ConfirmModal, Modal } from '@/components/ui/modal'
import { Tag, type TagTone } from '@/components/ui/tag'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  changeUserStatus,
  createUser,
  deleteUser,
  fetchUsers,
  resetUserPassword,
  updateUser,
  type ResetPasswordResult,
  type UsersQuery,
} from '@/api/users'
import { toApiError } from '@/lib/http'
import type { UserInfo } from '@/types/auth'
import { useToastStore } from '@/stores/toast'
import { cn } from '@/lib/utils'

/**
 * 设置页 —— 用户管理先行（doc/04 §3.7-3.10）。
 * 其余 tab 是占位：模型配置、系统参数、操作日志在后续里程碑开放。
 */

type SettingsTab = 'users' | 'models' | 'system' | 'logs'

const TABS: { key: SettingsTab; label: string }[] = [
  { key: 'users', label: '用户管理' },
  { key: 'models', label: '模型配置' },
  { key: 'system', label: '系统参数' },
  { key: 'logs', label: '操作日志' },
]

/** 业务调色映射（本页私有；Tag 组件自身不带业务语义） */
const ROLE_TAG_TONE: Record<string, TagTone> = {
  SUPERADMIN: 'accent',
  ADMIN: 'amber',
  USER: 'gray',
}
const STATUS_TAG_TONE: Record<string, TagTone> = {
  ENABLED: 'green',
  DISABLED: 'red',
}

export default function SettingsPage() {
  const [tab, setTab] = useState<SettingsTab>('users')

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex h-14 flex-none items-center border-b border-line px-6">
        <div>
          <h1 className="text-[16px] font-medium">设置</h1>
          <p className="mt-0.5 text-[12px] text-ink-3">系统管理与模型配置</p>
        </div>
      </header>

      <div className="flex flex-none gap-1 border-b border-line px-6">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            className={cn(
              '-mb-px border-b-2 px-3 py-2.5 text-[13.5px] transition-colors',
              tab === t.key
                ? 'border-accent font-medium text-ink'
                : 'border-transparent text-ink-3 hover:text-ink',
            )}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-6">
        {tab === 'users' ? <UsersPanel /> : <ComingSoonPanel tab={tab} />}
      </div>
    </div>
  )
}

// ============================================================ 用户管理

function UsersPanel() {
  const pushToast = useToastStore((s) => s.push)
  const queryClient = useQueryClient()

  const [query, setQuery] = useState<UsersQuery>({ page: 1, size: 10, keyword: '', role: '', status: '' })
  const [keywordInput, setKeywordInput] = useState('')

  const [createOpen, setCreateOpen] = useState(false)
  const [editing, setEditing] = useState<UserInfo | null>(null)
  const [resetResult, setResetResult] = useState<ResetPasswordResult | null>(null)
  const [confirm, setConfirm] = useState<
    | { type: 'delete'; user: UserInfo }
    | { type: 'status'; user: UserInfo; next: 'ENABLED' | 'DISABLED' }
    | { type: 'reset'; user: UserInfo }
    | null
  >(null)

  const { data, isLoading, error } = useQuery({
    queryKey: ['users', query],
    queryFn: () => fetchUsers(cleanQuery(query)),
    placeholderData: keepPreviousData,
  })

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['users'] })

  const deleteMut = useMutation({
    mutationFn: deleteUser,
    onSuccess: () => {
      pushToast('用户已删除')
      setConfirm(null)
      invalidate()
    },
    onError: (e) => pushToast(toApiError(e).message),
  })
  const statusMut = useMutation({
    mutationFn: (vars: { id: number; status: string }) => changeUserStatus(vars.id, vars.status),
    onSuccess: (_d, vars) => {
      pushToast(vars.status === 'DISABLED' ? '已禁用并强制下线' : '已启用')
      setConfirm(null)
      invalidate()
    },
    onError: (e) => pushToast(toApiError(e).message),
  })
  const resetMut = useMutation({
    mutationFn: (user: UserInfo) => resetUserPassword(user.id),
    onSuccess: (res) => {
      setConfirm(null)
      setResetResult(res)
      invalidate()
    },
    onError: (e) => pushToast(toApiError(e).message),
  })

  function applyKeyword() {
    setQuery((q) => ({ ...q, keyword: keywordInput.trim(), page: 1 }))
  }

  const deleteConfirm = confirm?.type === 'delete' ? confirm : null
  const statusConfirm = confirm?.type === 'status' ? confirm : null
  const resetConfirm = confirm?.type === 'reset' ? confirm : null

  return (
    <div className="mx-auto max-w-[960px]">
      {/* 工具条 */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-ink-4" />
          <Input
            value={keywordInput}
            onChange={(e) => setKeywordInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') applyKeyword()
            }}
            placeholder="搜索用户名 / 昵称"
            className="h-9 w-56 rounded-md border-line-strong bg-bg-card pl-8 text-[13px] focus-visible:ring-accent/20"
          />
        </div>
        <select
          className={selectCls}
          value={query.role}
          onChange={(e) => setQuery((q) => ({ ...q, role: e.target.value, page: 1 }))}
        >
          <option value="">全部角色</option>
          <option value="USER">USER</option>
          <option value="ADMIN">ADMIN</option>
          <option value="SUPERADMIN">SUPERADMIN</option>
        </select>
        <select
          className={selectCls}
          value={query.status}
          onChange={(e) => setQuery((q) => ({ ...q, status: e.target.value, page: 1 }))}
        >
          <option value="">全部状态</option>
          <option value="ENABLED">启用</option>
          <option value="DISABLED">禁用</option>
        </select>
        <button type="button" className={cn(primaryBtn, 'ml-auto')} onClick={() => setCreateOpen(true)}>
          <Plus className="size-4" />
          新建用户
        </button>
      </div>

      {/* 表格 */}
      <div className="overflow-x-auto rounded-xl border border-line bg-bg-card">
        <table className="w-full min-w-[860px] text-left text-[13px]">
          <thead>
            <tr className="border-b border-line bg-bg-section text-[12px] text-ink-3">
              <th className="px-4 py-2.5 font-medium">用户名</th>
              <th className="px-4 py-2.5 font-medium">昵称</th>
              <th className="px-4 py-2.5 font-medium">邮箱</th>
              <th className="px-4 py-2.5 font-medium">角色</th>
              <th className="px-4 py-2.5 font-medium">状态</th>
              <th className="px-4 py-2.5 font-medium">最后登录</th>
              <th className="px-4 py-2.5 font-medium">创建时间</th>
              <th className="px-4 py-2.5 text-right font-medium">操作</th>
            </tr>
          </thead>
          <tbody>
            {data?.records.map((u) => (
              <tr key={u.id} className="border-b border-line last:border-0 hover:bg-bg-hover/60">
                <td className="px-4 py-3 font-medium">{u.username}</td>
                <td className="px-4 py-3 text-ink-2">{u.nickname ?? '—'}</td>
                <td className="px-4 py-3 text-ink-2">{u.email ?? '—'}</td>
                <td className="px-4 py-3">
                  <Tag tone={ROLE_TAG_TONE[u.role]}>{u.role}</Tag>
                </td>
                <td className="px-4 py-3">
                  <Tag tone={STATUS_TAG_TONE[u.status]}>
                    {u.status === 'ENABLED' ? '启用' : '禁用'}
                  </Tag>
                </td>
                <td className="px-4 py-3 text-ink-3">{fmtDateTime(u.lastLoginAt)}</td>
                <td className="px-4 py-3 text-ink-3">{fmtDateTime(u.createdAt)}</td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-0.5">
                    <button type="button" className={rowBtn} onClick={() => setEditing(u)}>
                      编辑
                    </button>
                    <button
                      type="button"
                      className={rowBtn}
                      onClick={() => setConfirm({ type: 'reset', user: u })}
                    >
                      重置密码
                    </button>
                    <button
                      type="button"
                      className={rowBtn}
                      onClick={() =>
                        setConfirm({
                          type: 'status',
                          user: u,
                          next: u.status === 'ENABLED' ? 'DISABLED' : 'ENABLED',
                        })
                      }
                    >
                      {u.status === 'ENABLED' ? '禁用' : '启用'}
                    </button>
                    <button
                      type="button"
                      className={cn(rowBtn, 'hover:text-danger')}
                      onClick={() => setConfirm({ type: 'delete', user: u })}
                    >
                      删除
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {isLoading && <div className="py-10 text-center text-[12.5px] text-ink-3">加载中…</div>}
        {error && (
          <div className="py-10 text-center text-[12.5px] text-danger">{toApiError(error).message}</div>
        )}
        {!isLoading && !error && data?.records.length === 0 && (
          <div className="py-10 text-center text-[12.5px] text-ink-3">没有符合条件的用户</div>
        )}
      </div>

      {/* 分页 */}
      <div className="mt-4 flex items-center justify-between text-[12.5px] text-ink-3">
        <span>共 {data?.total ?? 0} 个用户</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className={pageBtn}
            disabled={!data || data.page <= 1}
            onClick={() => setQuery((q) => ({ ...q, page: q.page - 1 }))}
          >
            <ChevronLeft className="size-4" />
            上一页
          </button>
          <span>
            第 {data?.page ?? 1} / {data?.pages ?? 1} 页
          </span>
          <button
            type="button"
            className={pageBtn}
            disabled={!data || data.page >= data.pages}
            onClick={() => setQuery((q) => ({ ...q, page: q.page + 1 }))}
          >
            下一页
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>

      {/* 弹窗区：按条件渲染 = 打开即挂载，关闭即卸载，表单状态天然干净 */}
      {createOpen && <UserFormModal mode="create" onClose={() => setCreateOpen(false)} />}
      {editing && (
        <UserFormModal key={editing.id} mode="edit" user={editing} onClose={() => setEditing(null)} />
      )}

      {resetResult && (
        <Modal
          open
          onClose={() => setResetResult(null)}
          title="密码已重置"
          width="max-w-[400px]"
          footer={
            <button type="button" className={primaryBtn} onClick={() => setResetResult(null)}>
              完成
            </button>
          }
        >
          <p className="text-[13px] leading-relaxed text-ink-2">
            请将新密码告知用户。出于安全考虑，它只会明文显示这一次：
          </p>
          <div className="mt-3 flex items-center justify-between rounded-lg border border-line-strong bg-bg-section px-3 py-2.5">
            <code className="text-[14px] font-medium">{resetResult.newPassword}</code>
            <button
              type="button"
              className={rowBtn}
              onClick={() => {
                navigator.clipboard?.writeText(resetResult.newPassword).catch(() => undefined)
                pushToast('已复制到剪贴板')
              }}
            >
              复制
            </button>
          </div>
          <p className="mt-2 text-[11.5px] text-ink-3">
            {resetResult.username} 已被强制下线，首次登录需修改密码。
          </p>
        </Modal>
      )}

      <ConfirmModal
        open={!!deleteConfirm}
        onClose={() => setConfirm(null)}
        onConfirm={() => deleteConfirm && deleteMut.mutate(deleteConfirm.user.id)}
        title="删除用户"
        description={
          <>
            确定删除用户 <b>{deleteConfirm?.user.username}</b> 吗？该操作不可恢复，其创建的知识库、数据源与会话将一并删除。
          </>
        }
        confirmText="删除"
        danger
        loading={deleteMut.isPending}
      />
      <ConfirmModal
        open={!!statusConfirm}
        onClose={() => setConfirm(null)}
        onConfirm={() => statusConfirm && statusMut.mutate({ id: statusConfirm.user.id, status: statusConfirm.next })}
        title={statusConfirm?.next === 'DISABLED' ? '禁用用户' : '启用用户'}
        description={
          statusConfirm?.next === 'DISABLED' ? (
            <>
              禁用后 <b>{statusConfirm.user.username}</b> 将被立即下线，且无法再登录。
            </>
          ) : (
            <>
              确定恢复 <b>{statusConfirm?.user.username}</b> 的登录权限吗？
            </>
          )
        }
        confirmText={statusConfirm?.next === 'DISABLED' ? '禁用' : '启用'}
        danger={statusConfirm?.next === 'DISABLED'}
        loading={statusMut.isPending}
      />
      <ConfirmModal
        open={!!resetConfirm}
        onClose={() => setConfirm(null)}
        onConfirm={() => resetConfirm && resetMut.mutate(resetConfirm.user)}
        title="重置密码"
        description={
          <>
            将为 <b>{resetConfirm?.user.username}</b> 生成一个随机临时密码。该用户会被强制下线、首次登录需修改密码。继续吗？
          </>
        }
        confirmText="重置密码"
        loading={resetMut.isPending}
      />
    </div>
  )
}

// ============================================================ 新建 / 编辑 用户表单

function UserFormModal({
  mode,
  user,
  onClose,
}: {
  mode: 'create' | 'edit'
  user?: UserInfo
  onClose: () => void
}) {
  const pushToast = useToastStore((s) => s.push)
  const queryClient = useQueryClient()
  const isEdit = mode === 'edit'

  const [form, setForm] = useState({
    username: user?.username ?? '',
    password: '',
    nickname: user?.nickname ?? '',
    email: user?.email ?? '',
    role: user?.role ?? 'USER',
  })
  const [formError, setFormError] = useState<string | null>(null)

  const submitMut = useMutation({
    mutationFn: () =>
      isEdit
        ? updateUser(user!.id, {
            nickname: form.nickname || undefined,
            email: form.email || undefined,
            role: form.role,
          })
        : createUser({
            username: form.username.trim(),
            password: form.password,
            nickname: form.nickname || undefined,
            email: form.email || undefined,
            role: form.role,
          }),
    onSuccess: () => {
      pushToast(isEdit ? '已保存' : '用户已创建，首次登录需修改密码')
      queryClient.invalidateQueries({ queryKey: ['users'] })
      onClose()
    },
    onError: (e) => setFormError(toApiError(e).message),
  })

  function validate(): boolean {
    if (!isEdit) {
      if (!/^[a-zA-Z0-9_]{4,64}$/.test(form.username.trim())) {
        setFormError('用户名需为 4-64 位字母、数字或下划线')
        return false
      }
      if (!/^(?=.*[A-Za-z])(?=.*\d).{8,64}$/.test(form.password)) {
        setFormError('密码需 8-64 位，且同时包含字母与数字')
        return false
      }
    }
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      setFormError('邮箱格式不正确')
      return false
    }
    return true
  }

  function handleSubmit() {
    setFormError(null)
    if (!validate()) return
    submitMut.mutate()
  }

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }))

  return (
    <Modal
      open
      onClose={onClose}
      title={isEdit ? `编辑用户 · ${user?.username}` : '新建用户'}
      footer={
        <>
          <button type="button" className={ghostBtn} onClick={onClose}>
            取消
          </button>
          <button
            type="button"
            className={primaryBtn}
            disabled={submitMut.isPending}
            onClick={handleSubmit}
          >
            {submitMut.isPending ? '提交中…' : isEdit ? '保存' : '创建'}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        {!isEdit && (
          <>
            <Field label="用户名" required>
              <Input
                value={form.username}
                onChange={set('username')}
                placeholder="4-64 位字母、数字或下划线"
                autoComplete="off"
                className={fieldCls}
              />
            </Field>
            <Field label="初始密码" required>
              <Input
                type="password"
                value={form.password}
                onChange={set('password')}
                placeholder="8-64 位，需含字母与数字"
                autoComplete="new-password"
                className={fieldCls}
              />
              <p className="mt-1 text-[11.5px] text-ink-3">创建后该用户首次登录将被强制修改密码</p>
            </Field>
          </>
        )}
        <Field label="昵称">
          <Input value={form.nickname} onChange={set('nickname')} placeholder="显示名称（可选）" className={fieldCls} />
        </Field>
        <Field label="邮箱">
          <Input value={form.email} onChange={set('email')} placeholder="name@example.com（可选）" className={fieldCls} />
        </Field>
        <Field label="角色" required>
          <select className={cn(fieldCls, 'h-9')} value={form.role} onChange={set('role')}>
            <option value="USER">USER — 普通用户</option>
            <option value="ADMIN">ADMIN — 管理员</option>
            <option value="SUPERADMIN">SUPERADMIN — 超级管理员</option>
          </select>
        </Field>
        {formError && (
          <p role="alert" className="rounded-md bg-danger-bg px-3 py-2 text-[12.5px] text-danger">
            {formError}
          </p>
        )}
      </div>
    </Modal>
  )
}

function Field({
  label,
  required,
  children,
}: {
  label: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div>
      <Label className="mb-1.5 block text-[12.5px] text-ink-2">
        {label}
        {required && <span className="ml-0.5 text-danger">*</span>}
      </Label>
      {children}
    </div>
  )
}

function ComingSoonPanel({ tab }: { tab: SettingsTab }) {
  const name = TABS.find((t) => t.key === tab)?.label
  return (
    <div className="flex h-48 flex-col items-center justify-center gap-2 text-center">
      <p className="text-[13.5px] text-ink-2">{name}模块开发中</p>
      <p className="text-[12px] text-ink-3">将在后续里程碑开放</p>
    </div>
  )
}

// ============================================================ 工具

function cleanQuery(q: UsersQuery): UsersQuery {
  return {
    page: q.page,
    size: q.size,
    ...(q.keyword ? { keyword: q.keyword } : {}),
    ...(q.role ? { role: q.role } : {}),
    ...(q.status ? { status: q.status } : {}),
  }
}

/** 两种时间格式（UTC Z / +08:00）统一解析成本地时间显示，规避后端偏移不一致的展示问题 */
function fmtDateTime(s?: string | null) {
  if (!s) return '—'
  const d = new Date(s)
  if (Number.isNaN(d.getTime())) return s
  return d.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

const selectCls =
  'h-9 cursor-pointer rounded-md border border-line-strong bg-bg-card px-2.5 text-[13px] text-ink-2 outline-none transition-colors hover:border-accent-soft focus:border-accent'

const primaryBtn =
  'inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-md border-0 bg-accent px-3.5 text-[13px] text-on-accent transition-[background,transform] duration-200 hover:-translate-y-px hover:bg-accent-deep disabled:pointer-events-none disabled:opacity-60'

const ghostBtn =
  'h-9 cursor-pointer rounded-md border border-line-strong bg-bg-card px-4 text-[13px] text-ink-2 transition-colors hover:border-accent-soft hover:text-ink'

const rowBtn =
  'cursor-pointer rounded-md border-0 bg-transparent px-2 py-1 text-[12.5px] text-ink-2 transition-colors hover:bg-bg-hover hover:text-ink'

const pageBtn =
  'inline-flex h-8 cursor-pointer items-center gap-0.5 rounded-md border border-line-strong bg-bg-card px-2.5 text-[12.5px] text-ink-2 transition-colors hover:border-accent-soft disabled:pointer-events-none disabled:opacity-50'

const fieldCls = 'h-9 rounded-md border-line-strong bg-bg-card px-3 text-[13px] focus-visible:ring-accent/20'
