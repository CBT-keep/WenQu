import { useMemo } from 'react'
import { useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { fetchConversations } from '@/api/chat'
import { fetchSqlConversations } from '@/api/sqlbot'
import type { Conversation } from '@/types'

export interface ChatConversationEntry {
  id: number
  mode: 'rag' | 'sql'
  title: string
  updatedAt: string
}

const SIZE = 20

/** 侧栏「最近会话」：RAG 与 SQLBot 两套会话合并，按更新时间倒序 */
export function useRecentConversations() {
  const ragQuery = useQuery({
    queryKey: ['conversations', { page: 1, size: SIZE }],
    queryFn: () => fetchConversations({ page: 1, size: SIZE }),
  })
  const sqlQuery = useQuery({
    queryKey: ['sql-conversations', { page: 1, size: SIZE }],
    queryFn: () => fetchSqlConversations({ page: 1, size: SIZE }),
  })

  const entries = useMemo<ChatConversationEntry[]>(() => {
    const rag: ChatConversationEntry[] = (ragQuery.data?.records ?? []).map((c: Conversation) => ({
      id: c.id,
      mode: 'rag',
      title: c.title,
      updatedAt: c.updatedAt,
    }))
    const sql: ChatConversationEntry[] = (sqlQuery.data?.records ?? []).map((c) => ({
      id: c.id,
      mode: 'sql',
      title: c.title,
      updatedAt: c.updatedAt,
    }))
    return [...rag, ...sql].sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))
  }, [ragQuery.data, sqlQuery.data])

  return {
    entries,
    isLoading: ragQuery.isLoading || sqlQuery.isLoading,
    error: ragQuery.error ?? sqlQuery.error,
  }
}

/** 会话列表变更后刷新侧栏（新建 / 发送 / 删除会话时调用） */
export function invalidateConversations(client: QueryClient) {
  client.invalidateQueries({ queryKey: ['conversations'] })
  client.invalidateQueries({ queryKey: ['sql-conversations'] })
}

export function useInvalidateConversations() {
  const client = useQueryClient()
  return () => invalidateConversations(client)
}
