import { useCallback, useState } from 'react'
export type Theme = 'light' | 'dark'

const THEME_KEY = 'wq-theme'
/** 与 index.css 里 .theme-anim 的时长保持一致 */
const TRANSITION_MS = 560

type ViewTransitionDocument = Document & {
  startViewTransition?: (callback: () => void) => { finished: Promise<void> }
}

function readInitialTheme(): Theme {
  const attr = document.documentElement.getAttribute('data-theme')
  return attr === 'dark' ? 'dark' : 'light'
}

function persist(mode: Theme) {
  try {
    localStorage.setItem(THEME_KEY, mode)
  } catch {
    /* 隐私模式下忽略 */
  }
}

/**
 * 换肤：优先 View Transitions 圆形揭示（从被点的按钮扩散），
 * 不支持时降级为一次性全站色彩过渡。降级路径必须分两帧：
 * 先让过渡类生效，再改主题 —— 同一次样式计算里改值不会触发过渡。
 */
export function useTheme() {
  const [theme, setTheme] = useState<Theme>(readInitialTheme)

  const switchTheme = useCallback((mode: Theme, originEl?: HTMLElement | null) => {
    const root = document.documentElement
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

    const apply = () => {
      root.setAttribute('data-theme', mode)
      setTheme(mode)
      persist(mode)
    }

    const cleanup = () => {
      root.classList.remove('theme-wipe')
      root.classList.remove('theme-anim')
    }

    if (reduce) {
      apply()
      return
    }

    const doc = document as ViewTransitionDocument
    if (originEl && typeof doc.startViewTransition === 'function') {
      const rect = originEl.getBoundingClientRect()
      root.style.setProperty('--wipe-x', `${rect.left + rect.width / 2}px`)
      root.style.setProperty('--wipe-y', `${rect.top + rect.height / 2}px`)
      root.classList.add('theme-wipe')

      // View Transition 被中止时（连续点击、页面不可见等）更新回调可能根本不执行，
      // 那样主题就切不过去 —— 表现为"点了没反应"。补一次兜底。
      let applied = false
      const applyOnce = () => {
        if (applied) return
        applied = true
        apply()
      }

      try {
        const transition = doc.startViewTransition(applyOnce)
        transition.finished.then(cleanup, cleanup)
        window.setTimeout(applyOnce, 300)
        return
      } catch {
        cleanup()
      }
    }

    root.classList.add('theme-anim')
    requestAnimationFrame(() => {
      apply()
      setTimeout(cleanup, TRANSITION_MS)
    })
  }, [])

  return { theme, switchTheme }
}
