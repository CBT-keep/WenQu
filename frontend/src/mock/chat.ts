import type {
  ChatMessage,
  Conversation,
  ConversationCreatePayload,
  ConversationQuery,
  ConversationUpdatePayload,
  SendMessagePayload,
} from '@/types/chat'
import { paginate } from '@/lib/mock'

/** RAG 问答的内存 Mock。**后端就绪后整个文件可删**。 */

function iso(minutesAgo: number): string {
  return new Date(Date.now() - minutesAgo * 60_000).toISOString()
}

let convSeq = 88
let msgSeq = 5000

export const mockConversations: Conversation[] = [
  conv(88, '如何重置管理员密码？', [1, 2], 4, iso(2)),
  conv(87, '报销流程是怎么走的？', [2], 6, iso(180)),
  conv(86, 'v3.2 相比 v3.1 有哪些变更？', [1], 2, iso(1500)),
  conv(85, 'API 鉴权方式说明', [1], 8, iso(3000)),
  conv(84, '数据源连接失败怎么排查', [1, 2], 4, iso(4400)),
]

function conv(id: number, title: string, kbIds: number[], messageCount: number, updatedAt: string): Conversation {
  return {
    id,
    title,
    kbIds,
    chatModelId: 1,
    chatModelName: 'gpt-4o-mini',
    messageCount,
    ownerId: 1,
    createdAt: updatedAt,
    updatedAt,
  }
}

export const mockChatMessages: Record<number, ChatMessage[]> = {
  88: [
    {
      id: 1023,
      role: 'USER',
      content: '如何重置管理员密码？',
      createdAt: iso(4),
    },
    {
      id: 1024,
      role: 'ASSISTANT',
      content:
        '管理员密码重置流程如下[1]：\n1. 进入 **系统管理 → 用户管理**；\n2. 选择目标用户，点击「重置密码」；\n3. 系统生成一次性临时密码[2]，24 小时内有效；\n4. 用户首次登录后会被强制修改密码[2]。\n\n注意：连续输错 5 次将锁定账户 30 分钟[2]。',
      modelName: 'gpt-4o-mini',
      promptTokens: 812,
      completionTokens: 426,
      elapsedMs: 2310,
      finishReason: 'stop',
      feedback: null,
      references: [
        { index: 1, chunkId: 1280, documentId: 7, documentName: '产品使用手册 v3.2.pdf', kbId: 1, score: 0.951, snippet: '管理员密码重置：进入系统管理 → 用户管理 → 选择目标用户 → 重置密码…' },
        { index: 2, chunkId: 1281, documentId: 12, documentName: '常见问题 FAQ 与排障指南.txt', kbId: 1, score: 0.742, snippet: '密码策略：临时密码有效期为 24 小时，连续 5 次输错将锁定账户 30 分钟…' },
      ],
      createdAt: iso(4),
    },
    {
      id: 1025,
      role: 'USER',
      content: '那临时密码能改成永久的吗？',
      createdAt: iso(1),
    },
    {
      id: 1026,
      role: 'ASSISTANT',
      content:
        '不能。临时密码仅用于首次登录，用户登录后会被强制修改为自设的长期密码[1]。这属于账户安全策略的一部分，无法跳过。',
      modelName: 'gpt-4o-mini',
      promptTokens: 690,
      completionTokens: 88,
      elapsedMs: 1540,
      finishReason: 'stop',
      feedback: null,
      references: [
        { index: 1, chunkId: 1281, documentId: 7, documentName: '产品使用手册 v3.2.pdf', kbId: 1, score: 0.882, snippet: '密码策略：临时密码有效期 24 小时；用户首次登录后强制修改密码…' },
      ],
      createdAt: iso(1),
    },
  ],
}

export function mockConversationPage(q: ConversationQuery) {
  let list = [...mockConversations]
  if (q.keyword) list = list.filter((c) => c.title.includes(q.keyword!))
  return paginate(list, q.page ?? 1, q.size ?? 20)
}

export function mockConversationDetail(id: number): Conversation | undefined {
  return mockConversations.find((c) => c.id === id)
}

export function mockConversationCreate(payload: ConversationCreatePayload): Conversation {
  const now = new Date().toISOString()
  const created: Conversation = {
    id: ++convSeq,
    title: payload.title ?? '新会话',
    kbIds: payload.kbIds ?? [],
    chatModelId: payload.chatModelId ?? 1,
    chatModelName: 'gpt-4o-mini',
    messageCount: 0,
    ownerId: 1,
    createdAt: now,
    updatedAt: now,
  }
  mockConversations.unshift(created)
  mockChatMessages[created.id] = []
  return created
}

