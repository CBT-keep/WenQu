import { useEffect, useState } from 'react'

/**
 * 是否开启了「减少动态效果」。
 *
 * CSS 动画由 index.css 里的全局规则兜底，但**打字机这种 JS 驱动的动画兜不住** ——
 * 它是一串 setTimeout，得自己判断，否则对前庭敏感的用户会被强制看完整段逐字动画。
 */
export function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  )

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const onChange = () => setReduced(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  return reduced
}
