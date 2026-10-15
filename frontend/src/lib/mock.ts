import type { PageResult } from '@/types/api'

/**
 * 契约优先 + 可开关 Mock 层。
 *
 * 后端 KB / Chat / SQLBot / Dashboard / 模型 尚未实现，但前端要能完整演示：
 * 每个 API 函数都先按 doc/04 的真实契约写好，再由本层判断是否短路成 Mock 数据。
 * 后端每就绪一个模块，改 `.env` 里的 `VITE_MOCK`（或删掉该模块名）即可切回真实调用，
 * 业务代码与页面**无需改动**。
 *
 * 生产构建 `VITE_MOCK=none` 时 `mockEnabled()` 恒为 false，mock 分支永不执行。
 * 真正确认后端全量就绪后，删掉各 api 里的 if 分支与 `src/mock/**` 即可。
 */
export type MockModule = 'kb' | 'chat' | 'sqlbot' | 'model' | 'system'

export const MOCK_MODULES: readonly MockModule[] = ['kb', 'chat', 'sqlbot', 'model', 'system']

const RAW = (import.meta.env.VITE_MOCK ?? 'all').trim().toLowerCase()

function resolveEnabled(): Set<MockModule> {
  if (RAW === 'all') return new Set(MOCK_MODULES)
  if (RAW === 'none' || RAW === '') return new Set()
  const wanted = new Set(RAW.split(',').map((s) => s.trim()).filter(Boolean))
  return new Set(MOCK_MODULES.filter((m) => wanted.has(m)))
}

const ENABLED = resolveEnabled()

/** 该模块是否走 Mock。开发期在控制台可读 window.__wenquMockModules 确认当前生效集 */
export function mockEnabled(module: MockModule): boolean {
  return ENABLED.has(module)
}

if (typeof window !== 'undefined') {
  ;(window as unknown as { __wenquMockModules?: string[] }).__wenquMockModules = [...ENABLED]
}

/** 给 Mock 结果加一点延迟，让加载态 / 骨架屏在开发期也能被看到 */
export function mockDelay<T>(data: T, ms = 240): Promise<T> {
  return new Promise((resolve) => window.setTimeout(() => resolve(data), ms))
}

/** 在内存数组上做分页，模拟后端分页语义（doc/04 §1.4） */
export function paginate<T>(records: T[], page = 1, size = 20): PageResult<T> {
  const total = records.length
  const pages = Math.max(1, Math.ceil(total / size))
  const start = (page - 1) * size
  return { page, size, total, pages, records: records.slice(start, start + size) }
}

/** 空分页 */
export function emptyPage<T>(size = 20): PageResult<T> {
  return { page: 1, size, total: 0, pages: 0, records: [] }
}
