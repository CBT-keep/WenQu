import { Check, Copy, FileSearch, Pencil } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'

/**
 * SQL 代码块（原型 `.code`）。深色底固定不随主题变 —— SQL 域的"终端感"是刻意的。
 * 标题栏做成 macOS 窗口样式（三颗红黄绿圆点 + 圆角 + 外沿 + 投影），
 * 一眼就能认出"这是代码/终端"，而不是普通卡片。
 * 关键词/字符串/注释做轻量着色，避免引整套语法高亮依赖。
 */
export function SqlBlock({
  sql,
  title,
  onEdit,
  onExplain,
  className,
}: {
  sql: string
  title?: string
  onEdit?: () => void
  onExplain?: () => void
  className?: string
}) {
  const [copied, setCopied] = useState(false)

  function copy() {
    navigator.clipboard?.writeText(sql).catch(() => undefined)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className={cn('overflow-hidden rounded-xl border border-[#21262d] shadow-[0_10px_30px_-12px_rgba(0,0,0,.55)]', className)}>
      {/* 标题栏：左侧三颗红黄绿圆点 —— macOS 窗口的辨识点，一眼就知道这是"代码/终端" */}
      <div className="flex items-center gap-2.5 border-b border-[#21262d] bg-[#161b22] px-3 py-2">
        <span className="flex flex-none items-center gap-2" aria-hidden="true">
          <span className="size-[11px] rounded-full bg-[#ff5f57] shadow-[inset_0_0_0_0.5px_rgba(0,0,0,.25)]" />
          <span className="size-[11px] rounded-full bg-[#febc2e] shadow-[inset_0_0_0_0.5px_rgba(0,0,0,.25)]" />
          <span className="size-[11px] rounded-full bg-[#28c840] shadow-[inset_0_0_0_0.5px_rgba(0,0,0,.25)]" />
        </span>
        <span className="min-w-0 flex-1 truncate font-mono text-[13px] text-[#8b949e]">
          {title ?? '生成的 SQL'}
        </span>
        <button type="button" onClick={copy} className={headBtn}>
          {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
          {copied ? '已复制' : '复制'}
        </button>
        {onEdit && (
          <button type="button" onClick={onEdit} className={headBtn}>
            <Pencil className="size-3" />
            编辑
          </button>
        )}
        {onExplain && (
          <button type="button" onClick={onExplain} className={headBtn}>
            <FileSearch className="size-3" />
            EXPLAIN
          </button>
        )}
      </div>
      <pre className="overflow-x-auto bg-[#0f1419] px-3.5 py-3 font-mono text-[13.5px] leading-[1.7] text-[#c9d1d9] whitespace-pre">
        <code>
          {tokenizeSql(sql).map((t, i) => (
            <span key={i} className={t.cls}>
              {t.text}
            </span>
          ))}
        </code>
      </pre>
    </div>
  )
}

const headBtn =
  'inline-flex cursor-pointer items-center gap-1 rounded border-0 bg-transparent px-1.5 py-0.5 text-[13px] text-[#8b949e] transition-colors hover:text-[#c9d1d9]'

const KEYWORDS =
  'SELECT|FROM|WHERE|JOIN|LEFT|RIGHT|INNER|OUTER|ON|GROUP|ORDER|BY|LIMIT|OFFSET|AND|OR|AS|SUM|COUNT|AVG|MIN|MAX|DESC|ASC|WITH|EXPLAIN|HAVING|DISTINCT|CASE|WHEN|THEN|ELSE|END|NOT|IN|LIKE|IS|NULL|BETWEEN|UNION|ALL|UPDATE|DELETE|INSERT|INTO|VALUES|SET|CREATE|TABLE|PRIMARY|KEY'

interface Token {
  text: string
  cls?: string
}

function tokenizeSql(sql: string): Token[] {
  const pattern = new RegExp(
    `(--[^\\n]*)|('(?:[^']|'')*')|\\b(${KEYWORDS})\\b|\\b(\\d+(?:\\.\\d+)?)\\b`,
    'gi',
  )
  const tokens: Token[] = []
  let last = 0
  let match: RegExpExecArray | null
  while ((match = pattern.exec(sql)) !== null) {
    if (match.index > last) tokens.push({ text: sql.slice(last, match.index) })
    if (match[1]) tokens.push({ text: match[1], cls: 'text-[#8b949e]' })
    else if (match[2]) tokens.push({ text: match[2], cls: 'text-[#a5d6ff]' })
    else if (match[3]) tokens.push({ text: match[3], cls: 'text-[#ff7b72]' })
    else if (match[4]) tokens.push({ text: match[4], cls: 'text-[#79c0ff]' })
    last = match.index + match[0].length
  }
  if (last < sql.length) tokens.push({ text: sql.slice(last) })
  return tokens
}
