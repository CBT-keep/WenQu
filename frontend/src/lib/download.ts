import { ApiError, http } from './http'

/**
 * 带鉴权的文件下载 / 导出。
 *
 * 后端「下载文档」「导出 CSV/Excel」都以**二进制流**返回（doc/04 §6.6 / §8.18），
 * 且鉴权走 `Authorization` 头 —— 不能用 `<a href>` 直接下载（带不上 Header）。
 * 统一走：fetch → blob → objectURL → 触发下载。
 */

/** 从 Content-Disposition 解析文件名，兼容 `filename*=UTF-8''%E4%B8%AD%E6%96%87` */
export function filenameFromDisposition(disposition?: string): string | undefined {
  if (!disposition) return undefined
  const star = /filename\*=UTF-8''([^;]+)/i.exec(disposition)
  if (star) {
    try {
      return decodeURIComponent(star[1].trim())
    } catch {
      return star[1].trim()
    }
  }
  const plain = /filename="?([^";]+)"?/i.exec(disposition)
  return plain?.[1]?.trim()
}

async function readErrorBlob(blob: unknown): Promise<ApiError | null> {
  if (!(blob instanceof Blob)) return null
  try {
    const text = await blob.text()
    const parsed = JSON.parse(text) as { code?: number; message?: string; traceId?: string }
    if (parsed && typeof parsed.code === 'number') {
      return new ApiError(parsed.code, parsed.message ?? '导出失败', parsed.traceId)
    }
  } catch {
    /* 非 JSON，交给上层兜底 */
  }
  return null
}

export async function downloadBlob(
  url: string,
  opts: {
    method?: 'GET' | 'POST'
    data?: unknown
    params?: Record<string, unknown>
    fallbackName?: string
  } = {},
): Promise<string> {
  try {
    const res = await http.request<Blob>({
      url,
      method: opts.method ?? 'GET',
      data: opts.data,
      params: opts.params,
      responseType: 'blob',
    })
    const name = filenameFromDisposition(res.headers['content-disposition']) ?? opts.fallbackName ?? 'download'
    triggerDownload(res.data, name)
    return name
  } catch (error) {
    // axios 错误里 blob 形式的响应体要手动读出来才能拿到 message
    const data = (error as { response?: { data?: unknown } }).response?.data
    const parsed = await readErrorBlob(data)
    throw parsed ?? error
  }
}

/** 直接存下一个内存中的 Blob（Mock 导出用，也供调用方复用） */
export function saveBlob(blob: Blob, filename: string) {
  triggerDownload(blob, filename)
}

function triggerDownload(blob: Blob, filename: string) {
  const objectUrl = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = objectUrl
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  // 立刻 revoke 在部分浏览器会中断下载，延后一拍更稳
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 4000)
}
