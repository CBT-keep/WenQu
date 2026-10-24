import type { LlmModel, ModelOption, ModelPayload, ModelTestResult } from '@/types/model'

/** 模型配置内存 Mock。**后端就绪后整个文件可删**。 */

function iso(daysAgo: number): string {
  const d = new Date()
  d.setDate(d.getDate() - daysAgo)
  return d.toISOString()
}

let modelSeq = 4

export const mockModels: LlmModel[] = [
  {
    id: 1,
    name: 'gpt-4o-mini',
    type: 'CHAT',
    provider: 'openai',
    baseUrl: 'https://api.openai.com/v1',
    apiKeyMasked: 'sk-****abcd',
    modelName: 'gpt-4o-mini',
    temperature: 0.7,
    maxTokens: 4096,
    timeoutMs: 60000,
    isDefault: true,
    enabled: true,
    extraParams: {},
    createdAt: iso(200),
  },
  {
    id: 2,
    name: 'qwen-plus',
    type: 'CHAT',
    provider: 'dashscope',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    apiKeyMasked: 'sk-****7f21',
    modelName: 'qwen-plus',
    temperature: 0.5,
    maxTokens: 8192,
    timeoutMs: 60000,
    isDefault: false,
    enabled: true,
    extraParams: {},
    createdAt: iso(120),
  },
  {
    id: 3,
    name: 'bge-m3',
    type: 'EMBEDDING',
    provider: 'openai',
    baseUrl: 'https://llm.example.com/v1',
    apiKeyMasked: 'sk-****9c02',
    modelName: 'bge-m3',
    dimension: 1024,
    timeoutMs: 60000,
    isDefault: true,
    enabled: true,
    extraParams: {},
    createdAt: iso(200),
  },
  {
    id: 4,
    name: 'bge-reranker-v2-m3',
    type: 'RERANK',
    provider: 'custom',
    baseUrl: 'https://llm.internal/v1',
    apiKeyMasked: 'sk-****1122',
    modelName: 'bge-reranker-v2-m3',
    timeoutMs: 60000,
    isDefault: true,
    enabled: false,
    extraParams: { rerank_path: '/v1/rerank' },
    createdAt: iso(60),
  },
]

export function mockModelList(type?: string, enabled?: boolean) {
  let list = [...mockModels]
  if (type) list = list.filter((m) => m.type === type)
  if (enabled !== undefined) list = list.filter((m) => m.enabled === enabled)
  return list
}

export function mockModelCreate(payload: ModelPayload): LlmModel {
  const created: LlmModel = {
    id: ++modelSeq,
    name: payload.name,
    type: payload.type,
    provider: payload.provider,
    baseUrl: payload.baseUrl,
    apiKeyMasked: mask(payload.apiKey),
    modelName: payload.modelName,
    dimension: payload.dimension ?? null,
    temperature: payload.temperature ?? (payload.type === 'CHAT' ? 0.7 : null),
    maxTokens: payload.maxTokens ?? (payload.type === 'CHAT' ? 4096 : null),
    timeoutMs: payload.timeoutMs ?? 60000,
    isDefault: payload.isDefault ?? false,
    enabled: payload.enabled ?? true,
    extraParams: payload.extraParams ?? {},
    createdAt: new Date().toISOString(),
  }
  if (created.isDefault) clearDefault(created.type)
  mockModels.push(created)
  return created
}

export function mockModelUpdate(id: number, payload: Partial<ModelPayload>): LlmModel | null {
  const m = mockModels.find((x) => x.id === id)
  if (!m) return null
  const { apiKey, ...rest } = payload
  Object.assign(m, rest)
  if (apiKey) m.apiKeyMasked = mask(apiKey)
  if (payload.isDefault) clearDefault(m.type, m.id)
  return m
}

export function mockModelDelete(id: number): boolean {
  const i = mockModels.findIndex((m) => m.id === id)
  if (i < 0) return false
  mockModels.splice(i, 1)
  return true
}

export function mockModelOptions(type?: string): ModelOption[] {
  return mockModels
    .filter((m) => m.enabled && (!type || m.type === type))
    .map((m) => ({ id: m.id, name: m.name, type: m.type, isDefault: m.isDefault }))
}

export function mockModelTest(id?: number): ModelTestResult {
  const m = id ? mockModels.find((x) => x.id === id) : undefined
  if (m) m.enabled = true
  return {
    success: true,
    latencyMs: 842,
    modelName: m?.modelName ?? 'gpt-4o-mini',
    echo: 'pong',
    detail: m?.type === 'EMBEDDING' ? 'Embedding 模型连通正常，维度 1024' : 'Chat 模型连通正常',
  }
}

function clearDefault(type: LlmModel['type'], exceptId?: number) {
  for (const m of mockModels) {
    if (m.type === type && m.id !== exceptId) m.isDefault = false
  }
}

function mask(key: string): string {
  if (!key) return 'sk-****'
  const tail = key.slice(-4)
  return `sk-****${tail}`
}
