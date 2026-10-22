import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronLeft, Eye, KeyRound, Link2, RefreshCw, Search, Table2 } from 'lucide-react'
import { Tag } from '@/components/ui/tag'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { EmptyState, ErrorBlock, LoadingBlock } from '@/components/ui/feedback'
import { fetchDatasource, fetchSample, fetchTableDetail, fetchTables, startSchemaSync, updateTable } from '@/api/sqlbot'
import { toApiError } from '@/lib/http'
import { formatNumber } from '@/lib/format'
import { inputCls, rowBtn } from '@/lib/styles'
import { useToastStore } from '@/stores/toast'
import { cn } from '@/lib/utils'

export default function TableBrowserPage() {
  const { id } = useParams()
  const dsId = Number(id)
  const navigate = useNavigate()
  const pushToast = useToastStore((s) => s.push)
  const queryClient = useQueryClient()

  const [keyword, setKeyword] = useState('')
  const [activeTableId, setActiveTableId] = useState<number | null>(null)

  const dsQuery = useQuery({ queryKey: ['datasource', dsId], queryFn: () => fetchDatasource(dsId) })
  const tablesQuery = useQuery({
    queryKey: ['tables', dsId, keyword],
    queryFn: () => fetchTables(dsId, { page: 1, size: 100, keyword: keyword.trim() || undefined }),
  })

  // 首次加载自动选中第一张表，避免右栏空白
  useEffect(() => {
    if (activeTableId === null && tablesQuery.data?.records.length) {
      setActiveTableId(tablesQuery.data.records[0].id)
    }
  }, [tablesQuery.data, activeTableId])

  const syncMut = useMutation({
    mutationFn: () => startSchemaSync(dsId),
    onSuccess: () => {
      pushToast('已开始同步 Schema')
      window.setTimeout(() => queryClient.invalidateQueries({ queryKey: ['tables', dsId] }), 1600)
    },
    onError: (e) => pushToast(toApiError(e).message),
  })

  const toggleTableMut = useMutation({
    mutationFn: (vars: { tableId: number; enabled: boolean }) =>
      updateTable(dsId, vars.tableId, { enabled: vars.enabled }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tables', dsId] }),
    onError: (e) => pushToast(toApiError(e).message),
  })

  const ds = dsQuery.data

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex min-h-[52px] flex-none flex-wrap items-center gap-2 border-b border-line px-4 py-2.5">
        <button type="button" className={cn(rowBtn, 'gap-1')} onClick={() => navigate('/sqlbot/datasources')}>
          <ChevronLeft className="size-4" />
          返回
        </button>
        <span className="text-[15px] font-medium text-ink">表结构浏览</span>
        {ds && <Tag tone="gray">{ds.name}</Tag>}
        <div className="ml-auto flex items-center gap-2">
          <Button variant="outline" onClick={() => syncMut.mutate()} disabled={syncMut.isPending}>
            <RefreshCw className={cn(syncMut.isPending && 'animate-spin')} />
            同步
          </Button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1">
        {/* 左：表列表 */}
        <aside className="flex w-[236px] flex-none flex-col overflow-y-auto border-r border-line bg-bg-sidebar p-3">
          <div className="relative mb-2">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3 -translate-y-1/2 text-ink-4" />
            <Input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="搜索表…"
              className="h-8 rounded-md border-line-strong bg-bg-card pl-7 text-[14px]"
            />
          </div>
          {tablesQuery.isLoading ? (
            <LoadingBlock className="py-6" label="" />
          ) : (tablesQuery.data?.records.length ?? 0) === 0 ? (
            <p className="px-2 py-4 text-[13px] text-ink-3">没有匹配的表</p>
          ) : (
            <div className="space-y-0.5">
              {tablesQuery.data!.records.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setActiveTableId(t.id)}
                  className={cn(
                    'flex w-full cursor-pointer items-center gap-2 rounded-md border-0 px-2 py-1.5 text-left transition-colors',
                    activeTableId === t.id
                      ? 'bg-bg-active text-ink'
                      : 'bg-transparent text-ink-2 hover:bg-bg-hover',
                  )}
                >
                  {t.schemaName === 'public' && t.tableName.startsWith('v_') ? (
                    <Eye className="size-3.5 flex-none" />
                  ) : (
                    <Table2 className="size-3.5 flex-none" />
                  )}
                  <span className="truncate font-mono text-[13.5px]">{t.tableName}</span>
                  {!t.enabled && <span className="ml-auto text-[11px] text-ink-4">已关闭</span>}
                </button>
              ))}
            </div>
          )}
        </aside>

        {/* 右：字段详情 */}
        <section className="min-w-0 flex-1 overflow-y-auto">
          {activeTableId === null ? (
            <EmptyState className="h-full" icon={<Table2 className="size-5" />} title="选择左侧一张表" description="查看字段、主外键与样例行。" />
          ) : (
            <TableDetailView
              dsId={dsId}
              tableId={activeTableId}
              onToggleEnabled={(enabled) => toggleTableMut.mutate({ tableId: activeTableId, enabled })}
            />
          )}
        </section>
      </div>
    </div>
  )
}

