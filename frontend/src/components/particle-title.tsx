import { useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'

/**
 * 「WenQu」粒子标题（复现 doc/prototype/wenqu-style-preview.html）。
 *
 * 交互参数与原型一致（原型注释：对齐 mimo.mi.com 实测值）：
 *   排斥半径 120px / 力度 (1-d/120)×40 / 光标缓动 0.18 / 回弹插值 0.55
 *
 * 相比原型额外做的性能处理（低端机也保持流畅）：
 *   1. 粒子预算：按硬件线索（核心数 / 内存）选 2200 或 4200 上限，
 *      采样步长按实际点数自动放大，保证不超预算；
 *   2. DPR 上限：低端 1.5、常规 2，避免 3x 屏上 4 倍像素量的白烧；
 *   3. 离屏 canvas 复用、循环内零分配、距离比较用平方免开方；
 *   4. 插值按帧间隔归一（60Hz / 120Hz / 掉帧手感一致）；
 *   5. 离开视口、切到后台标签页即停 rAF，回来才继续；
 *   6. `prefers-reduced-motion` 只画静态一帧，不起循环。
 */

const SERIF = '"LXGW WenKai TC", "LXGW WenKai", "Songti SC", "STSong", Georgia, serif'
const TEXT = 'WenQu'

/** 亮/暗两套配色（与原型一致；暗色必须用亮橄榄，否则在暖黑底上会"消失"） */
const PALETTE = {
  light: { from: [45, 58, 30], to: [62, 79, 42], hot: '#526E3E', ring: 'rgba(82,110,62,.28)' },
  dark: { from: [152, 192, 130], to: [190, 222, 168], hot: '#DCF0C4', ring: 'rgba(190,222,168,.34)' },
} as const

const REPEL_RADIUS = 120
const REPEL_FORCE = 40
const ENTRANCE_MS = 820
const DOT = 2.1

type Palette = (typeof PALETTE)['light'] | (typeof PALETTE)['dark']

function palette(): Palette {
  return document.documentElement.getAttribute('data-theme') === 'dark' ? PALETTE.dark : PALETTE.light
}

/** 粗判低端设备：核少或内存小就降档（拿不到信息时按 4 处理，即"中低端"）。 */
function isLowEnd() {
  const cores = navigator.hardwareConcurrency ?? 4
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 4
  return cores <= 4 || memory <= 4
}

export function ParticleTitle({ className }: { className?: string }) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const wrap = wrapRef.current
    const canvas = canvasRef.current
    if (!wrap || !canvas) return
    return mount(wrap, canvas)
  }, [])

  return (
    <div ref={wrapRef} className={cn('relative w-full select-none', className)}>
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" aria-hidden="true" />
    </div>
  )
}

