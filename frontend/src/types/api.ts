/**
 * 统一响应体 —— doc/04-API接口规范.md §1.3
 * { code, message, data, traceId }；code=0 为成功。
 */
export interface ApiResponse<T> {
  code: number
  message: string
  data: T
  traceId?: string
}

/** 分页响应 —— doc/04 §1.4（字段名以文档为准：records / pages） */
export interface PageResult<T> {
  page: number
  size: number
  total: number
  pages: number
  records: T[]
}