export function mockConversationUpdate(id: number, payload: ConversationUpdatePayload) {
  const c = mockConversations.find((x) => x.id === id)
  if (!c) return null
  Object.assign(c, payload, { updatedAt: new Date().toISOString() })
  return c
}

export function mockConversationDelete(id: number): boolean {
  const i = mockConversations.findIndex((c) => c.id === id)
  if (i < 0) return false
  mockConversations.splice(i, 1)
  delete mockChatMessages[id]
  return true
}

export function mockMessagePage(conversationId: number, page = 1, size = 50) {
  const list = mockChatMessages[conversationId] ?? []
  return paginate(list, page, size)
}

export function mockFeedback(messageId: number, feedback: 'UP' | 'DOWN' | null): boolean {
  for (const list of Object.values(mockChatMessages)) {
    const m = list.find((x) => x.id === messageId)
    if (m) {
      m.feedback = feedback
      return true
    }
  }
  return false
}

// ---------------- 流式生成模拟 ----------------

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Aborted', 'AbortError'))
      return
    }
    const timer = window.setTimeout(() => {
      signal?.removeEventListener('abort', onAbort)
      resolve()
    }, ms)
    function onAbort() {
      window.clearTimeout(timer)
      reject(new DOMException('Aborted', 'AbortError'))
    }
    signal?.addEventListener('abort', onAbort, { once: true })
  })
}

/** 依据问题拼一段带角标的答案，让流式演示看起来像真的 */
function craftAnswer(question: string): { text: string; references: ChatMessage['references'] } {
  const references = [
    { index: 1, chunkId: 1280, documentId: 7, documentName: '产品使用手册 v3.2.pdf', kbId: 1, score: 0.951, snippet: '管理员密码重置：进入系统管理 → 用户管理 → 选择目标用户 → 重置密码…' },
    { index: 2, chunkId: 1281, documentId: 12, documentName: '常见问题 FAQ 与排障指南.txt', kbId: 1, score: 0.742, snippet: '密码策略：临时密码有效期为 24 小时，连续 5 次输错将锁定账户 30 分钟…' },
  ]
  const text =
    `关于「${question.trim()}」，根据知识库检索到的内容[1]：\n\n` +
    '1. 进入 **系统管理 → 用户管理**，选择目标用户；\n' +
    '2. 点击「重置密码」，系统将生成一次性临时密码[2]；\n' +
    '3. 临时密码 24 小时内有效，用户首次登录后会被强制修改[2]。\n\n' +
    '如需进一步了解，可查看引用来源中的原文片段。'
  return { text, references }
}

export interface MockStreamHandlers {
  onEvent: (event: string, data: string) => void
  signal?: AbortSignal
}

/** 模拟 POST /conversations/{id}/messages 的 SSE 流 */
export async function mockStreamChat(
  conversationId: number,
  payload: SendMessagePayload,
  { onEvent, signal }: MockStreamHandlers,
): Promise<void> {
  const send = (event: string, data: unknown) => onEvent(event, JSON.stringify(data))

  const list = (mockChatMessages[conversationId] ??= [])
  const userMsg: ChatMessage = {
    id: ++msgSeq,
    role: 'USER',
    content: payload.content,
    createdAt: new Date().toISOString(),
  }
  list.push(userMsg)

  const assistantId = ++msgSeq
  const conv = mockConversations.find((c) => c.id === conversationId)
  if (conv) {
    conv.messageCount = list.length + 1
    conv.updatedAt = new Date().toISOString()
    if (conv.title === '新会话') conv.title = payload.content.slice(0, 20)
  }

  await sleep(180, signal)
  send('meta', { conversationId, messageId: assistantId })

  await sleep(320, signal)
  const { text, references } = craftAnswer(payload.content)
  send('retrieval', { references })

  const assistant: ChatMessage = {
    id: assistantId,
    role: 'ASSISTANT',
    content: '',
    modelName: 'gpt-4o-mini',
    promptTokens: 812,
    completionTokens: 0,
    finishReason: null,
    feedback: null,
    references,
    createdAt: new Date().toISOString(),
  }
  list.push(assistant)

  // 逐字推流：按 2–3 字一个 delta，节奏接近真实首字延迟后的输出
  let i = 0
  while (i < text.length) {
    await sleep(22, signal)
    const chunk = text.slice(i, i + 2)
    i += 2
    assistant.content += chunk
    send('delta', { content: chunk })
  }

  await sleep(120, signal)
  assistant.completionTokens = Math.round(text.length / 1.6)
  assistant.elapsedMs = 2310
  send('usage', { promptTokens: 812, completionTokens: assistant.completionTokens, model: 'gpt-4o-mini' })
  assistant.finishReason = 'stop'
  send('done', { messageId: assistantId, finishReason: 'stop' })
}
