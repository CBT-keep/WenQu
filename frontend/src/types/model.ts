/** 模型配置类型 —— 严格对齐 doc/04 第四部分。 */

export type ModelType = 'CHAT' | 'EMBEDDING' | 'RERANK'

export interface LlmModel {
  id: number
  name: string
  type: ModelType
  provider: string
  baseUrl: string
  /** 永不明文返回，仅掩码（doc/04 §4.1） */
  apiKeyMasked?: string
  modelName: string
  dimension?: number | null
  temperature?: number | null
  maxTokens?: number | null
  timeoutMs?: number
  isDefault: boolean
  enabled: boolean
  extraParams?: Record<string, unknown> | null
  createdAt: string
}

export interface ModelPayload {
  name: string
  type: ModelType
  provider: string
  baseUrl: string
  apiKey: string
  modelName: string
  dimension?: number
  temperature?: number
  maxTokens?: number
  timeoutMs?: number
  isDefault?: boolean
  enabled?: boolean
  extraParams?: Record<string, unknown>
}

/** 编辑：均可选；type 不可改；apiKey 不传则保留（doc/04 §4.3） */
export type ModelUpdatePayload = Partial<Omit<ModelPayload, 'type'>> & { type?: never }

export interface ModelTestResult {
  success: boolean
  latencyMs: number
  modelName: string
  echo?: string | null
  detail: string
}

export interface ModelOption {
  id: number
  name: string
  type: ModelType
  isDefault: boolean
}
