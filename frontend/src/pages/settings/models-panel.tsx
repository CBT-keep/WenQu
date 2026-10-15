import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { PlugZap, Plus } from 'lucide-react'
import { Tag } from '@/components/ui/tag'
import { Input } from '@/components/ui/input'
import { Field } from '@/components/ui/field'
import { Select } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Seg } from '@/components/ui/seg'
import { Button } from '@/components/ui/button'
import { Alert, EmptyState, ErrorBlock, LoadingBlock } from '@/components/ui/feedback'
import { ConfirmModal, Modal } from '@/components/ui/modal'
import {
  createModel,
  deleteModel,
  fetchModels,
  setDefaultModel,
  testModel,
  testModelDraft,
  updateModel,
} from '@/api/model'
import { toApiError } from '@/lib/http'
import { MODEL_PROVIDER, MODEL_TYPE_TONE } from '@/lib/status'
import { btnGhost, btnPrimary, inputCls } from '@/lib/styles'
import type { LlmModel, ModelPayload, ModelType, ModelUpdatePayload } from '@/types'
import { useToastStore } from '@/stores/toast'
import { cn } from '@/lib/utils'

const ALL = 'ALL' as const
type Filter = ModelType | typeof ALL

export function ModelsPanel() {
  const pushToast = useToastStore((s) => s.push)
  const queryClient = useQueryClient()
  const [filter, setFilter] = useState<Filter>(ALL)
  const [formOpen, setFormOpen] = useState<'create' | LlmModel | null>(null)
  const [deleting, setDeleting] = useState<LlmModel | null>(null)

  const { data, isLoading, error } = useQuery({
    queryKey: ['models'],
    queryFn: () => fetchModels(),
  })

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['models'] })

  const testMut = useMutation({
    mutationFn: (id: number) => testModel(id),
    onSuccess: (res) => pushToast(res.success ? `连通正常 · ${res.latencyMs}ms` : '连通失败'),
    onError: (e) => pushToast(toApiError(e).message),
  })
  const defaultMut = useMutation({
    mutationFn: (id: number) => setDefaultModel(id),
    onSuccess: () => {
      pushToast('已设为该类型默认')
      invalidate()
    },
    onError: (e) => pushToast(toApiError(e).message),
  })
  const enabledMut = useMutation({
    mutationFn: (vars: { id: number; enabled: boolean }) => updateModel(vars.id, { enabled: vars.enabled }),
    onSuccess: () => invalidate(),
    onError: (e) => pushToast(toApiError(e).message),
  })
  const deleteMut = useMutation({
    mutationFn: (id: number) => deleteModel(id),
    onSuccess: () => {
      pushToast('模型已删除')
      setDeleting(null)
      invalidate()
    },
    onError: (e) => pushToast(toApiError(e).message),
  })

  const models = (data ?? []).filter((m) => filter === ALL || m.type === filter)

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <p className="min-w-[240px] flex-1 text-[14px] text-ink-3">
          多供应商管理，统一走 OpenAI 兼容协议；知识库/会话可指定所用模型。
        </p>
        <Seg
          value={filter}
          onChange={setFilter}
          options={[
            { value: ALL, label: '全部' },
            { value: 'CHAT', label: 'CHAT' },
            { value: 'EMBEDDING', label: 'EMBEDDING' },
            { value: 'RERANK', label: 'RERANK' },
          ]}
        />
        <button type="button" className={btnPrimary} onClick={() => setFormOpen('create')}>
          <Plus className="size-4" />
          添加模型
        </button>
      </div>

      {isLoading ? (
        <LoadingBlock />
      ) : error ? (
        <ErrorBlock message={toApiError(error).message} />
      ) : models.length === 0 ? (
        <div className="rounded-xl border border-line bg-bg-card">
          <EmptyState
            icon={<PlugZap className="size-5" />}
            title="还没有配置模型"
            description="至少配置一个 CHAT 模型（对话）与一个 EMBEDDING 模型（向量化）才能使用核心功能。"
            action={
              <button type="button" className={btnPrimary} onClick={() => setFormOpen('create')}>
                <Plus className="size-4" />
                添加模型
              </button>
            }
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {models.map((m) => (
            <div key={m.id} className="flex flex-col rounded-xl border border-line bg-bg-card p-5">
              <div className="mb-3 flex items-center justify-between gap-2">
                <Tag tone={MODEL_TYPE_TONE[m.type] ?? 'gray'}>{m.type}</Tag>
                {m.isDefault ? <Tag tone="green">默认</Tag> : !m.enabled ? <Tag tone="gray">已禁用</Tag> : <Tag tone="gray">备用</Tag>}
              </div>
              <div className="text-[16px] font-medium text-ink">{m.name}</div>
              <div className="mt-2 truncate font-mono text-[12.5px] text-ink-3">{m.baseUrl}</div>
              <div className="mt-1.5 text-[13px] text-ink-2">
                {m.type === 'CHAT' && `Temperature ${m.temperature ?? 0.7} · MaxTokens ${m.maxTokens ?? 4096}`}
                {m.type === 'EMBEDDING' && `dim ${m.dimension ?? '—'}`}
                {m.type === 'RERANK' && (m.extraParams?.rerank_path ? String(m.extraParams.rerank_path) : '重排模型')}
                {m.apiKeyMasked && <span className="ml-2 text-ink-4">{m.apiKeyMasked}</span>}
              </div>

              <div className="mt-auto flex flex-wrap items-center gap-2 pt-4">
                <Button variant="outline" onClick={() => testMut.mutate(m.id)} disabled={testMut.isPending}>
                  测试
                </Button>
                <Button variant="outline" onClick={() => setFormOpen(m)}>
                  编辑
                </Button>
                {!m.isDefault && (
                  <Button variant="outline" onClick={() => defaultMut.mutate(m.id)}>
                    设为默认
                  </Button>
                )}
                <Switch
                  checked={m.enabled}
                  onChange={(v) => enabledMut.mutate({ id: m.id, enabled: v })}
                  aria-label="启用模型"
                />
                <button
                  type="button"
                  className="ml-auto cursor-pointer rounded-md border-0 bg-transparent px-2 py-1 text-[13.5px] text-ink-3 transition-colors hover:bg-danger-bg hover:text-danger"
                  onClick={() => setDeleting(m)}
                >
                  删除
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {formOpen && (
        <ModelFormModal
          model={formOpen === 'create' ? undefined : formOpen}
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
        title="删除模型"
        description={
          <>
            确定删除模型 <b>{deleting?.name}</b> 吗？若仍被知识库或会话引用，后端会拒绝删除。
          </>
        }
        confirmText="删除"
        danger
        loading={deleteMut.isPending}
      />
    </div>
  )
}

function ModelFormModal({
  model,
  onClose,
  onSaved,
}: {
  model?: LlmModel
  onClose: () => void
  onSaved: () => void
}) {
  const pushToast = useToastStore((s) => s.push)
  const isEdit = !!model
  const [testResult, setTestResult] = useState<{ ok: boolean; detail: string } | null>(null)
  const [formError, setFormError] = useState<string | null>(null)

  const [form, setForm] = useState<ModelPayload>({
    name: model?.name ?? '',
    type: model?.type ?? 'CHAT',
    provider: model?.provider ?? 'openai',
    baseUrl: model?.baseUrl ?? '',
    apiKey: '',
    modelName: model?.modelName ?? '',
    dimension: model?.dimension ?? undefined,
    temperature: model?.temperature ?? 0.7,
    maxTokens: model?.maxTokens ?? 4096,
    timeoutMs: model?.timeoutMs ?? 60000,
    isDefault: model?.isDefault ?? false,
    enabled: model?.enabled ?? true,
  })

  const isChat = form.type === 'CHAT'
  const isEmbedding = form.type === 'EMBEDDING'

  const saveMut = useMutation({
    mutationFn: () => {
      if (!isEdit) return createModel(form)
      // type 不允许修改，提交时不出现在 payload
      const payload: ModelUpdatePayload = {
        name: form.name,
        provider: form.provider,
        baseUrl: form.baseUrl,
        modelName: form.modelName,
        dimension: form.dimension,
        temperature: form.temperature,
        maxTokens: form.maxTokens,
        timeoutMs: form.timeoutMs,
        isDefault: form.isDefault,
        enabled: form.enabled,
      }
      if (form.apiKey) payload.apiKey = form.apiKey
      return updateModel(model!.id, payload)
    },
    onSuccess: () => {
      pushToast(isEdit ? '已保存' : '模型已添加')
      onSaved()
    },
    onError: (e) => setFormError(toApiError(e).message),
  })

  const testMut = useMutation({
    mutationFn: () => (isEdit ? testModel(model!.id) : testModelDraft(form)),
    onSuccess: (res) => setTestResult({ ok: res.success, detail: res.detail ?? `连通正常 · ${res.latencyMs}ms` }),
    onError: (e) => setTestResult({ ok: false, detail: toApiError(e).message }),
  })

  function submit() {
    setFormError(null)
    if (!form.name.trim() || !form.baseUrl.trim() || !form.modelName.trim()) {
      setFormError('请填写名称、Base URL 与模型名')
      return
    }
    if (!isEdit && !form.apiKey.trim()) {
      setFormError('请输入 API Key')
      return
    }
    if (isEmbedding && !form.dimension) {
      setFormError('EMBEDDING 模型必须填写向量维度（应与全局维度 1024 一致）')
      return
    }
    saveMut.mutate()
  }

  const set = <K extends keyof ModelPayload>(key: K, value: ModelPayload[K]) =>
    setForm((f) => ({ ...f, [key]: value }))

  return (
    <Modal
      open
      onClose={onClose}
      title={isEdit ? `编辑模型 · ${model!.name}` : '添加模型'}
      width="max-w-[560px]"
      footer={
        <>
          <button type="button" className={cn(btnGhost, 'mr-auto')} disabled={testMut.isPending} onClick={() => testMut.mutate()}>
            <PlugZap className="size-4" />
            连通性测试
          </button>
          <button type="button" className={btnGhost} onClick={onClose}>
            取消
          </button>
          <button type="button" className={btnPrimary} disabled={saveMut.isPending} onClick={submit}>
            {saveMut.isPending ? '保存中…' : isEdit ? '保存' : '添加'}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="显示名" required>
            <Input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="如：gpt-4o-mini" className={inputCls} />
          </Field>
          <Field label="类型" required hint={isEdit ? '类型不可修改' : undefined}>
            <Select value={form.type} disabled={isEdit} onChange={(e) => set('type', e.target.value as ModelType)}>
              <option value="CHAT">CHAT — 对话</option>
              <option value="EMBEDDING">EMBEDDING — 向量化</option>
              <option value="RERANK">RERANK — 重排</option>
            </Select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="供应商" required>
            <Select value={form.provider} onChange={(e) => set('provider', e.target.value)}>
              {Object.entries(MODEL_PROVIDER).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="模型名（model 参数）" required>
            <Input value={form.modelName} onChange={(e) => set('modelName', e.target.value)} placeholder="gpt-4o-mini" className={inputCls} />
          </Field>
        </div>
        <Field label="Base URL" required>
          <Input value={form.baseUrl} onChange={(e) => set('baseUrl', e.target.value)} placeholder="https://api.openai.com/v1" className={inputCls} />
        </Field>
        <Field label="API Key" required={!isEdit} hint={isEdit ? '留空表示不修改' : '明文传入，后端 AES-GCM 加密存储'}>
          <Input
            type="password"
            value={form.apiKey}
            onChange={(e) => set('apiKey', e.target.value)}
            autoComplete="new-password"
            className={inputCls}
          />
        </Field>

        {isChat && (
          <div className="grid grid-cols-3 gap-3">
            <Field label="Temperature">
              <Input
                type="number"
                step="0.1"
                value={form.temperature ?? 0.7}
                onChange={(e) => set('temperature', Number(e.target.value))}
                className={inputCls}
              />
            </Field>
            <Field label="Max Tokens">
              <Input
                type="number"
                value={form.maxTokens ?? 4096}
                onChange={(e) => set('maxTokens', Number(e.target.value))}
                className={inputCls}
              />
            </Field>
            <Field label="超时(ms)">
              <Input
                type="number"
                value={form.timeoutMs ?? 60000}
                onChange={(e) => set('timeoutMs', Number(e.target.value))}
                className={inputCls}
              />
            </Field>
          </div>
        )}

        {isEmbedding && (
          <Field label="向量维度" required hint="须与全局维度 1024 一致，否则创建知识库时报 40006">
            <Input
              type="number"
              value={form.dimension ?? 1024}
              onChange={(e) => set('dimension', Number(e.target.value))}
              className={inputCls}
            />
          </Field>
        )}

        <div className="flex items-center justify-between rounded-md border border-line px-3 py-2.5">
          <span className="text-[14px] text-ink">设为该类型默认</span>
          <Switch checked={!!form.isDefault} onChange={(v) => set('isDefault', v)} aria-label="设为默认" />
        </div>
        <div className="flex items-center justify-between rounded-md border border-line px-3 py-2.5">
          <span className="text-[14px] text-ink">启用</span>
          <Switch checked={!!form.enabled} onChange={(v) => set('enabled', v)} aria-label="启用" />
        </div>

        {testResult && <Alert tone={testResult.ok ? 'success' : 'error'}>{testResult.detail}</Alert>}
        {formError && <Alert tone="error">{formError}</Alert>}
      </div>
    </Modal>
  )
}
