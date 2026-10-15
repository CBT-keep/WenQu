/**
 * 展示层格式化。统一在这里，避免各页面各写一套。
 * 时间一律按**本地时区**渲染（后端返回 ISO8601 UTC，doc/04 附录 §7）。
 */

const pad = (n: number) => String(n).padStart(2, '0')

function toDate(s?: string | null): Date | null {
  if (!s) return null
  const d = new Date(s)
  return Number.isNaN(d.getTime()) ? null : d
}

/** 完整日期时间：2026-10-11 09:12 */
export function formatDateTime(s?: string | null): string {
  const d = toDate(s)
  if (!d) return '—'
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** 紧凑写法：今天 09:12 / 昨天 17:44 / 10-11 09:12 / 2025-12-01 */
export function formatTime(s?: string | null): string {
  const d = toDate(s)
  if (!d) return '—'
  const now = new Date()
  const hm = `${pad(d.getHours())}:${pad(d.getMinutes())}`
  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
  if (sameDay(d, now)) return `今天 ${hm}`
  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  if (sameDay(d, yesterday)) return `昨天 ${hm}`
  if (d.getFullYear() === now.getFullYear()) return `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${hm}`
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** 千分位整数 */
export function formatNumber(n?: number | null): string {
  if (n === null || n === undefined || Number.isNaN(n)) return '—'
  return n.toLocaleString('zh-CN')
}

/** 字节 → B/KB/MB/GB */
export function formatBytes(bytes?: number | null): string {
  if (!bytes || bytes < 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let v = bytes
  let i = 0
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024
    i++
  }
  return `${v >= 100 || i === 0 ? Math.round(v) : v.toFixed(1)} ${units[i]}`
}

/** 大数缩写：1,234,567 → 1.23M */
export function formatCompact(n?: number | null): string {
  if (n === null || n === undefined || Number.isNaN(n)) return '—'
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

/** 毫秒：412 → 412ms；1200 → 1.2s */
export function formatMs(ms?: number | null): string {
  if (ms === null || ms === undefined) return '—'
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${Math.round(ms)}ms`
}
