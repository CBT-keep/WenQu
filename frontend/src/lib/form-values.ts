export function parseObject(value: string): Record<string, unknown> {
  const parsed: unknown = JSON.parse(value || '{}')
  if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object') throw new Error('高级参数必须是 JSON 对象')
  return parsed as Record<string, unknown>
}
