import { useEffect, type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { useTypewriter, type TypewriterOptions } from '@/hooks/use-typewriter'

export interface TypewriterProps extends TypewriterOptions {
  lines: string[]
  /** 每行单独的样式（标题 / 副文这种字号不同的场景） */
  lineClassNames?: (string | undefined)[]
  className?: string
  /**
   * 打开后行为：任何点击 / 按键都是"那一下" ——
   * 还在打字就立刻补完本行，本行打完了就进下一行。
   * 逐字动画再短也是"被迫等待"，给个出口，别把人锁在动画里。
   */
  interactive?: boolean
  /** 停下来等点击时露出的提示（占用固定高度，进退不会顶动上面的文字） */
  waitingHint?: ReactNode
}

/**
 * 逐字打印的文本块。停顿、门控与光标都由 useTypewriter 驱动，这里只管排版。
 *
 * 逐字变化的文本对读屏是一场灾难（每个字都会念），所以动画层挂 aria-hidden，
 * 另给一份 sr-only 的完整文本 —— 读屏一次念完，听感才正常。
 */
export function Typewriter({
  lines,
  lineClassNames,
  className,
  interactive,
  waitingHint,
  ...options
}: TypewriterProps) {
  const { rendered, typing, waiting, activeIndex, advance } = useTypewriter(lines, options)

  useEffect(() => {
    if (!interactive) return
    const onAnyInput = () => advance()
    window.addEventListener('pointerdown', onAnyInput)
    window.addEventListener('keydown', onAnyInput)
    return () => {
      window.removeEventListener('pointerdown', onAnyInput)
      window.removeEventListener('keydown', onAnyInput)
    }
  }, [interactive, advance])

  return (
    <div className={className}>
      <span className="sr-only">{lines.join('')}</span>
      {rendered.map((text, i) => (
        <span key={i} aria-hidden="true" className={cn('block', lineClassNames?.[i])}>
          {text}
          {typing && i === activeIndex && <Caret />}
          {/*
            把"还没打出来的部分"原样渲染成不可见文字：
            这一行的高度和折行位置从第一帧就定死，字打出来时不会跳行高，
            长句也不会在打字过程中重新折行、整段跳一下。
          */}
          {text.length < lines[i].length && (
            <span className="invisible">{lines[i].slice(text.length)}</span>
          )}
        </span>
      ))}
      {waitingHint && (
        <div
          aria-hidden="true"
          className={cn(
            'mt-6 flex h-5 items-center gap-1.5 text-[12px] text-ink-4',
            'transition-opacity duration-[320ms]',
            waiting ? 'opacity-100' : 'opacity-0',
          )}
        >
          {waitingHint}
        </div>
      )}
    </div>
  )
}

/** 行尾光标。用 blink 而不是 pulse：光标要的是硬切明灭，不是呼吸 */
function Caret() {
  return (
    <span
      className="caret-blink ml-[3px] inline-block h-[1em] w-[2px] bg-accent align-[-0.12em]"
      aria-hidden="true"
    />
  )
}
