import { useState } from 'react'
import { parseObject } from '@/lib/form-values'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Database, PlugZap, Plus, RefreshCw, Table2, Trash2 } from 'lucide-react'
import { PageHeader, Panel } from '@/components/layout/page'
import { Tag } from '@/components/ui/tag'
import { Input } from '@/components/ui/input'
import { Field } from '@/components/ui/field'
import { Switch } from '@/components/ui/switch'
import { Alert, EmptyState, ErrorBlock, LoadingBlock } from '@/components/ui/feedback'
import { ConfirmModal, Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import {
  createDatasource,
  deleteDatasource,
  fetchDatasources,
  startSchemaSync,
  testDatasource,
  testDatasourceDraft,
  updateDatasource,
} from '@/api/sqlbot'
import { toApiError } from '@/lib/http'
import { formatNumber, formatTime } from '@/lib/format'
import { DATASOURCE_STATUS } from '@/lib/status'
import { btnGhost, btnPrimary, inputCls } from '@/lib/styles'
import type { Datasource, DatasourcePayload } from '@/types'
import { useToastStore } from '@/stores/toast'
import { cn } from '@/lib/utils'

export default function DatasourceListPage() {
  const navigate = useNavigate()
  const pushToast = useToastStore((s) => s.push)
  const queryClient = useQueryClient()

  const [formOpen, setFormOpen] = useState<'create' | Datasource | null>(null)
  const [deleting, setDeleting] = useState<Datasource | null>(null)

  const { data, isLoading, error } = useQuery({
    queryKey: ['datasources', { page: 1, size: 24 }],
    queryFn: () => fetchDatasources({ page: 1, size: 24 }),
  })

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['datasources'] })

  const testMut = useMutation({
    mutationFn: (id: number) => testDatasource(id),
    onSuccess: (res) => {
      pushToast(res.success ? `连接成功 · ${res.latencyMs}ms` : '连接失败')
      invalidate()
    },
    onError: (e) => pushToast(toApiError(e).message),
  })

  const syncMut = useMutation({
    mutationFn: (id: number) => startSchemaSync(id, { includeViews: false }),
    onSuccess: (_res, id) => {
      pushToast('已开始同步 Schema')
      window.setTimeout(() => {
        invalidate()
        queryClient.invalidateQueries({ queryKey: ['tables', id] })
      }, 1800)
    },
    onError: (e) => pushToast(toApiError(e).message),
  })

  const deleteMut = useMutation({
    mutationFn: (id: number) => deleteDatasource(id),
    onSuccess: () => {
      pushToast('数据源已删除')
      setDeleting(null)
      invalidate()
    },
    onError: (e) => pushToast(toApiError(e).message),
  })

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto p-6">
        <PageHeader
          title="数据源管理"
          description="管理 NL2SQL 可连接的 PostgreSQL 数据源，采集并维护 Schema 元数据"
          actions={
            <button type="button" className={btnPrimary} onClick={() => setFormOpen('create')}>
              <Plus className="size-4" />
              添加数据源
            </button>
          }
        />

        <Alert tone="info" className="mb-4">
          建议使用<strong className="mx-1">只读账号</strong>连接业务库；连接信息在库中加密存储，接口永不返回明文密码。
        </Alert>

        {isLoading ? (
          <LoadingBlock />
        ) : error ? (
          <ErrorBlock message={toApiError(error).message} />
        ) : (data?.records.length ?? 0) === 0 ? (
          <Panel>
            <EmptyState
              icon={<Database className="size-5" />}
              title="还没有数据源"
              description="连接一个 PostgreSQL 数据源并同步 Schema，即可用自然语言查询业务数据。"
              action={
                <button type="button" className={btnPrimary} onClick={() => setFormOpen('create')}>
                  <Plus className="size-4" />
                  添加数据源
                </button>
              }
            />
          </Panel>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {data!.records.map((ds) => {
              const st = DATASOURCE_STATUS[ds.status] ?? DATASOURCE_STATUS.UNKNOWN
              return (
                <div key={ds.id} className="rounded-xl border border-line bg-bg-card p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="grid size-10 flex-none place-items-center rounded-lg bg-info-bg text-info">
                        <Database className="size-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-[16px] font-medium text-ink">{ds.name}</div>
                        <div className="mt-0.5 truncate font-mono text-[12.5px] text-ink-3">
                          {ds.host}:{ds.port}/{ds.databaseName} · {ds.schemaName} · {ds.username}
                        </div>
                      </div>
                    </div>
                    <Tag tone={st.tone}>{st.label}</Tag>
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-3 border-t border-line pt-4 text-center">
                    <Stat value={formatNumber(ds.tableCount)} label="表" />
                    <Stat value={formatNumber(ds.columnCount)} label="字段" />
                    <Stat value={ds.lastSyncAt ? formatTime(ds.lastSyncAt) : '—'} label="上次同步" />
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <Button variant="outline" onClick={() => testMut.mutate(ds.id)} disabled={testMut.isPending}>
                      <PlugZap />
                      连接测试
                    </Button>
                    <Button variant="outline" onClick={() => syncMut.mutate(ds.id)} disabled={syncMut.isPending}>
                      <RefreshCw className={cn(syncMut.isPending && 'animate-spin')} />
                      同步 Schema
                    </Button>
                    <Button variant="outline" onClick={() => navigate(`/sqlbot/datasources/${ds.id}/tables`)}>
                      <Table2 />
                      表结构
                    </Button>
                    <Button variant="outline" onClick={() => setFormOpen(ds)}>
                      编辑
                    </Button>
                    <button
                      type="button"
                      title="删除数据源"
                      className="ml-auto grid size-8 cursor-pointer place-items-center rounded-md border-0 bg-transparent text-ink-4 transition-colors hover:bg-danger-bg hover:text-danger"
                      onClick={() => setDeleting(ds)}
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {formOpen && (
        <DatasourceFormModal
          datasource={formOpen === 'create' ? undefined : formOpen}
          onClose={() => setFormOpen(null)}
          onSaved={() => {
            setFormOpen(null)
            invalidate()
          }}
        />
      )}

      <ConfirmModal
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={() => deleting && deleteMut.mutate(deleting.id)}
        title="删除数据源"
        description={
          <>
            确定删除数据源 <b>{deleting?.name}</b> 吗？其表/字段元数据与相关查数会话将一并删除。
          </>
        }
        confirmText="删除"
        danger
        loading={deleteMut.isPending}
      />
    </div>
  )
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <div className="text-[18px] font-medium tabular-nums text-ink">{value}</div>
      <div className="mt-0.5 text-[12px] text-ink-3">{label}</div>
    </div>
  )
}

function DatasourceFormModal({
  datasource,
  onClose,
  onSaved,
}: {
  datasource?: Datasource
  onClose: () => void
  onSaved: () => void
}) {
  const pushToast = useToastStore((s) => s.push)
  const isEdit = !!datasource
  const [form, setForm] = useState<DatasourcePayload>({
    name: datasource?.name ?? '',
    host: datasource?.host ?? '',
    port: datasource?.port ?? 5432,
    databaseName: datasource?.databaseName ?? '',
    schemaName: datasource?.schemaName ?? 'public',
    username: datasource?.username ?? '',
    password: '',
    sslEnabled: datasource?.sslEnabled ?? false,
    poolSize: datasource?.poolSize ?? 5,
    maxRows: datasource?.maxRows ?? 1000,
    timeoutMs: datasource?.timeoutMs ?? 10000,
    enabled: datasource?.enabled ?? true,
  })
  const [testResult, setTestResult] = useState<{ ok: boolean; detail: string } | null>(null)
  const [extraParams, setExtraParams] = useState(JSON.stringify(datasource?.extraParams ?? {}))
  const [formError, setFormError] = useState<string | null>(null)

  const saveMut = useMutation({
    mutationFn: () =>
      isEdit
        ? updateDatasource(datasource!.id, { ...form, extraParams: parseObject(extraParams), password: form.password || undefined })
        : createDatasource({ ...form, extraParams: parseObject(extraParams) }),
    onSuccess: () => {
      pushToast(isEdit ? '已保存' : '数据源已创建，请同步 Schema')
      onSaved()
    },
    onError: (e) => setFormError(toApiError(e).message),
  })

  const testMut = useMutation({
    mutationFn: () =>
      isEdit && !form.password ? testDatasource(datasource!.id) : testDatasourceDraft({ ...form, extraParams: parseObject(extraParams) }),
    onSuccess: (res) =>
      setTestResult({ ok: res.success, detail: res.detail ?? `连接成功 · ${res.latencyMs}ms` }),
    onError: (e) => setTestResult({ ok: false, detail: toApiError(e).message }),
  })

  function submit() {
    setFormError(null)
    try { parseObject(extraParams) } catch { setFormError('高级参数必须是合法的 JSON 对象'); return }
    if (!form.name.trim() || !form.host.trim() || !form.databaseName.trim() || !form.username.trim()) {
      setFormError('请填写名称、主机、数据库与用户名')
      return
    }
    if (!isEdit && !form.password) {
      setFormError('请输入密码')
      return
    }
    saveMut.mutate()
  }

  const set = <K extends keyof DatasourcePayload>(key: K, value: DatasourcePayload[K]) =>
    setForm((f) => ({ ...f, [key]: value }))

  return (
    <Modal
      open
      onClose={onClose}
      title={isEdit ? `编辑数据源 · ${datasource!.name}` : '添加数据源'}
      width="max-w-[560px]"
      footer={
        <>
          <button
            type="button"
            className={cn(btnGhost, 'mr-auto')}
            disabled={testMut.isPending}
            onClick={() => testMut.mutate()}
          >
            <PlugZap className="size-4" />
            连接测试
          </button>
          <button type="button" className={btnGhost} onClick={onClose}>
            取消
          </button>
          <button type="button" className={btnPrimary} disabled={saveMut.isPending} onClick={submit}>
            {saveMut.isPending ? '保存中…' : isEdit ? '保存' : '创建'}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="名称" required>
          <Input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="如：prod-pg-01（生产）" className={inputCls} />
        </Field>
        <div className="grid grid-cols-3 gap-3">
          <Field label="主机" required className="col-span-2">
            <Input value={form.host} onChange={(e) => set('host', e.target.value)} placeholder="10.0.1.11" className={inputCls} />
          </Field>
          <Field label="端口">
            <Input
              type="number"
              value={form.port}
              onChange={(e) => set('port', Number(e.target.value))}
              className={inputCls}
            />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="数据库" required>
            <Input value={form.databaseName} onChange={(e) => set('databaseName', e.target.value)} placeholder="business" className={inputCls} />
          </Field>
          <Field label="Schema">
            <Input value={form.schemaName} onChange={(e) => set('schemaName', e.target.value)} placeholder="public" className={inputCls} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="用户名" required hint="建议只读账号">
            <Input value={form.username} onChange={(e) => set('username', e.target.value)} placeholder="readonly" className={inputCls} />
          </Field>
          <Field label="密码" required={!isEdit} hint={isEdit ? '留空表示不修改' : undefined}>
            <Input
              type="password"
              value={form.password}
              onChange={(e) => set('password', e.target.value)}
              autoComplete="new-password"
              className={inputCls}
            />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="连接池大小">
            <Input type="number" value={form.poolSize} onChange={(e) => set('poolSize', Number(e.target.value))} className={inputCls} />
          </Field>
          <Field label="最大返回行数">
            <Input type="number" value={form.maxRows} onChange={(e) => set('maxRows', Number(e.target.value))} className={inputCls} />
          </Field>
        </div>
        <div className="flex items-center justify-between rounded-md border border-line px-3 py-2.5">
          <span className="text-[14px] text-ink">启用 SSL</span>
          <Switch checked={!!form.sslEnabled} onChange={(v) => set('sslEnabled', v)} aria-label="启用 SSL" />
        </div>

        <Field label="执行超时（ms）"><Input type="number" min={1} value={form.timeoutMs} onChange={(e) => set('timeoutMs', Number(e.target.value))} /></Field>
        <div className="flex items-center justify-between"><span>启用数据源</span><Switch checked={!!form.enabled} onChange={(v) => set('enabled', v)} aria-label="启用数据源" /></div>
        {testResult && (
          <Alert tone={testResult.ok ? 'success' : 'error'}>{testResult.detail}</Alert>
        )}
        <Field label="高级参数（JSON 对象）"><Input value={extraParams} onChange={(e) => setExtraParams(e.target.value)} /></Field>
        {formError && <Alert tone="error">{formError}</Alert>}
      </div>
    </Modal>
  )
}
