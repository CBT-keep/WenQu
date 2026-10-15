import { ApiError, http, unwrap } from '@/lib/http'
import { mockEnabled, mockDelay } from '@/lib/mock'
import { postSse } from '@/lib/sse'
import type { ApiResponse, PageResult } from '@/types/api'
import type {
  ChatMessage,
  Conversation,
  ConversationCreatePayload,
  ConversationQuery,
  ConversationUpdatePayload,
  Feedback,
  SendMessagePayload,
  SendMessageResult,
} from '@/types/chat'
import * as mock from '@/mock/chat'

/** RAG 问答 API —— doc/04 第七部分。 */

export function fetchConversations(q: ConversationQuery): Promise<PageResult<Conversation>> {
  if (mockEnabled('chat')) return mockDelay(mock.mockConversationPage(q))
  return unwrap(http.get<ApiResponse<PageResult<Conversation>>>('/conversations', { params: q }))
}

export function fetchConversation(id: number): Promise<Conversation> {
  if (mockEnabled('chat')) {
    const c = mock.mockConversationDetail(id)
    return c ? mockDelay(c) : Promise.reject(new ApiError(50001, '会话不存在'))
  }
  return unwrap(http.get<ApiResponse<Conversation>>(`/conversations/${id}`))
}

export function createConversation(payload: ConversationCreatePayload): Promise<Conversation> {
  if (mockEnabled('chat')) return mockDelay(mock.mockConversationCreate(payload))
  return unwrap(http.post<ApiResponse<Conversation>>('/conversations', payload))
}

export function updateConversation(id: number, payload: ConversationUpdatePayload): Promise<Conversation> {
  if (mockEnabled('chat')) {
    const c = mock.mockConversationUpdate(id, payload)
    return c ? mockDelay(c) : Promise.reject(new ApiError(50001, '会话不存在'))
  }
  return unwrap(http.put<ApiResponse<Conversation>>(`/conversations/${id}`, payload))
}

export async function deleteConversation(id: number): Promise<null> {
  if (mockEnabled('chat')) {
    mock.mockConversationDelete(id)
    return mockDelay(null)
  }
  return unwrap(http.delete<ApiResponse<null>>(`/conversations/${id}`))
}

export function fetchMessages(conversationId: number, page = 1, size = 50): Promise<PageResult<ChatMessage>> {
  if (mockEnabled('chat')) return mockDelay(mock.mockMessagePage(conversationId, page, size))
  return unwrap(
    http.get<ApiResponse<PageResult<ChatMessage>>>(`/conversations/${conversationId}/messages`, {
      params: { page, size, sort: 'created_at', order: 'asc' },
    }),
  )
}

/** stream=false 时的一次性发送（doc/04 §7.5） */
export function sendMessage(conversationId: number, payload: SendMessagePayload): Promise<SendMessageResult> {
  if (mockEnabled('chat')) {
    return mockDelay({
      userMessageId: Date.now(),
      assistantMessageId: Date.now() + 1,
      content: '（Mock）非流式回答占位。',
      modelName: 'gpt-4o-mini',
      promptTokens: 812,
      completionTokens: 120,
      elapsedMs: 1800,
      references: [],
    })
  }
  return unwrap(http.post<ApiResponse<SendMessageResult>>(`/conversations/${conversationId}/messages`, payload))
}

/** SSE 流式发送（doc/04 §7.5 / §1.7） */
export function streamChatMessage(
  conversationId: number,
  payload: SendMessagePayload,
  handlers: { onEvent: (event: string, data: string) => void; signal?: AbortSignal },
): Promise<void> {
  if (mockEnabled('chat')) {
    return mock.mockStreamChat(conversationId, payload, handlers)
  }
  return postSse(`/conversations/${conversationId}/messages`, {
    body: { ...payload, stream: true },
    onEvent: handlers.onEvent,
    signal: handlers.signal,
  })
}

export async function stopGeneration(conversationId: number, messageId: number): Promise<{ stopped: boolean }> {
  if (mockEnabled('chat')) return mockDelay({ stopped: true })
  return unwrap(http.post<ApiResponse<{ stopped: boolean }>>(`/conversations/${conversationId}/stop`, { messageId }))
}

export async function sendFeedback(messageId: number, feedback: Feedback): Promise<null> {
  if (mockEnabled('chat')) {
    mock.mockFeedback(messageId, feedback)
    return mockDelay(null)
  }
  return unwrap(http.put<ApiResponse<null>>(`/messages/${messageId}/feedback`, { feedback }))
}
