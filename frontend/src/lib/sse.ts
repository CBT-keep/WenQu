import { ApiError } from './http'
import { tokenStorage } from './token'

/**
 * SSE 消费端（doc/04 §1.7）。
 *
 * 对话类接口是 `POST + Accept: text/event-stream`；浏览器原生 `EventSource` 只支持 GET、
 * 也带不上 `Authorization` 头，因此必须用 `fetch` 流式读取。
 * 解析按 SSE 帧（空行分隔），支持多行 `data:`（按规范用 `\n` 拼回）。
 */
export type SseEventName = string
export type SseListener = (event: SseEventName, data: string) => void

const BASE_URL = '/api/v1'
const FRAME_SEP = /\r?\n\r?\n/

export interface PostSseOptions {
  body?: unknown
  signal?: AbortSignal
  onEvent: SseListener
}

export async function postSse(path: string, { body, signal, onEvent }: PostSseOptions): Promise<void> {
  const token = tokenStorage.getAccessToken()
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal,
  })

  if (!res.ok || !res.body) {
    // 连接建立前失败 → 普通 JSON 错误体（doc/04 §7.5）
    throw await readError(res)
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  for (;;) {
    const { value, done } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })

    let match: RegExpExecArray | null
    while ((match = FRAME_SEP.exec(buffer)) !== null) {
      const frame = buffer.slice(0, match.index)
      buffer = buffer.slice(match.index + match[0].length)
      dispatch(frame, onEvent)
    }
  }
  // 末尾若还有未以空行收尾的残帧，也算一帧
  if (buffer.trim()) dispatch(buffer, onEvent)
}

function dispatch(frame: string, onEvent: SseListener) {
  let event = 'message'
  const dataLines: string[] = []
  for (const line of frame.split(/\r?\n/)) {
    if (!line || line.startsWith(':')) continue // 空行 / 心跳注释（: ping）
    if (line.startsWith('event:')) {
      event = line.slice(6).trim()
    } else if (line.startsWith('data:')) {
      dataLines.push(line.slice(5).replace(/^ /, ''))
    }
  }
  if (dataLines.length > 0) onEvent(event, dataLines.join('\n'))
}

async function readError(res: Response): Promise<ApiError> {
  try {
    const text = await res.text()
    const parsed = JSON.parse(text) as { code?: number; message?: string; traceId?: string }
    if (parsed && typeof parsed.code === 'number') {
      return new ApiError(parsed.code, parsed.message ?? '请求失败', parsed.traceId)
    }
  } catch {
    /* 非 JSON */
  }
  return new ApiError(res.status, `请求失败（${res.status}）`)
}

/** SSE 事件 JSON 的宽松解析 —— 单条坏帧不该拖垮整条流 */
export function parseEventJson<T>(data: string): T | null {
  try {
    return JSON.parse(data) as T
  } catch {
    return null
  }
}

/** 判断一个 AbortError（用户点「停止生成」） */
export function isAbortError(error: unknown): boolean {
  return (
    (error instanceof DOMException && error.name === 'AbortError') ||
    (error as { name?: string } | null)?.name === 'AbortError'
  )
}