function TableDetailView({
  dsId,
  tableId,
  onToggleEnabled,
}: {
  dsId: number
  tableId: number
  onToggleEnabled: (enabled: boolean) => void
}) {
  const pushToast = useToastStore((s) => s.push)
  const queryClient = useQueryClient()
  const [comment, setComment] = useState<string | null>(null)

  const detailQuery = useQuery({
    queryKey: ['table', dsId, tableId],
    queryFn: () => fetchTableDetail(dsId, tableId),
  })
  const sampleQuery = useQuery({
    queryKey: ['sample', dsId, tableId],
    queryFn: () => fetchSample(dsId, tableId, 10),
  })

  // 切换表时同步本地注释草稿
  useEffect(() => {
    setComment(detailQuery.data?.tableComment ?? '')
  }, [detailQuery.data?.id, detailQuery.data?.tableComment])

  const commentMut = useMutation({
    mutationFn: () => updateTable(dsId, tableId, { tableComment: comment ?? '' }),
    onSuccess: () => {
      pushToast('注释已保存')
      queryClient.invalidateQueries({ queryKey: ['table', dsId, tableId] })
    },
    onError: (e) => pushToast(toApiError(e).message),
  })

  if (detailQuery.isLoading) return <LoadingBlock className="py-16" />
  if (detailQuery.error || !detailQuery.data) return <ErrorBlock className="py-16" message={toApiError(detailQuery.error).message} />

  const t = detailQuery.data

  return (
    <div>
      <div className="border-b border-line p-5">
        <div className="flex flex-wrap items-center gap-2.5">
          <Table2 className="size-[18px] text-info" />
          <span className="font-mono text-[17px] font-medium text-ink">{t.tableName}</span>
          <Tag tone={t.enabled ? 'green' : 'gray'}>{t.enabled ? '参与 NL2SQL' : '已关闭'}</Tag>
        </div>
        <div className="mt-1.5 text-[14px] text-ink-2">
          {t.tableComment || '（无注释）'} · 约 {formatNumber(t.rowEstimate ?? 0)} 行 · {t.schemaName}
        </div>
        <div className="mt-2 rounded-md bg-bg-section p-2 font-mono text-[13.5px] text-ink-2">
          {t.tableName}(
          <span className="text-accent-deep">
            {t.columns
              .filter((c) => c.isPrimaryKey)
              .map((c) => c.columnName)
              .join(', ')}
          </span>
          {', '}
          {t.columns
            .filter((c) => !c.isPrimaryKey)
            .map((c) => c.columnName)
            .join(', ')}
          )
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-[14px] text-ink-2">
            <Switch checked={t.enabled} onChange={onToggleEnabled} aria-label="参与 NL2SQL" />
            参与 NL2SQL 生成
          </label>
          <div className="ml-auto flex min-w-[280px] flex-1 items-center gap-2">
            <Input
              value={comment ?? ''}
              onChange={(e) => setComment(e.target.value)}
              placeholder="表注释（用于提示词）"
              className={cn(inputCls, 'h-8 flex-1')}
            />
            <Button variant="outline" onClick={() => commentMut.mutate()} disabled={commentMut.isPending}>
              保存注释
            </Button>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-[14px]">
          <thead>
            <tr>
              {['字段名', '类型', '可空', '主键', '注释', '参与生成'].map((h) => (
                <th key={h} className="border-b border-line bg-bg-section px-4 py-2.5 text-[13px] font-medium whitespace-nowrap text-ink-3">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {t.columns.map((c) => (
              <tr key={c.id} className="border-b border-line last:border-0 hover:bg-bg-hover/60">
                <td className="px-4 py-2.5 whitespace-nowrap font-mono text-ink">
                  <span className="inline-flex items-center gap-1.5">
                    {c.isPrimaryKey && <KeyRound className="size-3 text-warn" />}
                    {c.isForeignKey && <Link2 className="size-3 text-info" />}
                    {c.columnName}
                  </span>
                </td>
                <td className="px-4 py-2.5 font-mono text-ink-2">{c.dataType}</td>
                <td className="px-4 py-2.5 text-ink-3">{c.nullable ? '是' : '否'}</td>
                <td className="px-4 py-2.5">
                  {c.isPrimaryKey && <Tag tone="amber">PK</Tag>}
                  {c.isForeignKey && <Tag tone="gray">FK</Tag>}
                  {!c.isPrimaryKey && !c.isForeignKey && <span className="text-ink-4">—</span>}
                </td>
                <td className="px-4 py-2.5 text-ink-2">{c.columnComment || '—'}</td>
                <td className="px-4 py-2.5">
                  <span title="字段级编辑接口尚未提供；当前可在表级控制参与生成"><Switch checked={c.enabled} disabled onChange={() => undefined} aria-label="参与生成（只读）" /></span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="p-5">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[14px] font-medium text-ink">样例数据（前 10 行）</span>
        </div>
        {sampleQuery.isLoading ? (
          <LoadingBlock />
        ) : sampleQuery.error ? (
          <ErrorBlock message={toApiError(sampleQuery.error).message} />
        ) : (
          <div className="overflow-x-auto rounded-lg border border-line">
            <table className="w-full border-collapse text-left text-[13.5px]">
              <thead>
                <tr>
                  {sampleQuery.data!.columns.map((col) => (
                    <th key={col} className="border-b border-line bg-bg-section px-3 py-2 font-mono font-medium whitespace-nowrap text-ink-3">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sampleQuery.data!.rows.map((row, ri) => (
                  <tr key={ri} className="border-b border-line last:border-0">
                    {row.map((cell, ci) => (
                      <td key={ci} className="px-3 py-2 whitespace-nowrap font-mono text-ink-2">
                        {cell === null || cell === undefined ? '—' : String(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
