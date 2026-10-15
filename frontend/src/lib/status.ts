import type { TagTone } from '@/components/ui/tag'

/** 状态 → 文案 + Tag 配色，集中一处，免得各页面各写一套。 */

export interface StatusStyle {
  label: string
  tone: TagTone
}

export const KB_STATUS: Record<string, StatusStyle> = {
  READY: { label: '已就绪', tone: 'green' },
  INDEXING: { label: '索引中', tone: 'amber' },
  EMPTY: { label: '空库', tone: 'gray' },
}

export const DOC_STATUS: Record<string, StatusStyle> = {
  PENDING: { label: '排队中', tone: 'gray' },
  PARSING: { label: '解析中', tone: 'amber' },
  CHUNKING: { label: '切分中', tone: 'amber' },
  EMBEDDING: { label: '向量化', tone: 'amber' },
  READY: { label: '已就绪', tone: 'green' },
  FAILED: { label: '解析失败', tone: 'red' },
}

export const DATASOURCE_STATUS: Record<string, StatusStyle> = {
  OK: { label: '正常', tone: 'green' },
  ERROR: { label: '连接失败', tone: 'red' },
  UNKNOWN: { label: '未验证', tone: 'amber' },
}

export const SYNC_STATUS: Record<string, StatusStyle> = {
  IDLE: { label: '空闲', tone: 'gray' },
  RUNNING: { label: '同步中', tone: 'amber' },
  SUCCESS: { label: '同步完成', tone: 'green' },
  FAILED: { label: '同步失败', tone: 'red' },
}

export const MODEL_TYPE_TONE: Record<string, TagTone> = {
  CHAT: 'accent',
  EMBEDDING: 'gray',
  RERANK: 'amber',
}

export const MODEL_PROVIDER: Record<string, string> = {
  openai: 'OpenAI',
  dashscope: 'DashScope',
  custom: '自定义',
}

export const LOG_TYPE: Record<string, StatusStyle> = {
  LOGIN: { label: '登录', tone: 'gray' },
  KB: { label: '知识库', tone: 'accent' },
  DOC: { label: '文档', tone: 'accent' },
  CHAT: { label: '问答', tone: 'green' },
  SQL: { label: 'SQL 执行', tone: 'accent' },
  SYSTEM: { label: '系统变更', tone: 'red' },
}

export const ROLE: Record<string, StatusStyle> = {
  SUPERADMIN: { label: 'SUPERADMIN', tone: 'red' },
  ADMIN: { label: 'ADMIN', tone: 'amber' },
  USER: { label: 'USER', tone: 'gray' },
}

export const USER_STATUS: Record<string, StatusStyle> = {
  ENABLED: { label: '启用', tone: 'green' },
  DISABLED: { label: '禁用', tone: 'red' },
}

export const RETRIEVAL_MODE: Record<string, string> = {
  HYBRID: '混合检索',
  VECTOR: '仅向量',
  BM25: '仅关键词',
}
