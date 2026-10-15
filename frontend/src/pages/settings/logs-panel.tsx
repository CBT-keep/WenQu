import { useState } from 'react'
import { keepPreviousData, useMutation, useQuery } from '@tanstack/react-query'
import { Download, Search } from 'lucide-react'
import { Tag } from '@/components/ui/tag'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { ErrorBlock, LoadingBlock } from '@/components/ui/feedback'
import { Modal } from '@/components/ui/modal'
import { Pagination } from '@/components/ui/pagination'
import { Button } from '@/components/ui/button'
import { exportLogs, fetchLogs } from '@/api/system'
import { toApiError } from '@/lib/http'
import { formatDateTime } from '@/lib/format'
import { LOG_TYPE } from '@/lib/status'
import { rowBtn, tagColWide } from '@/lib/styles'
import type { LogQuery, OperationLog } from '@/types'
import { useToastStore } from '@/stores/toast'

export function LogsPanel() {
  const pushToast = useToastStore((s) => s.push)
  const [query, setQuery] = useState<LogQuery>({ page: 1, size: 20, type: '', result: '', keyword: '' })
  const [keywordInput, setKeywordInput] = useState('')
  const [detail, setDetail] = useState<OperationLog | null>(null)

  const { data, isLoading, error } = useQuery({
    queryKey: ['logs', query],
    queryFn: () => fetchLogs(cleanQuery(query)),
    placeholderData: keepPreviousData,
  })

  const exportMut = useMutation({
    mutationFn: () => exportLogs(cleanQuery(query)),
    onSuccess: () => pushToast('已导出操作日志'),
    onError: (e) => pushToast(toApiError(e).message),
  })

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <p className="min-w-[220px] flex-1 text-[14px] text-ink-3">
          审计所有写操作与敏感行为（登录 / 删除 / 配置变更 / SQL 执行）。
        </p>
        <Select
          wrapperClassName="w-32"
          className="h-9"
          value={query.type}
          onChange={(e) => setQuery((q) => ({ ...q, type: e.target.value as LogQuery['type'], page: 1 }))}
        >
          <option value="">全部类型</option>
          {Object.entries(LOG_TYPE).map(([k, v]) => (
            <option key={k} value={k}>
              {v.label}
            </option>
          ))}
        </Select>
        <Select
          wrapperClassName="w-28"
          className="h-9"
          value={query.result}
          onChange={(e) => setQuery((q) => ({ ...q, result: e.target.value as LogQuery['result'], page: 1 }))}
        >
          <option value="">全部结果</option>
          <option value="SUCCESS">成功</option>
          <option value="FAILURE">失败</option>
        </Select>
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-ink-4" />
          <Input
            value={keywordInput}
            onChange={(e) => setKeywordInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') setQuery((q) => ({ ...q, keyword: keywordInput.trim(), page: 1 }))
            }}
            placeholder="操作人 / 行为 / IP"
            className="h-9 w-48 rounded-md border-line-strong bg-bg-card pl-8 text-[14px]"
          />
        </div>
        <Button variant="outline" onClick={() => exportMut.mutate()} disabled={exportMut.isPending}>
          <Download />
          导出
        </Button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-line bg-bg-card">
        <table className="w-full min-w-[940px] text-left text-[14px]">
          <thead>
            <tr>
              {['时间', '操作人', '类型', '行为', '目标 / 详情', 'IP', '结果'].map((h) => (
                <th key={h} className="border-b border-line bg-bg-section px-4 py-2.5 text-[13px] font-medium whitespace-nowrap text-ink-3">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data?.records.map((log) => {
              const type = LOG_TYPE[log.type] ?? LOG_TYPE.SYSTEM
              return (
                <tr
                  key={log.id}
                  className="cursor-pointer border-b border-line last:border-0 hover:bg-bg-hover/60"
                  onClick={() => setDetail(log)}
                >
                  <td className="px-4 py-2.5 whitespace-nowrap font-mono text-[13px] text-ink-3">
                    {formatDateTime(log.createdAt)}
                  </td>
                  <td className="px-4 py-2.5 text-ink-2">{log.username ?? '—'}</td>
                  <td className="px-4 py-2.5">
                    <Tag tone={type.tone} className={tagColWide}>
                      {type.label}
                    </Tag>
                  </td>
                  <td className="px-4 py-2.5 text-ink">{log.action}</td>
                  <td className="max-w-[280px] truncate px-4 py-2.5 font-mono text-[13px] text-ink-2">
                    {log.detail ?? log.target ?? '—'}
                  </td>
                  <td className="px-4 py-2.5 font-mono text-[13px] text-ink-3">{log.ip ?? '—'}</td>
                  <td className="px-4 py-2.5">
                    <Tag tone={log.result === 'SUCCESS' ? 'green' : 'red'}>
                      {log.result === 'SUCCESS' ? '成功' : '失败'}
                    </Tag>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {isLoading && <LoadingBlock />}
        {error && <ErrorBlock message={toApiError(error).message} />}
        {!isLoading && !error && data?.records.length === 0 && (
          <div className="py-10 text-center text-[13.5px] text-ink-3">没有符合条件的日志</div>
        )}
      </div>

      {data && data.total > 0 && (
        <Pagination
          className="mt-4"
          page={data.page}
          pages={data.pages}
          total={data.total}
          label="条日志"
          onPage={(p) => setQuery((q) => ({ ...q, page: p }))}
        />
      )}

      {detail && (
        <Modal open onClose={() => setDetail(null)} title={`日志详情 #${detail.id}`} width="max-w-[520px]">
          <dl className="space-y-2.5 text-[14px]">
            <Row label="时间" value={formatDateTime(detail.createdAt)} />
            <Row label="操作人" value={detail.username ?? '—'} />
            <Row label="类型" value={LOG_TYPE[detail.type]?.label ?? detail.type} />
            <Row label="行为" value={detail.action} />
            <Row label="目标" value={detail.target ?? '—'} />
            <Row label="IP" value={detail.ip ?? '—'} />
            <Row label="Trace" value={detail.traceId ?? '—'} mono />
          </dl>
          {detail.detail && (
            <div className="mt-4">
              <p className="mb-1.5 text-[13.5px] text-ink-3">详情</p>
              <pre className="overflow-x-auto rounded-md bg-bg-section p-3 font-mono text-[13px] whitespace-pre-wrap text-ink-2">
                {detail.detail}
              </pre>
            </div>
          )}
          <div className="mt-5 flex justify-end">
            <button type="button" className={rowBtn} onClick={() => setDetail(null)}>
              关闭
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <dt className="flex-none text-ink-3">{label}</dt>
      <dd className={mono ? 'min-w-0 truncate font-mono text-ink-2' : 'min-w-0 text-right text-ink'}>{value}</dd>
    </div>
  )
}

function cleanQuery(q: LogQuery): LogQuery {
  return {
    page: q.page,
    size: q.size,
    ...(q.type ? { type: q.type } : {}),
    ...(q.result ? { result: q.result } : {}),
    ...(q.keyword ? { keyword: q.keyword } : {}),
  }
}
