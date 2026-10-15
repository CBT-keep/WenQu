import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { usePrefersReducedMotion } from './use-prefers-reduced-motion'

/**
 * 标点后的额外停顿。
 * 匀速逐字打出来像打印机，句读处慢下来才像人在说话 —— 这是打字机效果像不像的分水岭。
 */
const PUNCT_PAUSE: Record<string, number> = {
  '…': 300,
  '.': 240,
  '。': 220,
  '？': 200,
  '！': 200,
  '，': 170,
  '：': 170,
  '、': 140,
}

export interface TypewriterOptions {
  /** 普通字符的间隔（毫秒） */
  charDelay?: number
  /** 连播模式：每行打完后、下一行开始前的停顿 */
  lineDelay?: number
  /** 开打前的停顿 */
  startDelay?: number
  /** 连播模式：全部打完后、触发 onDone 前的停顿 */
  endDelay?: number
  /** 连播模式：被用户跳过时改用这个更短的停顿 —— 人都催了就别再端着 */
  skippedEndDelay?: number
  /**
   * 每行打完就停住，等用户点一下才打下一行（最后一行同样等点击才交棒）。
   * 打开后 lineDelay / endDelay 失效 —— 节奏交给用户，不由定时器说了算。
   */
  stepByClick?: boolean
  onDone?: () => void
}

/**
 * 逐字打印，**按行推进**。
 *
 * 返回：
 * - rendered   各行已打出的部分
 * - typing     正在打字（光标该亮）
 * - waiting    这一行打完了，正等用户点一下（只在 stepByClick 下成立）
 * - done       全部打完
 * - advance    用户的"那一下"：还在打字就补完本行，行打完了就进下一行（末行则交棒）
 *
 * lines 请用模块级常量或 useMemo 固定引用，否则每次渲染都会重建计时器。
 */
export function useTypewriter(lines: string[], options: TypewriterOptions = {}) {
  const {
    charDelay = 62,
    lineDelay = 420,
    startDelay = 240,
    endDelay = 980,
    skippedEndDelay = 220,
    stepByClick = false,
    onDone,
  } = options

  const reduced = usePrefersReducedMotion()
  const lastIndex = lines.length - 1

  const [lineIndex, setLineIndex] = useState(0)
  const [pos, setPos] = useState(0)
  const [started, setStarted] = useState(false)
  const skippedRef = useRef(false)

  const current = lines[Math.min(lineIndex, Math.max(lastIndex, 0))] ?? ''
  const isLastLine = lineIndex >= lastIndex
  const lineDone = pos >= current.length

  const typing = started && !lineDone
  const done = started && isLastLine && lineDone
  const waiting = stepByClick && started && lineDone

  // 开打前的停顿
  useEffect(() => {
    if (started) return
    const timer = setTimeout(() => setStarted(true), reduced ? 0 : startDelay)
    return () => clearTimeout(timer)
  }, [started, startDelay, reduced])

  // 逐字推进 —— 只管当前这一行
  useEffect(() => {
    if (reduced || !started || lineDone) return
    const prev = pos > 0 ? current[pos - 1] : ''
    const timer = setTimeout(() => setPos((p) => p + 1), PUNCT_PAUSE[prev] ?? charDelay)
    return () => clearTimeout(timer)
  }, [pos, started, reduced, lineDone, current, charDelay])

  // 连播模式：一行打完，停一拍自动接下一行。点击模式不走这里，等人。
  useEffect(() => {
    if (stepByClick || reduced || !started || !lineDone || isLastLine) return
    const timer = setTimeout(() => {
      setLineIndex((i) => i + 1)
      setPos(0)
    }, lineDelay)
    return () => clearTimeout(timer)
  }, [stepByClick, reduced, started, lineDone, isLastLine, lineIndex, lineDelay])

  // onDone 放 ref 里，免得调用方没 memo 就把它塞进依赖、把计时器抖掉
  const onDoneRef = useRef(onDone)
  useEffect(() => {
    onDoneRef.current = onDone
  })

  // 连播模式收尾：全部打完 → 停一拍 → 交棒。
  // 点击模式刻意不设定时器 —— 设了就等于把"等你点"偷偷变成"等 1 秒"，交互就假了。
  // 也不加"只跑一次"的 ref 闸门：StrictMode 会跑两遍 effect，闸门一关计时器就永不触发。
  useEffect(() => {
    if (stepByClick || !done) return
    const wait = reduced ? 1200 : skippedRef.current ? skippedEndDelay : endDelay
    const timer = setTimeout(() => onDoneRef.current?.(), wait)
    return () => clearTimeout(timer)
  }, [stepByClick, done, endDelay, skippedEndDelay, reduced])

  /** 补完当前这一行（嫌慢点一下时用） */
  const finish = useCallback(() => {
    skippedRef.current = true
    setStarted(true)
    setPos(current.length)
  }, [current.length])

  /** 用户的那一下：还在打字 → 补完本行；本行已打完 → 进下一行；末行已打完 → 交棒 */
  const advance = useCallback(() => {
    if (!lineDone) {
      finish()
      return
    }
    if (isLastLine) {
      onDoneRef.current?.()
      return
    }
    setLineIndex((i) => i + 1)
    setPos(0)
  }, [lineDone, isLastLine, finish])

  // 用 for 循环而不是 lines.map()：map 的回调是闭包，在里面读 lineIndex/pos 之外的东西
  // 容易被 React Compiler 的 immutability 规则盯上。
  const rendered = useMemo(() => {
    const out: string[] = []
    for (let i = 0; i < lines.length; i++) {
      if (i < lineIndex) out.push(lines[i])
      else if (i === lineIndex) out.push(lines[i].slice(0, pos))
      else out.push('')
    }
    return out
  }, [lines, lineIndex, pos])

  return { rendered, typing, waiting, done, activeIndex: lineIndex, finish, advance }
}
