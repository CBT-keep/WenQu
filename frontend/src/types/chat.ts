/**
 * RAG 问答类型 —— 严格对齐 doc/04 第七部分与 §1.7 SSE 协议。
 */

export type ChatRole = 'USER' | 'ASSISTANT' | 'SYSTEM'
export type Feedback = 'UP' | 'DOWN' | null

export interface ChatReference {
  index: number
  chunkId: number
  documentId: number
  documentName: string
  kbId: number
  score: number
  snippet: string
}

export interface ChatMessage {
  id: number
  role: ChatRole
  content: string
  modelName?: string | null
  promptTokens?: number | null
  completionTokens?: number | null
  elapsedMs?: number | null
  finishReason?: string | null
  feedback?: Feedback
  errorMsg?: string | null
  references?: ChatReference[]
  createdAt: string
}

export interface Conversation {
  id: number
  title: string
  kbIds: number[]
  chatModelId?: number | null
  chatModelName?: string | null
  messageCount: number
  ownerId: number
  createdAt: string
  updatedAt: string
}

export interface ConversationQuery {
  page?: number
  size?: number
  keyword?: string
}

export interface ConversationCreatePayload {
  title?: string
  kbIds?: number[]
  chatModelId?: number
}

export type ConversationUpdatePayload = Partial<ConversationCreatePayload>

export interface SendMessagePayload {
  content: string
  stream?: boolean
  kbIds?: number[]
  topK?: number
  rerankEnabled?: boolean
}

/** stream=false 时的一次性返回（doc/04 §7.5） */
export interface SendMessageResult {
  userMessageId: number
  assistantMessageId: number
  content: string
  modelName: string
  promptTokens: number
  completionTokens: number
  elapsedMs: number
  references: ChatReference[]
}

// ---------------- SSE 事件 payload ----------------

export interface SseMeta {
  conversationId: number
  messageId: number
}

export interface SseRetrieval {
  references: ChatReference[]
}

export interface SseDelta {
  content: string
}

export interface SseUsage {
  promptTokens: number
  completionTokens: number
  model: string
}

export interface SseDone {
  messageId: number
  finishReason?: 'stop' | 'length' | 'abort'
}

export interface SseError {
  code: number
  message: string
}
