import { useEffect, useRef } from 'react'
import * as echarts from 'echarts/core'
import { BarChart, LineChart, PieChart } from 'echarts/charts'
import { GridComponent, LegendComponent, TooltipComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import { cn } from '@/lib/utils'

echarts.use([BarChart, LineChart, PieChart, GridComponent, LegendComponent, TooltipComponent, CanvasRenderer])

type Option = Record<string, unknown>

/**
 * ECharts 容器。
 * 后端在 SSE `chart` 事件里给的是纯 option（doc/04 §1.7），这里只负责挂载/响应式/换肤重绘。
 * 轴与图例文字色从 CSS 变量现取 —— ECharts 不认 var()，只能读计算值，换肤时重算一次。
 */
export function EChart({
  option,
  height = 220,
  className,
}: {
  option: Option
  height?: number
  className?: string
}) {
  const elRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<echarts.ECharts | null>(null)
  /** 最近一次真正提交给 ECharts 的 option 签名 —— 用于跳过等价的重绘 */
  const lastSignatureRef = useRef('')
  /** 当前主题下的重绘函数：主题切换时由 MutationObserver 触发 */
  const paintRef = useRef<() => void>(() => {})

  useEffect(() => {
    const el = elRef.current
    if (!el) return
    const chart = echarts.init(el)
    chartRef.current = chart
    // 重新初始化后必须让上一次的签名失效，否则等价的 option 会被跳过、留下空图
    lastSignatureRef.current = ''
    const onResize = () => chart.resize()
    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('resize', onResize)
      chart.dispose()
      chartRef.current = null
    }
  }, [])

  // 换肤重绘（只挂一次）
  useEffect(() => {
    const observer = new MutationObserver(() => paintRef.current())
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const chart = chartRef.current
    if (!chart) return

    // ⚠️ 调用方常常内联构造 option（每次渲染都是新对象）。如果不比对内容就重绘，
    // ECharts 会按 notMerge 重建系列、动画从 0 重播 —— 表现为柱子反复"消失一下"。
    const signature = JSON.stringify(option)
    if (signature === lastSignatureRef.current) return
    lastSignatureRef.current = signature

    const css = getComputedStyle(document.documentElement)
    const ink2 = css.getPropertyValue('--ink-2').trim() || '#6b6558'
    const ink3 = css.getPropertyValue('--ink-3').trim() || '#9c9588'
    const line = css.getPropertyValue('--line-strong').trim() || '#e6dfd5'

    paintRef.current = () => {
      chart.setOption(
        {
          color: ['#526e3e', '#7b955f', '#3f6b78', '#c9983c', '#a8402c', '#4f7a3b', '#98c082', '#8a641d'],
          textStyle: { color: ink2, fontFamily: 'inherit' },
          ...option,
          // 轴/分割线颜色由主题决定，覆盖后端 option 里的固定值
          xAxis: mergeAxis(option.xAxis, { axisLabel: { color: ink3, fontSize: 12 }, axisLine: { lineStyle: { color: line } } }),
          yAxis: mergeAxis(option.yAxis, { axisLabel: { color: ink3, fontSize: 12 }, splitLine: { lineStyle: { color: line } } }),
          legend: normalizeLegend(option.legend, ink3),
        } as Parameters<typeof chart.setOption>[0],
        true,
      )
    }

    paintRef.current()
  }, [option])

  return <div ref={elRef} style={{ height }} className={cn('w-full', className)} />
}

/**
 * 图例布局兜底。
 * ⚠️ ECharts 6 把 legend 的默认位置从「顶部居中」改成了「底部居中」，
 * 而业务侧 grid 普遍是 `bottom: 8 + containLabel`，图例正好压在 X 轴标签上。
 * 这里：调用方没指定位置时统一放顶部居中；指定了（如饼图的 bottom:0）就尊重调用方。
 * 文字色始终合并主题色 —— ECharts 不认 CSS 变量，只能现取计算值。
 */
function normalizeLegend(raw: unknown, color: string): Record<string, unknown> {
  const legend = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const { textStyle, ...rest } = legend
  const hasPosition = ['top', 'bottom', 'left', 'right', 'orient'].some((k) => k in rest)
  return {
    show: true,
    type: 'scroll',
    icon: 'roundRect',
    itemWidth: 10,
    itemHeight: 10,
    itemGap: 14,
    ...(hasPosition ? {} : { top: 0, left: 'center' }),
    ...rest,
    textStyle: { color, fontSize: 12, ...(textStyle as object | undefined) },
  }
}

function mergeAxis(axis: unknown, extra: object): unknown {
  if (Array.isArray(axis)) return axis.map((a) => ({ ...(a as object), ...extra }))
  if (axis && typeof axis === 'object') return { ...(axis as object), ...extra }
  return axis
}
