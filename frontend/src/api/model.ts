import { http, unwrap } from '@/lib/http'
import { mockEnabled, mockDelay } from '@/lib/mock'
import type { ApiResponse } from '@/types/api'
import type { LlmModel, ModelOption, ModelPayload, ModelTestResult, ModelType, ModelUpdatePayload } from '@/types/model'
import * as mock from '@/mock/model'

/** 模型配置 API —— doc/04 第四部分。 */

export function fetchModels(params: { type?: ModelType; enabled?: boolean } = {}): Promise<LlmModel[]> {
  return unwrap(http.get<ApiResponse<LlmModel[]>>('/models', { params }))
}

export function createModel(payload: ModelPayload): Promise<LlmModel> {
  return unwrap(http.post<ApiResponse<LlmModel>>('/models', payload))
}

export function updateModel(id: number, payload: ModelUpdatePayload): Promise<LlmModel> {
  return unwrap(http.put<ApiResponse<LlmModel>>(`/models/${id}`, payload))
}

export async function deleteModel(id: number): Promise<null> {
  return unwrap(http.delete<ApiResponse<null>>(`/models/${id}`))
}

export function testModel(id: number): Promise<ModelTestResult> {
  if (mockEnabled('model')) return mockDelay(mock.mockModelTest(id), 700)
  return unwrap(http.post<ApiResponse<ModelTestResult>>(`/models/${id}/test`))
}

export function testModelDraft(payload: ModelPayload): Promise<ModelTestResult> {
  if (mockEnabled('model')) {
    return mockDelay({ ...mock.mockModelTest(), detail: `连通正常（草稿）· ${payload.modelName}` }, 700)
  }
  return unwrap(http.post<ApiResponse<ModelTestResult>>('/models/test', payload))
}

export function setDefaultModel(id: number): Promise<LlmModel> {
  return unwrap(http.put<ApiResponse<LlmModel>>(`/models/${id}/default`))
}

export function fetchModelOptions(type?: ModelType): Promise<ModelOption[]> {
  return unwrap(http.get<ApiResponse<ModelOption[]>>('/models/options', { params: { type } }))
}

/** 知识库配置必须引用后端真实模型 ID，不能使用模型模块的演示数据。 */
export function fetchRealModelOptions(type?: ModelType): Promise<ModelOption[]> {
  return unwrap(http.get<ApiResponse<ModelOption[]>>('/models/options', { params: { type } }))
}
