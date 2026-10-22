import { useState } from 'react'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Search } from 'lucide-react'
import { Tag } from '@/components/ui/tag'
import { Input } from '@/components/ui/input'
import { Field } from '@/components/ui/field'
import { Select } from '@/components/ui/select'
import { Alert, ErrorBlock, LoadingBlock } from '@/components/ui/feedback'
import { ConfirmModal, Modal } from '@/components/ui/modal'
import { Pagination } from '@/components/ui/pagination'
import { Switch } from '@/components/ui/switch'
import {
  changeUserStatus,
  createUser,
  deleteUser,
  fetchUsers,
  resetUserPassword,
  updateUser,
  type CreateUserResult,
  type ResetPasswordResult,
  type UsersQuery,
} from '@/api/users'
import { toApiError } from '@/lib/http'
import { formatDateTime } from '@/lib/format'
import { ROLE, USER_STATUS } from '@/lib/status'
import { btnGhost, btnPrimary, inputCls, rowBtn, rowBtnDanger, tagColXl } from '@/lib/styles'
import type { UserInfo } from '@/types'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'
import { cn } from '@/lib/utils'

export function UsersPanel() {
  const pushToast = useToastStore((s) => s.push)
  const queryClient = useQueryClient()
  const currentUser = useAuthStore((s) => s.user)

  const [query, setQuery] = useState<UsersQuery>({ page: 1, size: 10, keyword: '', role: '', status: '' })
  const [keywordInput, setKeywordInput] = useState('')

  const [createOpen, setCreateOpen] = useState(false)
  const [editing, setEditing] = useState<UserInfo | null>(null)
  const [resetResult, setResetResult] = useState<ResetPasswordResult | null>(null)
  const [createResult, setCreateResult] = useState<CreateUserResult | null>(null)
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

  const deleteConfirm = confirm?.type === 'delete' ? confirm : null
  const statusConfirm = confirm?.type === 'status' ? confirm : null
  const resetConfirm = confirm?.type === 'reset' ? confirm : null

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <p className="min-w-[240px] flex-1 text-[14px] text-ink-3">
          账号由管理员创建（无开放注册）；超级管理员仅一名且不可创建，SUPERADMIN 可分配 ADMIN / USER。
        </p>
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-ink-4" />
          <Input
            value={keywordInput}
            onChange={(e) => setKeywordInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') setQuery((q) => ({ ...q, keyword: keywordInput.trim(), page: 1 }))
            }}
            placeholder="搜索用户名 / 昵称"
            className="h-9 w-52 rounded-md border-line-strong bg-bg-card pl-8 text-[14px]"
          />
        </div>
        <Select
          wrapperClassName="w-32"
          className="h-9"
          value={query.role}
          onChange={(e) => setQuery((q) => ({ ...q, role: e.target.value, page: 1 }))}
        >
          <option value="">全部角色</option>
          <option value="USER">USER</option>
          <option value="ADMIN">ADMIN</option>
          <option value="SUPERADMIN">SUPERADMIN</option>
        </Select>
        <Select
          wrapperClassName="w-28"
          className="h-9"
          value={query.status}
          onChange={(e) => setQuery((q) => ({ ...q, status: e.target.value, page: 1 }))}
        >
          <option value="">全部状态</option>
          <option value="ENABLED">启用</option>
          <option value="DISABLED">禁用</option>
        </Select>
        <button type="button" className={btnPrimary} onClick={() => setCreateOpen(true)}>
          <Plus className="size-4" />
          新建用户
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-line bg-bg-card">
        <table className="w-full min-w-[860px] text-left text-[14px]">
          <thead>
            <tr>
              {['用户名', '昵称', '邮箱', '角色', '状态', '最后登录', '创建时间', ''].map((h) => (
                <th
                  key={h}
                  className={cn(
                    'border-b border-line bg-bg-section px-4 py-2.5 text-[13px] font-medium whitespace-nowrap text-ink-3',
                    h === '' && 'text-right',
                  )}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data?.records.map((u) => {
              const role = ROLE[u.role] ?? ROLE.USER
              const st = USER_STATUS[u.status] ?? USER_STATUS.ENABLED
              // 自锁保护：自己只能改资料/改密码；重置密码对 SUPERADMIN 一律隐藏（防新密码丢失自锁）
              const isSelf = currentUser?.id === u.id
              const resetBlocked = isSelf || u.role === 'SUPERADMIN'
              return (
                <tr key={u.id} className="border-b border-line last:border-0 hover:bg-bg-hover/60">
                  <td className="px-4 py-3 font-medium text-ink">{u.username}</td>
                  <td className="px-4 py-3 text-ink-2">{u.nickname ?? '—'}</td>
                  <td className="px-4 py-3 text-ink-2">{u.email ?? '—'}</td>
                  <td className="px-4 py-3">
                    <Tag tone={role.tone} className={tagColXl}>
                      {role.label}
                    </Tag>
                  </td>
                  <td className="px-4 py-3">
                    <Tag tone={st.tone}>{st.label}</Tag>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-ink-3">{formatDateTime(u.lastLoginAt)}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-ink-3">{formatDateTime(u.createdAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-0.5 whitespace-nowrap">
                      <button type="button" className={rowBtn} onClick={() => setEditing(u)}>
                        编辑
                      </button>
                      {!resetBlocked && (
                        <button
                          type="button"
                          className={rowBtn}
                          onClick={() => setConfirm({ type: 'reset', user: u })}
                        >
                          重置密码
                        </button>
                      )}
                      {!isSelf && (
                        <>
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
                            className={rowBtnDanger}
                            onClick={() => setConfirm({ type: 'delete', user: u })}
                          >
                            删除
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {isLoading && <LoadingBlock />}
        {error && <ErrorBlock message={toApiError(error).message} />}
        {!isLoading && !error && data?.records.length === 0 && (
          <div className="py-10 text-center text-[13.5px] text-ink-3">没有符合条件的用户</div>
        )}
      </div>

      {data && data.total > 0 && (
        <Pagination
          className="mt-4"
          page={data.page}
          pages={data.pages}
          total={data.total}
          label="个用户"
          onPage={(p) => setQuery((q) => ({ ...q, page: p }))}
        />
      )}

      {createOpen && (
        <UserFormModal mode="create" onClose={() => setCreateOpen(false)} onCreated={setCreateResult} />
      )}
      {editing && <UserFormModal key={editing.id} mode="edit" user={editing} onClose={() => setEditing(null)} />}

      {createResult?.tempPassword && (
        <TempPasswordModal
          title="用户已创建 · 初始密码"
          username={createResult.user.username}
          password={createResult.tempPassword}
          note={`${createResult.user.username} 首次登录需使用该密码并强制修改。请妥善保存，该密码不会再次显示。`}
          onClose={() => setCreateResult(null)}
        />
      )}

      {resetResult && (
        <TempPasswordModal
          title="密码已重置"
          username={resetResult.username}
          password={resetResult.newPassword}
          note={`${resetResult.username} 已被强制下线，首次登录需修改密码。`}
          onClose={() => setResetResult(null)}
        />
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
            <>确定恢复 <b>{statusConfirm?.user.username}</b> 的登录权限吗？</>
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

/** 一次性明文密码弹窗：创建（随机初始密码）与重置密码共用，明文只显示这一次 */
function TempPasswordModal({
  title,
  username,
  password,
  note,
  onClose,
}: {
  title: string
  username: string
  password: string
  note: string
  onClose: () => void
}) {
  const pushToast = useToastStore((s) => s.push)
  return (
    <Modal
      open
      onClose={onClose}
      title={title}
      width="max-w-[400px]"
      footer={
        <button type="button" className={btnPrimary} onClick={onClose}>
          完成
        </button>
      }
    >
      <p className="text-[14px] leading-relaxed text-ink-2">
        请将密码告知 <b>{username}</b>。出于安全考虑，它只会明文显示这一次：
      </p>
      <div className="mt-3 flex items-center justify-between rounded-lg border border-line-strong bg-bg-section px-3 py-2.5">
        <code className="text-[15px] font-medium text-ink">{password}</code>
        <button
          type="button"
          className={rowBtn}
          onClick={() => {
            navigator.clipboard?.writeText(password).catch(() => undefined)
            pushToast('已复制到剪贴板')
          }}
        >
          复制
        </button>
      </div>
      <p className="mt-2 text-[12.5px] text-ink-3">{note}</p>
    </Modal>
  )
}

function UserFormModal({
  mode,
  user,
  onClose,
  onCreated,
}: {
  mode: 'create' | 'edit'
  user?: UserInfo
  onClose: () => void
  /** 创建成功且生成了随机初始密码时回调，供父级弹出一次性明文弹窗 */
  onCreated?: (res: CreateUserResult) => void
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
    mustChangePassword: false,
  })
  const [formError, setFormError] = useState<string | null>(null)

  // 初始密码留空 → 自动生成随机密码，首次登录必须改密（开关锁定开启）
  const passwordBlank = form.password.trim().length === 0
  // 超管唯一且不可创建/晋升/变更（编辑超管本人时角色锁定）
  const roleLocked = isEdit && user?.role === 'SUPERADMIN'

  const submitMut = useMutation<UserInfo | CreateUserResult, Error, void>({
    mutationFn: () =>
      isEdit
        ? updateUser(user!.id, {
            nickname: form.nickname,
            email: form.email,
            // 超管本人角色不可变更，且后端仅接受 USER / ADMIN，不回传 role
            role: user?.role === 'SUPERADMIN' ? undefined : form.role,
          })
        : createUser({
            username: form.username.trim(),
            password: passwordBlank ? undefined : form.password,
            mustChangePassword: passwordBlank ? true : form.mustChangePassword,
            nickname: form.nickname || undefined,
            email: form.email || undefined,
            role: form.role,
          }),
    onSuccess: (res) => {
      if (isEdit) {
        pushToast('已保存')
      } else {
        const created = res as CreateUserResult
        if (created.tempPassword) {
          pushToast('用户已创建，已生成随机初始密码')
          onCreated?.(created)
        } else {
          pushToast(form.mustChangePassword ? '用户已创建，该用户首次登录需修改密码' : '用户已创建')
        }
      }
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
      // 密码选填：留空自动生成随机密码；填写时才校验强度
      if (!passwordBlank && !/^(?=.*[A-Za-z])(?=.*\d).{8,64}$/.test(form.password.trim())) {
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
      width="max-w-[480px]"
      footer={
        <>
          <button type="button" className={btnGhost} onClick={onClose}>
            取消
          </button>
          <button type="button" className={btnPrimary} disabled={submitMut.isPending} onClick={handleSubmit}>
            {submitMut.isPending ? '提交中…' : isEdit ? '保存' : '创建'}
          </button>
        </>
      }
    >
      <div className="max-h-[58vh] space-y-5 overflow-y-auto pr-1">
        {!isEdit && (
          <>
            <Field label="用户名" required>
              <Input
                value={form.username}
                onChange={set('username')}
                placeholder="4-64 位字母、数字或下划线"
                autoComplete="off"
                className={inputCls}
              />
            </Field>
            {/* 初始密码 + 强制改密开关作为一个整体，与上下字段拉开距离 */}
            <div className="space-y-2">
              <Field label="初始密码">
                <Input
                  type="password"
                  value={form.password}
                  onChange={set('password')}
                  placeholder="留空则自动生成；8-64 位，需含字母与数字"
                  autoComplete="new-password"
                  className={inputCls}
                />
              </Field>
              {/* 说明与开关：随输入框文字起点缩进，字号弱化 */}
              <div className="space-y-1.5 pl-3">
                <p className="text-[11.5px] text-ink-3">
                  {passwordBlank
                    ? '留空自动生成随机密码（明文仅显示一次），首次登录必须修改'
                    : '已填写密码，默认无需强制修改，可按需开启'}
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-[12px] text-ink-3">首次登录强制修改密码</span>
                  <Switch
                    checked={passwordBlank || form.mustChangePassword}
                    disabled={passwordBlank}
                    onChange={(v) => setForm((f) => ({ ...f, mustChangePassword: v }))}
                    aria-label="首次登录强制修改密码"
                  />
                </div>
              </div>
            </div>
          </>
        )}
        <Field label="昵称">
          <Input value={form.nickname} onChange={set('nickname')} placeholder="显示名称（可选）" className={inputCls} />
        </Field>
        <Field label="邮箱">
          <Input value={form.email} onChange={set('email')} placeholder="name@example.com（可选）" className={inputCls} />
        </Field>
        <Field
          label="角色"
          required
          hint={
            roleLocked ? <span className="block pl-3 text-[11.5px]">超级管理员角色不可变更</span> : undefined
          }
        >
          <Select value={form.role} onChange={set('role')} disabled={roleLocked}>
            {/* 超管仅展示当前角色（不可创建、不可晋升、不可变更） */}
            {roleLocked && <option value="SUPERADMIN">SUPERADMIN — 超级管理员</option>}
            <option value="USER">USER — 普通用户</option>
            <option value="ADMIN">ADMIN — 管理员</option>
          </Select>
        </Field>
        {formError && <Alert tone="error">{formError}</Alert>}
      </div>
    </Modal>
  )
}

function cleanQuery(q: UsersQuery): UsersQuery {
  return {
    page: q.page,
    size: q.size,
    ...(q.keyword ? { keyword: q.keyword } : {}),
    ...(q.role ? { role: q.role } : {}),
    ...(q.status ? { status: q.status } : {}),
  }
}
