import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Download } from 'lucide-react'
import { PageHeader, Panel, StatCard } from '@/components/layout/page'
import { Tag } from '@/components/ui/tag'
import { Seg } from '@/components/ui/seg'
import { EChart } from '@/components/ui/lazy-chart'
import { ErrorBlock, LoadingBlock } from '@/components/ui/feedback'
import { Button } from '@/components/ui/button'
import { fetchDashboardStats, fetchHealthComponents, fetchUsageTrend } from '@/api/system'
import { toApiError } from '@/lib/http'
import { formatCompact, formatNumber } from '@/lib/format'
import { saveBlob } from '@/lib/download'
import { useToastStore } from '@/stores/toast'

const RANGES = [
  { value: '7', label: '7 天' },
  { value: '14', label: '14 天' },
  { value: '30', label: '30 天' },
] as const

export default function DashboardPage() {
  const pushToast = useToastStore((s) => s.push)
  const [days, setDays] = useState<'7' | '14' | '30'>('14')

  const statsQuery = useQuery({ queryKey: ['dashboard-stats'], queryFn: fetchDashboardStats })
  const usageQuery = useQuery({ queryKey: ['dashboard-usage', days], queryFn: () => fetchUsageTrend(Number(days)) })
  const healthQuery = useQuery({ queryKey: ['health'], queryFn: fetchHealthComponents })

  const stats = statsQuery.data
  // option 用 useMemo 固定引用：内联构造会让 EChart 每次都当成"换了张图"而重播动画
  const usagePoints = usageQuery.data?.points
  const usageOpt = useMemo(() => usageOption(usagePoints ?? []), [usagePoints])

  function exportUsage() {
    const points = usageQuery.data?.points ?? []
    if (points.length === 0) {
      pushToast('暂无可导出的数据')
      return
    }
    const head = 'date,chatCount,sqlCount,tokens'
    const body = points.map((p) => [p.date, p.chatCount, p.sqlCount, p.tokens].join(',')).join('\n')
    saveBlob(new Blob([`\uFEFF${head}\n${body}\n`], { type: 'text/csv;charset=utf-8' }), `usage-${days}d.csv`)
    pushToast('已导出调用量趋势')
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto p-6">
        <PageHeader
          title="数据总览"
          description="平台使用情况与依赖组件健康度"
          actions={
            <>
              <Seg value={days} onChange={setDays} options={RANGES.map((r) => ({ value: r.value, label: r.label }))} />
              <Button variant="outline" onClick={exportUsage}>
                <Download />
                导出
              </Button>
            </>
          }
        />

        {statsQuery.isLoading ? (
          <LoadingBlock />
        ) : statsQuery.error ? (
          <ErrorBlock message={toApiError(statsQuery.error).message} />
        ) : (
          <div className="mb-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
            <StatCard
              label="知识库"
              badge={<Tag tone="accent">RAG</Tag>}
              value={formatNumber(stats!.kbCount)}
              hint={`文档 ${formatNumber(stats!.documentCount)} · 分片 ${formatNumber(stats!.chunkCount)}`}
            />
            <StatCard
              label="今日问答"
              badge={<Tag tone="accent">对话</Tag>}
              value={formatNumber(stats!.todayChatCount)}
              hint={`活跃用户 ${stats!.activeUserCount}`}
            />
            <StatCard
              label="NL2SQL 查询"
              badge={<Tag tone="green">SQLBot</Tag>}
              value={formatNumber(stats!.todaySqlCount)}
              hint={`成功率 ${(stats!.sqlSuccessRate * 100).toFixed(1)}% · 数据源 ${stats!.datasourceCount}`}
            />
            <StatCard
              label="Token 消耗"
              badge={<Tag tone="amber">计量</Tag>}
              value={formatCompact(stats!.todayPromptTokens + stats!.todayCompletionTokens)}
              hint={`输入 ${formatCompact(stats!.todayPromptTokens)} / 输出 ${formatCompact(stats!.todayCompletionTokens)}`}
            />
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <Panel
            className="xl:col-span-2"
            title="调用量趋势"
            extra={
              <>
                <Tag tone="accent">问答</Tag>
                <Tag tone="green">SQL 查询</Tag>
              </>
            }
          >
            {usageQuery.isLoading ? (
              <LoadingBlock />
            ) : usageQuery.error ? (
              <ErrorBlock message={toApiError(usageQuery.error).message} />
            ) : (
              <EChart option={usageOpt} height={260} />
            )}
          </Panel>

          <Panel title="组件健康">
            {healthQuery.isLoading ? (
              <LoadingBlock />
            ) : healthQuery.error ? (
              <ErrorBlock message={toApiError(healthQuery.error).message} />
            ) : (
              <div className="space-y-3 text-[14px]">
                {healthQuery.data!.map((c) => (
                  <div key={c.component} className="flex items-center justify-between gap-2">
                    <span className="min-w-0 truncate text-ink-2">{c.component}</span>
                    <span className="flex flex-none items-center gap-2">
                      {c.detail && <span className="text-[12.5px] text-ink-4">{c.detail}</span>}
                      <Tag tone={c.status === 'UP' ? 'green' : c.status === 'DOWN' ? 'red' : 'gray'}>
                        {c.status === 'UP' ? '正常' : c.status === 'DOWN' ? '异常' : '未启用'}
                      </Tag>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </div>
      </div>
    </div>
  )
}

function usageOption(points: { date: string; chatCount: number; sqlCount: number }[]) {
  const dates = points.map((p) => p.date.slice(5))
  return {
    grid: { left: 8, right: 16, top: 30, bottom: 8, containLabel: true },
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'category', data: dates },
    yAxis: { type: 'value' },
    series: [
      { name: '问答', type: 'bar', stack: 'total', barMaxWidth: 22, itemStyle: { borderRadius: [3, 3, 0, 0] }, data: points.map((p) => p.chatCount) },
      { name: 'SQL 查询', type: 'bar', stack: 'total', barMaxWidth: 22, itemStyle: { borderRadius: [3, 3, 0, 0] }, data: points.map((p) => p.sqlCount) },
    ],
  }
}
