import { Database, Sparkles, type LucideIcon } from 'lucide-react'

/**
 * 对话模式的**唯一定义处**。
 *
 * 图标/文案以前在欢迎页、输入框胶囊、侧栏会话列表里各写一份，导致同一个模式
 * 一处是书本、一处是星星。凡是"表示某个模式"的地方都从这里取。
 *
 * ⚠️ 图标映射按需求方指定：RAG = 数据库、SQLBot = 星星。
 * 若日后要换，只改这一处即可全站一致。
 */
export type ChatMode = 'rag' | 'sql'

export const MODE_ORDER: readonly ChatMode[] = ['rag', 'sql']

interface ModeMeta {
  label: string
  /** 胶囊下拉里的一句话说明 */
  shortDesc: string
  /** 欢迎页大卡片的标题/说明 */
  cardTitle: string
  cardDesc: string
  Icon: LucideIcon
  /** 该模式在界面上的语义色 */
  tone: 'accent' | 'info'
}

export const MODE_META: Record<ChatMode, ModeMeta> = {
  rag: {
    label: 'RAG 问答',
    shortDesc: '检索知识库并生成带引用的回答',
    cardTitle: 'RAG 问答 · 查文档',
    cardDesc: '检索知识库并生成带引用的回答，也可查询指标口径定义',
    Icon: Database,
    tone: 'accent',
  },
  sql: {
    label: 'SQLBot 查询',
    shortDesc: '自然语言转 SQL，结果成表成图',
    cardTitle: 'SQLBot 查询 · 查数据',
    cardDesc: '自然语言转 SQL，结果成表成图，可导出',
    Icon: Sparkles,
    tone: 'info',
  },
}

/** 模式对应的文字色 class（与 tone 一起用，避免各处再写三元） */
export function modeTextClass(mode: ChatMode): string {
  return MODE_META[mode].tone === 'info' ? 'text-info' : 'text-accent'
}
