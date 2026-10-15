import { Check, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface StepItem {
  state: 'done' | 'run' | 'idle'
  text: string
}

/** 推理 / 检索步骤卡（原型 `.step`） */
export function StepList({ steps, className }: { steps: StepItem[]; className?: string }) {
  if (steps.length === 0) return null
  return (
    <div className={cn('space-y-1.5 rounded-xl border border-line bg-bg-card px-3 py-2.5', className)}>
      {steps.map((step, i) => (
        <div key={i} className="flex items-start gap-2 text-[13.5px] text-ink-2">
          <span
            className={cn(
              'mt-[3px] grid size-4 flex-none place-items-center rounded-full',
              step.state === 'done' && 'bg-ok-bg text-ok',
              step.state === 'run' && 'bg-accent-tint text-accent',
              step.state === 'idle' && 'bg-bg-section text-ink-4',
            )}
          >
            {step.state === 'done' && <Check className="size-2.5" />}
            {step.state === 'run' && <Loader2 className="size-2.5 animate-spin" />}
            {step.state === 'idle' && <span className="size-1 rounded-full bg-ink-4" />}
          </span>
          <span className="min-w-0 leading-relaxed">{step.text}</span>
        </div>
      ))}
    </div>
  )
}
