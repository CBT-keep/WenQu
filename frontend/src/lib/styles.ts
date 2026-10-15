/**
 * 复用的 class 常量。
 * 页面里同一种按钮出现几十次，集中在这里，改一次全站一致。
 */

export const btnPrimary =
  'inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-md border-0 bg-accent px-3.5 text-[13px] text-on-accent ' +
  'transition-[background,transform] duration-200 hover:-translate-y-px hover:bg-accent-deep ' +
  'disabled:pointer-events-none disabled:opacity-60'

export const btnPrimarySm =
  'inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-md border-0 bg-accent px-3 text-[12.5px] text-on-accent ' +
  'transition-[background,transform] duration-200 hover:-translate-y-px hover:bg-accent-deep ' +
  'disabled:pointer-events-none disabled:opacity-60'

export const btnGhost =
  'inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-md border border-line-strong bg-bg-card px-4 text-[13px] text-ink-2 ' +
  'transition-colors hover:border-accent-soft hover:text-ink disabled:pointer-events-none disabled:opacity-60'

export const btnOutline =
  'inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-md border border-line-strong bg-bg-card px-2.5 text-[12.5px] text-ink-2 ' +
  'transition-colors hover:border-accent-soft hover:text-ink disabled:pointer-events-none disabled:opacity-50'

export const btnDanger =
  'inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-md border-0 bg-danger px-3.5 text-[13px] text-white ' +
  'transition-opacity hover:opacity-90 disabled:pointer-events-none disabled:opacity-60'

/** 表格行内文字按钮 */
export const rowBtn =
  'cursor-pointer rounded-md border-0 bg-transparent px-2 py-1 text-[12.5px] text-ink-2 transition-colors hover:bg-bg-hover hover:text-ink'

export const rowBtnDanger = `${rowBtn} hover:text-danger`

export const inputCls = 'h-9 rounded-md border-line-strong bg-bg-card px-3 text-[13px] focus-visible:ring-accent/20'

/** 图标按钮（无边框、悬浮出底色） */
export const iconBtn =
  'grid size-8 flex-none cursor-pointer place-items-center rounded-md border-0 bg-transparent text-ink-3 transition-colors hover:bg-bg-hover hover:text-ink'

/**
 * 表格列内等宽标签。
 * 同一列里枚举值长短不一（PDF/DOCX、已就绪/解析失败、登录/SQL 执行），
 * 各自随内容撑开时整列参差；统一宽度 + 居中后纵向扫下来才是齐的。
 * 用 min-w 会随最长值变宽，所以这里用固定 w-*。
 */
export const tagCol = 'w-[64px] justify-center'
export const tagColWide = 'w-[80px] justify-center'
/** 更长的枚举值用这档（如 SUPERADMIN） */
export const tagColXl = 'w-[104px] justify-center'