function mount(wrap: HTMLElement, canvas: HTMLCanvasElement): () => void {
  const ctx = canvas.getContext('2d')
  if (!ctx) return () => {}

  const lowEnd = isLowEnd()
  const dpr = Math.min(lowEnd ? 1.5 : 2, window.devicePixelRatio || 1)
  const budget = lowEnd ? 2200 : 4200
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false

  const off = document.createElement('canvas')
  const offCtx = off.getContext('2d', { willReadFrequently: true })

  let W = 0
  let H = 0
  let count = 0
  let pal: Palette = palette()

  let px = new Float32Array(0)
  let py = new Float32Array(0)
  let tx = new Float32Array(0)
  let ty = new Float32Array(0)
  let sx = new Float32Array(0)
  let sy = new Float32Array(0)
  let seed = new Float32Array(0)
  let depth = new Float32Array(0)
  let delay = new Float32Array(0)
  let tint = new Float32Array(0)
  let colors: string[] = []

  const pointer = { x: 0, y: 0, sx: 0, sy: 0, on: false }
  let raf = 0
  let t0 = 0
  let last = 0
  let settledPaint = false
  let visible = true

  function rgb(from: number[], to: number[], t: number) {
    const r = Math.round(from[0] + (to[0] - from[0]) * t)
    const g = Math.round(from[1] + (to[1] - from[1]) * t)
    const b = Math.round(from[2] + (to[2] - from[2]) * t)
    return `rgb(${r},${g},${b})`
  }

  function recolor() {
    pal = palette()
    for (let i = 0; i < count; i++) colors[i] = rgb(pal.from as unknown as number[], pal.to as unknown as number[], tint[i])
  }

  /** 离屏画字后按 alpha 采样；点数超预算就放大步长重采一次 */
  function sample(step: number): number[] {
    if (!offCtx) return []
    const data = offCtx.getImageData(0, 0, off.width, off.height).data
    const pts: number[] = []
    for (let y = 0; y < off.height; y += step) {
      for (let x = 0; x < off.width; x += step) {
        if (data[(y * off.width + x) * 4 + 3] > 60) pts.push(x, y)
      }
    }
    return pts
  }

  function build() {
    const rect = wrap.getBoundingClientRect()
    if (rect.width < 40 || rect.height < 20) return

    W = Math.round(rect.width)
    H = Math.round(rect.height)
    canvas.width = Math.floor(W * dpr)
    canvas.height = Math.floor(H * dpr)
    ctx!.setTransform(dpr, 0, 0, dpr, 0, 0)

    // 1) 把文字画到离屏 canvas（字号自适应，宽度上限 88%、高度 82%）
    let size = Math.min(H * 0.82, 186)
    offCtx!.font = `500 ${size}px ${SERIF}`
    let textWidth = offCtx!.measureText(TEXT).width
    const maxWidth = W * 0.88
    if (textWidth > maxWidth) {
      size = Math.max(26, (size * maxWidth) / textWidth)
      offCtx!.font = `500 ${size}px ${SERIF}`
      textWidth = offCtx!.measureText(TEXT).width
    }
    off.width = Math.ceil(textWidth) + 24
    off.height = Math.ceil(size * 1.6)
    offCtx!.font = `500 ${size}px ${SERIF}`
    offCtx!.textAlign = 'center'
    offCtx!.textBaseline = 'middle'
    offCtx!.fillStyle = '#000'
    offCtx!.clearRect(0, 0, off.width, off.height)
    offCtx!.fillText(TEXT, off.width / 2, off.height / 2)

    // 2) 采样（点数受预算约束）
    let step = size > 140 ? 3 : 2.5
    let pts = sample(step)
    if (pts.length / 2 > budget) {
      step *= Math.sqrt(pts.length / 2 / budget)
      pts = sample(step)
    }
    count = pts.length / 2

    px = new Float32Array(count)
    py = new Float32Array(count)
    tx = new Float32Array(count)
    ty = new Float32Array(count)
    sx = new Float32Array(count)
    sy = new Float32Array(count)
    seed = new Float32Array(count)
    depth = new Float32Array(count)
    delay = new Float32Array(count)
    tint = new Float32Array(count)
    colors = new Array(count)

    pal = palette()
    const halfW = off.width / 2
    const halfH = off.height / 2
    for (let i = 0; i < count; i++) {
      const x = pts[i * 2] - halfW + W / 2
      const y = pts[i * 2 + 1] - halfH + H * 0.5
      tx[i] = x
      ty[i] = y
      // 入场：从随机方向的远处飞入（原型参数：半径 52–180、延迟 0–80ms）
      const s = ((9301 * i + 49297) % 233280) / 233280
      const angle = s * Math.PI * 2
      const radius = 52 + s * 128
      sx[i] = x + Math.cos(angle) * radius
      sy[i] = y + Math.sin(angle) * radius
      px[i] = sx[i]
      py[i] = sy[i]
      seed[i] = s
      depth[i] = 0.72 + (((233 * i + 97) % 1000) / 1000) * 0.28
      delay[i] = 80 * s
      tint[i] = Math.min(1, Math.max(0, x / Math.max(1, W) + (s - 0.5) * 0.3))
      colors[i] = rgb(pal.from as unknown as number[], pal.to as unknown as number[], tint[i])
    }

    wrap.dataset.particles = String(count)
    pointer.x = pointer.sx = W / 2
    pointer.y = pointer.sy = H / 2

    // 后台标签页不产帧：先静态画一帧，保证切回来时不是一片空白
    if (reduce || document.visibilityState === 'hidden') {
      drawStatic()
      settledPaint = true
    }
    start()
  }

  function drawStatic() {
    ctx!.clearRect(0, 0, W, H)
    ctx!.globalAlpha = 1
    for (let i = 0; i < count; i++) {
      ctx!.fillStyle = colors[i]
      ctx!.fillRect(tx[i] - DOT / 2, ty[i] - DOT / 2, DOT, DOT)
    }
  }

  function frame(now: number) {
    raf = requestAnimationFrame(frame)
    if (!t0) {
      // 之前已静态画过（后台标签页/reduced motion）：跳过入场，直接进入稳定态
      t0 = settledPaint ? now - 3000 : now
      last = now
    }
    const t = now - t0
    const dt = Math.min(48, Math.max(1, now - last))
    last = now
    // 帧率归一：60Hz 下等价于原型的 0.18 / 0.55，120Hz 或掉帧时手感不变
    const cursorK = 1 - Math.pow(1 - 0.18, dt / 16.67)
    const settleK = 1 - Math.pow(1 - 0.55, dt / 16.67)

    ctx!.clearRect(0, 0, W, H)
    pointer.sx += (pointer.x - pointer.sx) * cursorK
    pointer.sy += (pointer.y - pointer.sy) * cursorK

    const radiusSq = REPEL_RADIUS * REPEL_RADIUS
    for (let i = 0; i < count; i++) {
      const prog = (t - delay[i]) / ENTRANCE_MS
      if (prog < 1) {
        const e = 1 - Math.pow(1 - Math.max(0, prog), 3)
        const x = sx[i] + (tx[i] - sx[i]) * e
        const y = sy[i] + (ty[i] - sy[i]) * e
        px[i] = x
        py[i] = y
        ctx!.globalAlpha = 0.06 + 0.94 * Math.max(0, prog)
        ctx!.fillStyle = colors[i]
        ctx!.fillRect(x - DOT / 2, y - DOT / 2, DOT, DOT)
        continue
      }

      let nx = tx[i]
      let ny = ty[i]
      if (!reduce) {
        nx += 0.48 * Math.sin(0.0009 * t + 10 * seed[i]) * depth[i]
        ny += 0.48 * Math.cos(0.00075 * t + 10 * depth[i]) * depth[i]
      }

      let isHot = false
      if (pointer.on) {
        const dx = px[i] - pointer.sx
        const dy = py[i] - pointer.sy
        const d2 = dx * dx + dy * dy
        if (d2 < radiusSq && d2 > 0.01) {
          const d = Math.sqrt(d2)
          const f = (1 - d / REPEL_RADIUS) * REPEL_FORCE
          nx += (dx / d) * f
          ny += (dy / d) * f
          isHot = true
        }
      }

      px[i] += (nx - px[i]) * settleK
      py[i] += (ny - py[i]) * settleK
      ctx!.globalAlpha = isHot ? 1 : 0.62 + 0.38 * depth[i]
      ctx!.fillStyle = isHot ? pal.hot : colors[i]
      ctx!.fillRect(px[i] - DOT / 2, py[i] - DOT / 2, DOT, DOT)
    }

    // 光标位置的虚线圈（原型里"排斥范围"的可见提示）
    if (pointer.on && !reduce) {
      ctx!.globalAlpha = 1
      ctx!.strokeStyle = pal.ring
      ctx!.lineWidth = 1
      ctx!.setLineDash([3, 4])
      ctx!.beginPath()
      ctx!.arc(pointer.sx, pointer.sy, REPEL_RADIUS, 0, Math.PI * 2)
      ctx!.stroke()
      ctx!.setLineDash([])
    }
    ctx!.globalAlpha = 1
  }

  function start() {
    if (raf) return
    if (reduce) {
      drawStatic()
      return
    }
    if (!visible || document.visibilityState !== 'visible') return
    raf = requestAnimationFrame(frame)
  }

  function stop() {
    if (!raf) return
    cancelAnimationFrame(raf)
    raf = 0
  }

  // ---------------- 事件 ----------------

  function onPointerMove(e: PointerEvent) {
    // offsetX/Y 相对 canvas，省掉每次移动都做 getBoundingClientRect
    pointer.x = e.offsetX
    pointer.y = e.offsetY
    pointer.on = true
  }
  function onPointerLeave() {
    pointer.on = false
  }
  canvas.addEventListener('pointermove', onPointerMove)
  canvas.addEventListener('pointerdown', onPointerMove)
  canvas.addEventListener('pointerleave', onPointerLeave)

  let resizeTimer = 0
  const resizeObserver = new ResizeObserver(() => {
    window.clearTimeout(resizeTimer)
    resizeTimer = window.setTimeout(() => {
      build()
      t0 = 0
      settledPaint = false
      start()
    }, 160)
  })
  resizeObserver.observe(wrap)

  const intersectionObserver = new IntersectionObserver((entries) => {
    visible = entries[0]?.isIntersecting ?? true
    if (visible) {
      t0 = 0
      settledPaint = false
      start()
    } else {
      stop()
    }
  })
  intersectionObserver.observe(wrap)

  function onVisibility() {
    if (document.visibilityState === 'visible') start()
    else stop()
  }
  document.addEventListener('visibilitychange', onVisibility)

  const themeObserver = new MutationObserver(() => {
    recolor()
    if (reduce) drawStatic()
  })
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })

  // 字体（LXGW WenKai）就绪后再采样，否则拿到的是回退字体轮廓
  const fontsReady = document.fonts?.ready ?? Promise.resolve()
  let disposed = false
  fontsReady.then(
    () => {
      if (disposed) return
      build()
      t0 = 0
      start()
    },
    () => {
      if (disposed) return
      build()
      start()
    },
  )
  // 字体可能还没就绪：先用当前字体画一版，字体到位后上面会重建
  build()
  start()

  return () => {
    disposed = true
    stop()
    window.clearTimeout(resizeTimer)
    canvas.removeEventListener('pointermove', onPointerMove)
    canvas.removeEventListener('pointerdown', onPointerMove)
    canvas.removeEventListener('pointerleave', onPointerLeave)
    document.removeEventListener('visibilitychange', onVisibility)
    resizeObserver.disconnect()
    intersectionObserver.disconnect()
    themeObserver.disconnect()
  }
}
