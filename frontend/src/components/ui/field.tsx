import type { ReactNode } from 'react'
import { Label } from '@/components/ui/label'

/** 表单字段：标签 + 控件 + 可选提示（登录/设置/知识库创建等表单共用） */
export function Field({
  label,
  required,
  children,
  hint,
  className,
}: {
  label: ReactNode
  required?: boolean
  children: ReactNode
  hint?: ReactNode
  className?: string
}) {
  return (
    <div className={className}>
      <Label className="mb-1.5 block text-[13.5px] text-ink-2">
        {label}
        {required && <span className="ml-0.5 text-danger">*</span>}
      </Label>
      {children}
      {hint && <p className="mt-1 text-[12.5px] text-ink-3">{hint}</p>}
    </div>
  )
}
