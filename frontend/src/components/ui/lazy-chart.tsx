import { Suspense, lazy } from 'react'

/**
 * ECharts 体积较大（core + 3 类图表 ≈ 700KB），单独动态引入：
 * 首屏不加载图表库，只在真的渲染图表时才拉这个 chunk。
 */
const EChartLazy = lazy(() => import('./echart').then((m) => ({ default: m.EChart })))

export function EChart({ option, height = 220, className }: { option: Record<string, unknown>; height?: number; className?: string }) {
  return (
    <Suspense
      fallback={
        <div style={{ height }} className="grid place-items-center text-[13.5px] text-ink-3">
          图表加载中…
        </div>
      }
    >
      <EChartLazy option={option} height={height} className={className} />
    </Suspense>
  )
}
