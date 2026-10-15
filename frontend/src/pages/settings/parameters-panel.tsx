import { useMemo, useState, type ReactNode } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Archive, Search, Shield, Terminal } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Field } from '@/components/ui/field'
import { Switch } from '@/components/ui/switch'
import { Alert, ErrorBlock, LoadingBlock } from '@/components/ui/feedback'
import { fetchSettings, updateSettings } from '@/api/system'
import { toApiError } from '@/lib/http'
import { btnPrimary } from '@/lib/styles'
import type { SettingGroup, SettingItem } from '@/types'
import { useToastStore } from '@/stores/toast'
import { cn } from '@/lib/utils'

type GroupKey = SettingGroup

const GROUPS: { key: GroupKey; label: string; icon: ReactNode }[] = [
  { key: 'RAG', label: 'RAG 参数', icon: <Search className="size-4" /> },
  { key: 'SQLBot', label: 'SQLBot 参数', icon: <Terminal className="size-4" /> },
  { key: 'Security', label: '安全与登录', icon: <Shield className="size-4" /> },
  { key: 'System', label: '存储与日志', icon: <Archive className="size-4" /> },
]

export function ParametersPanel() {
  const pushToast = useToastStore((s) => s.push)
  const queryClient = useQueryClient()
  const [group, setGroup] = useState<GroupKey>('RAG')
  const [draft, setDraft] = useState<Record<string, string>>({})

  const { data, isLoading, error } = useQuery({ queryKey: ['settings'], queryFn: () => fetchSettings() })

  const byGroup = useMemo(() => {
    const map: Record<string, SettingItem[]> = {}
    for (const item of data ?? []) (map[item.group] ??= []).push(item)
    return map
  }, [data])

  const items = byGroup[group] ?? []
  const valueOf = (item: SettingItem) => draft[item.key] ?? item.value
  const isDirty = items.some((item) => valueOf(item) !== item.value)

  const saveMut = useMutation({
    mutationFn: () => updateSettings({ items: items.map((item) => ({ key: item.key, value: valueOf(item) })) }),
    onSuccess: (res) => {
      pushToast(`已保存 ${res.updated} 项，即时生效`)
      setDraft({})
      queryClient.invalidateQueries({ queryKey: ['settings'] })
    },
    onError: (e) => pushToast(toApiError(e).message),
  })

  return (
    <div className="flex flex-col gap-4 lg:flex-row">
      <nav className="flex flex-none flex-row gap-1 overflow-x-auto lg:w-44 lg:flex-col">
        {GROUPS.map((g) => (
          <button
            key={g.key}
            type="button"
            onClick={() => setGroup(g.key)}
            className={cn(
              'flex h-9 flex-none cursor-pointer items-center gap-2.5 rounded-md border-0 px-2.5 text-[14.5px] whitespace-nowrap transition-colors',
              group === g.key ? 'bg-bg-hover font-medium text-ink' : 'bg-transparent text-ink-2 hover:bg-bg-hover',
            )}
          >
            {g.icon}
            {g.label}
          </button>
        ))}
      </nav>

      <div className="min-w-0 flex-1 space-y-4">
        {isLoading ? (
          <LoadingBlock />
        ) : error ? (
          <ErrorBlock message={toApiError(error).message} />
        ) : (
          <div className="rounded-xl border border-line bg-bg-card p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <div className="text-[16px] font-medium text-ink">{GROUPS.find((g) => g.key === group)?.label}</div>
                <p className="mt-0.5 text-[13.5px] text-ink-3">修改即时生效，并写入操作日志。</p>
              </div>
              <button
                type="button"
                className={btnPrimary}
                disabled={!isDirty || saveMut.isPending}
                onClick={() => saveMut.mutate()}
              >
                {saveMut.isPending ? '保存中…' : '保存全部参数'}
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {items.map((item) => (
                <SettingField
                  key={item.key}
                  item={item}
                  value={valueOf(item)}
                  dirty={valueOf(item) !== item.value}
                  onChange={(v) => setDraft((d) => ({ ...d, [item.key]: v }))}
                />
              ))}
            </div>

            {group === 'RAG' && (
              <Alert tone="warn" className="mt-4">
                修改切分默认值不影响已索引文档，需手动「重建索引」。
              </Alert>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function SettingField({
  item,
  value,
  dirty,
  onChange,
}: {
  item: SettingItem
  value: string
  dirty: boolean
  onChange: (value: string) => void
}) {
  const isBoolean = item.valueType === 'BOOLEAN'
  const isJson = item.valueType === 'JSON'
  const isNumber = item.valueType === 'INT' || item.valueType === 'DOUBLE'

  return (
    <Field
      label={
        <span className="flex items-center gap-1.5">
          {item.description ?? item.key}
          {dirty && <span className="size-1.5 rounded-full bg-accent" title="已修改" />}
        </span>
      }
      hint={<span className="font-mono">{item.key}</span>}
      className={isJson ? 'md:col-span-2' : undefined}
    >
      {isBoolean ? (
        <Switch checked={value === 'true'} onChange={(v) => onChange(String(v))} aria-label={item.key} />
      ) : isJson || item.key.includes('keywords') ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={2}
          className="w-full resize-y rounded-md border border-line-strong bg-bg-card px-3 py-2 font-mono text-[13px] text-ink outline-none focus:border-accent"
        />
      ) : (
        <Input
          type={isNumber ? 'number' : 'text'}
          step={item.valueType === 'DOUBLE' ? '0.05' : undefined}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-9"
        />
      )}
    </Field>
  )
}
