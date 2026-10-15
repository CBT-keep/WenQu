import type { ChartType, ResultColumn } from '@/types/sqlbot'

/**
 * 结果集 → ECharts option 建议。
 *
 * doc/04 约定图表 option **由后端在 SSE `chart` 事件里给出**；这里是一份前端兜底：
 * 手工执行（`/sqlbot/execute` 不返回 option）、以及 Mock 模式下用它生成图表。
 * 规则保持朴素：取第一个分类列做 X、第一个数值列做 Y。
 */

export interface ChartSuggestion {
  type: ChartType
  option: Record<string, unknown>
}

const PALETTE = ['#526e3e', '#7b955f', '#3f6b78', '#c9983c', '#a8402c', '#4f7a3b', '#98c082', '#8a641d']

const NUMERIC_TYPES = /int|numeric|decimal|float|double|real|money|serial|bigint|smallint/i

export function isNumericColumn(col: ResultColumn): boolean {
  return NUMERIC_TYPES.test(col.type)
}

export function inferChart(
  columns: ResultColumn[],
  rows: unknown[][],
  preferred?: ChartType,
): ChartSuggestion {
  const categoryIdx = columns.findIndex((c) => !isNumericColumn(c))
  const measureIdx = columns.findIndex((c) => isNumericColumn(c))

  // 没有可用的分类 + 数值组合时退化为表格（与 doc/04 `table` 类型一致）
  if (categoryIdx < 0 || measureIdx < 0 || rows.length === 0) {
    return { type: 'table', option: {} }
  }

  const categories = rows.map((r) => String(r[categoryIdx] ?? ''))
  const values = rows.map((r) => Number(r[measureIdx] ?? 0))
  const type: ChartType = preferred && preferred !== 'table' ? preferred : 'bar'

  if (type === 'pie') {
    return {
      type,
      option: {
        color: PALETTE,
        tooltip: { trigger: 'item' },
        legend: { bottom: 0, textStyle: { fontSize: 11 } },
        series: [
          {
            type: 'pie',
            radius: ['42%', '68%'],
            data: categories.map((name, i) => ({ name, value: values[i] })),
          },
        ],
      },
    }
  }

  return {
    type,
    option: {
      color: PALETTE,
      grid: { left: 8, right: 16, top: 24, bottom: 8, containLabel: true },
      tooltip: { trigger: 'axis' },
      xAxis: { type: 'category', data: categories, axisLabel: { fontSize: 11 } },
      yAxis: { type: 'value', axisLabel: { fontSize: 11 } },
      series: [
        {
          type: type === 'line' ? 'line' : 'bar',
          data: values,
          smooth: type === 'line',
          barMaxWidth: 46,
          itemStyle: { borderRadius: type === 'bar' ? [4, 4, 0, 0] : 0 },
        },
      ],
    },
  }
}
