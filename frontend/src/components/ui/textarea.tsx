import * as React from 'react'
import { cn } from '@/lib/utils'

export function Textarea({ className, ...props }: React.ComponentProps<'textarea'>) {
  return (
    <textarea
      className={cn(
        'w-full resize-y rounded-md border border-line-strong bg-bg-card px-3 py-2 text-[14.5px] leading-relaxed text-ink outline-none',
        'transition-colors placeholder:text-ink-4 hover:border-accent-soft focus:border-accent disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    />
  )
}
