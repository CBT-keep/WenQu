import { useState, type ReactNode } from 'react'
import { BarChart3, Grid3x3, LineChart, PieChart } from 'lucide-react'
import { EChart } from '@/components/ui/lazy-chart'
import { Seg } from '@/components/ui/seg'
import type { ChartType, ResultColumn } from '@/types'
import { cn } from '@/lib/utils'

/**
 * 查询结果：表格 / 图表切换（原型 `page-sqlbot-query` 的结果卡）。
 * 图表优先用后端下发的 option；缺省时由调用方先用 inferChart 兜底。
 */
export function ResultView({
  columns,
  rows,
  chartType,
  chartOption,
  elapsedMs,
  truncated,
  footerLeft,
  className,
}: {
  columns: ResultColumn[]
  rows: unknown[][]
  chartType?: ChartType | null
  chartOption?: Record<string, unknown> | null
  elapsedMs?: number
  truncated?: boolean
  footerLeft?: ReactNode
  className?: string
}) {
  const [view, setView] = useState<ChartType>(chartType && chartType !== 'table' ? chartType : 'table')

  const options: { value: ChartType; label: ReactNode }[] = [
    { value: 'table', label: (<><Grid3x3 className="size-3" />表格</>) },
    { value: 'bar', label: (<><BarChart3 className="size-3" />柱状</>) },
    { value: 'line', label: (<><LineChart className="size-3" />折线</>) },
    { value: 'pie', label: (<><PieChart className="size-3" />饼图</>) },
  ]

  return (
    <div className={cn('overflow-hidden rounded-xl border border-line bg-bg-card', className)}>
      <div className="flex flex-wrap items-center gap-2 border-b border-line px-3 py-2.5">
        <span className="text-[14px] font-medium text-ink">查询结果</span>
        <span className="inline-flex h-5 items-center rounded-sm bg-ok-bg px-1.5 text-[12px] font-medium text-ok">
          {rows.length} 行
        </span>
        <div className="ml-auto">
          <Seg value={view} onChange={setView} options={options} />
        </div>
      </div>

      <div className="p-3">
        {view === 'table' ? (
          <div className="max-h-[360px] overflow-auto rounded-md border border-line">
            <table className="w-full border-collapse text-left text-[14px]">
              <thead>
                <tr>
                  {columns.map((c) => (
                    <th
                      key={c.name}
                      className="sticky top-0 z-[1] border-b border-line bg-bg-section px-3 py-2 text-[13px] font-medium whitespace-nowrap text-ink-3"
                    >
                      {c.name} <span className="font-normal text-ink-4">{c.type}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 200).map((row, ri) => (
                  <tr key={ri} className="border-b border-line last:border-0 hover:bg-bg-hover/60">
                    {row.map((cell, ci) => {
                      const numeric = typeof cell === 'number'
                      return (
                        <td
                          key={ci}
                          className={cn(
                            'px-3 py-2 whitespace-nowrap text-ink-2',
                            numeric && 'text-right font-mono tabular-nums',
                          )}
                        >
                          {formatCell(cell)}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : chartOption && Object.keys(chartOption).length > 0 ? (
          <EChart option={chartOption} height={280} />
        ) : (
          <div className="grid h-[280px] place-items-center text-[13.5px] text-ink-3">该结果集无法生成图表</div>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line px-3 py-2 text-[13px] text-ink-3">
        <span>
          {footerLeft}
          {footerLeft ? ' · ' : ''}
          {truncated ? '结果集已截断' : '结果集未截断'}
          {elapsedMs !== undefined && ` · 执行 ${elapsedMs}ms`}
        </span>
      </div>
    </div>
  )
}

function formatCell(cell: unknown): string {
  if (cell === null || cell === undefined) return '—'
  if (typeof cell === 'number') return cell.toLocaleString('zh-CN')
  return String(cell)
}
