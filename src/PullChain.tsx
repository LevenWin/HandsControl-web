import { useRef, useEffect } from 'react'
import Matter from 'matter-js'

const INDEX_TIP = 8
const THUMB_TIP = 4

declare global {
  interface Window {
    Hands: new (config: { locateFile: (file: string) => string }) => HandsInstance
  }
}

interface HandsInstance {
  close(): Promise<void>
  onResults(cb: (results: HandResults) => void): void
  initialize(): Promise<void>
  reset(): void
  send(inputs: { image: HTMLVideoElement }): Promise<void>
  setOptions(options: HandsOptions): void
}

interface HandsOptions {
  maxNumHands?: number
  modelComplexity?: 0 | 1
  minDetectionConfidence?: number
  minTrackingConfidence?: number
  selfieMode?: boolean
}

interface HandResults {
  multiHandLandmarks?: NormalizedLandmarkList[]
  multiHandedness?: { index: number; score: number; label: string }[]
}

interface NormalizedLandmarkList extends Array<NormalizedLandmark> {}

interface NormalizedLandmark {
  x: number
  y: number
  z: number
  visibility?: number
}

export interface ChainConfig {
  segmentCount: number
  segmentRadius: number
  segmentSpacing: number
  constraintStiffness: number
  constraintDamping: number
  bodyFrictionAir: number
  bodyRestitution: number
  tipMass: number
  gravityY: number
  gravityScale: number
  pinchThreshold: number
  grabRadius: number
  pullTriggerDelta: number
  chainColorHex: string
  chainAlpha: number
  tipColorHex: string
  tipAlpha: number
  glowColorHex: string
  glowAlphaIdle: number
  glowAlphaGrabbed: number
  lineWidthIdle: number
  lineWidthGrabbed: number
  glowBlurIdle: number
  glowBlurGrabbed: number
  chainVisible: boolean
}

const defaultConfig: ChainConfig = {
  segmentCount: 19,
  segmentRadius: 5,
  segmentSpacing: 16,
  constraintStiffness: 0.45,
  constraintDamping: 0.22,
  bodyFrictionAir: 0.08,
  bodyRestitution: 0.15,
  tipMass: 2.5,
  gravityY: 1.61,
  gravityScale: 0.001,
  pinchThreshold: 35,
  grabRadius: 90,
  pullTriggerDelta: 31,
  chainColorHex: '#dcb478',
  chainAlpha: 0.9,
  tipColorHex: '#dcb478',
  tipAlpha: 0.7,
  glowColorHex: '#ffc850',
  glowAlphaIdle: 0.35,
  glowAlphaGrabbed: 0.9,
  lineWidthIdle: 3,
  lineWidthGrabbed: 4,
  glowBlurIdle: 8,
  glowBlurGrabbed: 16,
  chainVisible: true,
}

function hexToRGB(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  return [
    parseInt(h.substring(0, 2), 16),
    parseInt(h.substring(2, 4), 16),
    parseInt(h.substring(4, 6), 16),
  ]
}

function resolveColors(cfg: ChainConfig) {
  const [cr, cg, cb] = hexToRGB(cfg.chainColorHex)
  const [tr, tg, tb] = hexToRGB(cfg.tipColorHex)
  const [gr, gg, gb] = hexToRGB(cfg.glowColorHex)

  return {
    chainColorIdle: `rgba(${cr},${cg},${cb},${cfg.chainAlpha})`,
    chainColorGrabbed: `rgba(${Math.min(255,cr+40)},${Math.min(255,cg+20)},${Math.min(255,cb)},1)`,
    tipColorIdle: `rgba(${tr},${tg},${tb},${cfg.tipAlpha})`,
    tipColorGrabbed: `rgba(${Math.min(255,tr+40)},${Math.min(255,tg+20)},${Math.min(255,tb-20)},0.9)`,
    glowColorIdle: `rgba(${gr},${gg},${gb},${cfg.glowAlphaIdle})`,
    glowColorGrabbed: `rgba(${gr},${gg},${gb},${cfg.glowAlphaGrabbed})`,
    tipStrokeColorIdle: `rgba(${Math.min(255,tr+20)},${Math.min(255,tg+20)},${Math.min(255,tb-20)},0.8)`,
    tipStrokeColorGrabbed: `rgba(${Math.min(255,tr+30)},${Math.min(255,tg+30)},${Math.min(255,tb+10)},1)`,
  }
}

function getChainTipY(bodies: Matter.Body[]): number {
  return bodies[bodies.length - 1]?.position.y ?? 0
}

function drawSmoothChain(
  ctx: CanvasRenderingContext2D,
  bodies: Matter.Body[],
  anchorX: number,
  anchorY: number,
  isGrabbed: boolean,
  cfg: ChainConfig
) {
  if (bodies.length < 2) return

  const cols = resolveColors(cfg)

  const points: { x: number; y: number }[] = [{ x: anchorX, y: anchorY }]
  for (const b of bodies) {
    points.push({ x: b.position.x, y: b.position.y })
  }

  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  ctx.strokeStyle = isGrabbed ? cols.chainColorGrabbed : cols.chainColorIdle
  ctx.lineWidth = isGrabbed ? cfg.lineWidthGrabbed : cfg.lineWidthIdle
  ctx.shadowColor = isGrabbed ? cols.glowColorGrabbed : cols.glowColorIdle
  ctx.shadowBlur = isGrabbed ? cfg.glowBlurGrabbed : cfg.glowBlurIdle

  ctx.beginPath()
  ctx.moveTo(points[0].x, points[0].y)

  for (let i = 1; i < points.length - 1; i++) {
    const xc = (points[i].x + points[i + 1].x) / 2
    const yc = (points[i].y + points[i + 1].y) / 2
    ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc)
  }

  const last = points[points.length - 1]
  ctx.lineTo(last.x, last.y)
  ctx.stroke()

  ctx.shadowColor = 'transparent'

  const tip = points[points.length - 1]
  const tipR = cfg.segmentRadius * 1.8
  ctx.beginPath()
  ctx.arc(tip.x, tip.y, isGrabbed ? tipR * 1.2 : tipR, 0, Math.PI * 2)
  ctx.fillStyle = isGrabbed ? cols.tipColorGrabbed : cols.tipColorIdle
  ctx.fill()
  ctx.strokeStyle = isGrabbed ? cols.tipStrokeColorGrabbed : cols.tipStrokeColorIdle
  ctx.lineWidth = 2
  ctx.stroke()

  if (!isGrabbed) {
    ctx.beginPath()
    ctx.arc(tip.x, tip.y, tipR * 1.3, 0, Math.PI * 2)
    ctx.strokeStyle = cols.tipStrokeColorIdle.replace(/[0-9.]+\)$/, '0.3)')
    ctx.lineWidth = 1
    ctx.stroke()
  }
}

function loadHandsScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.Hands) {
      resolve()
      return
    }
    const script = document.createElement('script')
    script.src = 'https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240/hands.js'
    script.crossOrigin = 'anonymous'
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Failed to load MediaPipe Hands'))
    document.head.appendChild(script)
  })
}

export default function PullChain({
  videoRef,
  containerRef,
  onPullRelease,
  config = {},
}: {
  videoRef: React.RefObject<HTMLVideoElement | null>
  containerRef: React.RefObject<HTMLDivElement | null>
  isLightOn: boolean
  onPullRelease: () => void
  config?: Partial<ChainConfig>
}) {
  const cfg = useRef<ChainConfig>({ ...defaultConfig, ...config })
  cfg.current = { ...defaultConfig, ...config }

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const engineRef = useRef<Matter.Engine | null>(null)
  const bodiesRef = useRef<Matter.Body[]>([])
  const handsRef = useRef<HandsInstance | null>(null)
  const isGrabbingRef = useRef(false)
  const grabStartYRef = useRef(0)
  const animFrameRef = useRef(0)
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null)
  const anchorRef = useRef({ x: 0, y: 0 })
  const sizeRef = useRef({ w: 0, h: 0 })
  const isMouseGrabbingRef = useRef(false)
  const mouseActiveRef = useRef(false)
  const handCooldownUntilRef = useRef(0)
  const HAND_COOLDOWN_MS = 1500
  const grabStartDistRef = useRef(0)

  const createChain = (anchorX: number, anchorY: number) => {
    const engine = engineRef.current
    if (!engine) return

    const c = cfg.current
    const bodies: Matter.Body[] = []

    for (let i = 0; i < c.segmentCount; i++) {
      const y = anchorY + (i + 1) * c.segmentSpacing
      const isTip = i === c.segmentCount - 1
      const body = Matter.Bodies.circle(anchorX, y, isTip ? c.segmentRadius * 1.6 : c.segmentRadius, {
        mass: isTip ? c.tipMass : 0.15,
        frictionAir: c.bodyFrictionAir,
        restitution: c.bodyRestitution,
      })
      bodies.push(body)
    }

    for (let i = 0; i < bodies.length; i++) {
      if (i === 0) {
        bodies[i].mass = 0
        Matter.Body.setStatic(bodies[i], true)
      }
    }

    for (let i = 0; i < bodies.length - 1; i++) {
      const constraint = Matter.Constraint.create({
        bodyA: bodies[i],
        bodyB: bodies[i + 1],
        stiffness: c.constraintStiffness,
        damping: c.constraintDamping,
        length: c.segmentSpacing,
      })
      Matter.Composite.add(engine.world, constraint)
    }

    Matter.Composite.add(engine.world, bodies)
    bodiesRef.current = bodies
  }

  const destroyChain = () => {
    const engine = engineRef.current
    const world = engine?.world
    if (!world) return
    Matter.Composite.clear(world, false)
    bodiesRef.current = []
  }

  const releaseAllGrabs = () => {
    const bodies = bodiesRef.current
    if (bodies.length === 0) return
    const tip = bodies[bodies.length - 1]
    isGrabbingRef.current = false
    isMouseGrabbingRef.current = false
    grabStartYRef.current = 0
    grabStartDistRef.current = 0
    if (canvasRef.current) canvasRef.current.style.cursor = 'grab'
    Matter.Body.setStatic(tip, false)
    Matter.Body.setVelocity(tip, { x: tip.velocity.x * 0.3, y: tip.velocity.y * 0.3 })
  }

  const doMouseGrab = (x: number, y: number) => {
    return doGrab(x, y)
  }

  const doHandGrab = (x: number, y: number) => {
    if (Date.now() < handCooldownUntilRef.current) return false
    return doGrab(x, y)
  }

  const getChainDistFromAnchor = () => {
    const bodies = bodiesRef.current
    if (bodies.length === 0) return 0
    const tip = bodies[bodies.length - 1]
    const ax = anchorRef.current.x
    const ay = anchorRef.current.y
    const dx = tip.position.x - ax
    const dy = tip.position.y - ay
    return Math.sqrt(dx * dx + dy * dy)
  }

  const getRestLength = () =>
    cfg.current.segmentCount * cfg.current.segmentSpacing

  const doGrab = (x: number, y: number) => {
    const bodies = bodiesRef.current
    if (bodies.length === 0) return false
    const chainTipY = getChainTipY(bodies)
    const distToTip = Math.sqrt(
      (x - bodies[bodies.length - 1].position.x) ** 2 +
      (y - chainTipY) ** 2
    )
    if (distToTip < cfg.current.grabRadius) {
      isGrabbingRef.current = true
      grabStartYRef.current = y
      grabStartDistRef.current = getChainDistFromAnchor()
      Matter.Body.setStatic(bodies[bodies.length - 1], true)
      if (canvasRef.current) canvasRef.current.style.cursor = 'grabbing'
      return true
    }
    return false
  }

  const getStretchPct = () => {
    const currentDist = getChainDistFromAnchor()
    if (currentDist === 0) return 0
    const base = grabStartDistRef.current > 0 ? grabStartDistRef.current : getRestLength()
    return ((currentDist - base) / base) * 100
  }

  const fireTrigger = (fromHand: boolean) => {
    releaseAllGrabs()
    if (fromHand) {
      handCooldownUntilRef.current = Date.now() + HAND_COOLDOWN_MS
    }
    onPullRelease()
  }

  const checkStretchDuringGrab = (fromHand: boolean) => {
    const stretchPct = getStretchPct()
    if (stretchPct > cfg.current.pullTriggerDelta) {
      fireTrigger(fromHand)
    }
  }

  const isAnyGrabbing = () => isGrabbingRef.current || isMouseGrabbingRef.current

  const processHandResults = (results: HandResults) => {
    const { w, h } = sizeRef.current
    const bodies = bodiesRef.current
    if (bodies.length === 0) return

    const allHands = results.multiHandLandmarks
    if (!allHands || allHands.length === 0) {
      handCooldownUntilRef.current = 0
      if (isGrabbingRef.current && !isMouseGrabbingRef.current) {
        releaseAllGrabs()
      }
      return
    }

    const tip = bodies[bodies.length - 1]
    let bestLandmarks = allHands[0]
    if (allHands.length > 1) {
      let bestDist = Infinity
      for (const hand of allHands) {
        const it = hand[INDEX_TIP]
        const tt = hand[THUMB_TIP]
        const mx = ((1 - it.x) * w + (1 - tt.x) * w) / 2
        const my = (it.y * h + tt.y * h) / 2
        const dist = Math.hypot(mx - tip.position.x, my - tip.position.y)
        if (dist < bestDist) {
          bestDist = dist
          bestLandmarks = hand
        }
      }
    }

    const indexTip = bestLandmarks[INDEX_TIP]
    const thumbTip = bestLandmarks[THUMB_TIP]

    const indexTipX = (1 - indexTip.x) * w
    const indexTipY = indexTip.y * h
    const thumbTipX = (1 - thumbTip.x) * w
    const thumbTipY = thumbTip.y * h

    const dx = indexTipX - thumbTipX
    const dy = indexTipY - thumbTipY
    const pinchDist = Math.sqrt(dx * dx + dy * dy)

    const isPinching = pinchDist < cfg.current.pinchThreshold

    if (isPinching && !isAnyGrabbing()) {
      const tipsX = (indexTipX + thumbTipX) / 2
      const tipsY = (indexTipY + thumbTipY) / 2
      doHandGrab(tipsX, tipsY)
    }

    if (isGrabbingRef.current && !isMouseGrabbingRef.current) {
      if (!isPinching) {
        handCooldownUntilRef.current = 0
        releaseAllGrabs()
      } else {
        const tipsX = (indexTipX + thumbTipX) / 2
        const tipsY = (indexTipY + thumbTipY) / 2
        Matter.Body.setPosition(tip, { x: tipsX, y: tipsY })
        checkStretchDuringGrab(true)
      }
    }
  }

  const handleMouseDown = (e: PointerEvent) => {
    const bodies = bodiesRef.current
    if (bodies.length === 0) return

    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return

    const mx = e.clientX - rect.left
    const my = e.clientY - rect.top

    if (doMouseGrab(mx, my)) {
      isMouseGrabbingRef.current = true
      mouseActiveRef.current = true
      ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    }
  }

  const handleMouseMove = (e: PointerEvent) => {
    if (!isMouseGrabbingRef.current) return
    const bodies = bodiesRef.current
    if (bodies.length === 0) return

    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return

    const mx = e.clientX - rect.left
    const my = e.clientY - rect.top

    Matter.Body.setPosition(bodies[bodies.length - 1], { x: mx, y: my })
    checkStretchDuringGrab(false)
  }

  const handleMouseUp = () => {
    if (isMouseGrabbingRef.current) {
      isMouseGrabbingRef.current = false
      mouseActiveRef.current = false
      releaseAllGrabs()
    }
  }

  const render = () => {
    const ctx = ctxRef.current
    if (!ctx) return
    const c = cfg.current
    const { w, h } = sizeRef.current
    ctx.clearRect(0, 0, w, h)

    if (!c.chainVisible) return

    const bodies = bodiesRef.current
    if (bodies.length === 0) return

    drawSmoothChain(ctx, bodies, anchorRef.current.x, anchorRef.current.y, isAnyGrabbing(), c)
  }

  const physicsLoop = () => {
    const engine = engineRef.current
    if (!engine) return
    const c = cfg.current
    engine.gravity.y = c.gravityY
    engine.gravity.scale = c.gravityScale
    Matter.Engine.update(engine, 1000 / 60)
    render()
    animFrameRef.current = requestAnimationFrame(physicsLoop)
  }

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    let handsActive = true

    const updateSize = () => {
      const w = container.clientWidth
      const h = container.clientHeight
      sizeRef.current = { w, h }

      if (ctxRef.current) {
        ctxRef.current.canvas.width = w
        ctxRef.current.canvas.height = h
      }

      if (engineRef.current) {
        destroyChain()
        const ax = w / 2
        const ay = 0
        anchorRef.current = { x: ax, y: ay }
        createChain(ax, ay)
      }
    }

    const setupChain = () => {
      const canvas = canvasRef.current
      if (canvas && sizeRef.current.w > 0) {
        canvas.width = sizeRef.current.w
        canvas.height = sizeRef.current.h
        ctxRef.current = canvas.getContext('2d')

        canvas.addEventListener('pointerdown', handleMouseDown)
        canvas.addEventListener('pointermove', handleMouseMove)
        canvas.addEventListener('pointerup', handleMouseUp)
        canvas.addEventListener('pointercancel', handleMouseUp)
      }

      if (engineRef.current) {
        Matter.Engine.clear(engineRef.current)
      }

      const c = cfg.current
      const engine = Matter.Engine.create({
        gravity: { x: 0, y: c.gravityY, scale: c.gravityScale },
      })
      engineRef.current = engine

      const ax = sizeRef.current.w / 2
      const ay = 0
      anchorRef.current = { x: ax, y: ay }
      createChain(ax, ay)

      animFrameRef.current = requestAnimationFrame(physicsLoop)
    }

    const startHands = () => {
      loadHandsScript()
        .then(async () => {
          if (!handsActive || !videoRef.current) return

          const hands = new window.Hands({
            locateFile: (file: string) =>
              `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240/${file}`,
          })

          hands.setOptions({
            maxNumHands: 2,
            modelComplexity: 0,
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.4,
            selfieMode: false,
          })

          hands.onResults((results: HandResults) => {
            processHandResults(results)
          })

          handsRef.current = hands
          await hands.initialize()

          const sendFrame = async () => {
            if (!handsActive || !handsRef.current || !videoRef.current || videoRef.current.readyState < 2) {
              if (handsActive) requestAnimationFrame(sendFrame)
              return
            }
            await handsRef.current.send({ image: videoRef.current })
            if (handsActive) requestAnimationFrame(sendFrame)
          }

          sendFrame()
        })
        .catch(() => {})
    }

    updateSize()

    if (sizeRef.current.w === 0 || sizeRef.current.h === 0) {
      const retry = requestAnimationFrame(() => {
        updateSize()
        setupChain()
        startHands()
      })
      const resizeObs = new ResizeObserver(() => {
        updateSize()
      })
      resizeObs.observe(container)

      return () => {
        handsActive = false
        cancelAnimationFrame(retry)
        if (engineRef.current) {
          Matter.Engine.clear(engineRef.current)
        }
        resizeObs.disconnect()
      }
    }

    setupChain()
    startHands()

    const resizeObs = new ResizeObserver(updateSize)
    resizeObs.observe(container)

    return () => {
      handsActive = false
      cancelAnimationFrame(animFrameRef.current)
      const canvas = canvasRef.current
      if (canvas) {
        canvas.removeEventListener('pointerdown', handleMouseDown)
        canvas.removeEventListener('pointermove', handleMouseMove)
        canvas.removeEventListener('pointerup', handleMouseUp)
        canvas.removeEventListener('pointercancel', handleMouseUp)
      }
      if (handsRef.current) {
        handsRef.current.close()
      }
      if (engineRef.current) {
        Matter.Engine.clear(engineRef.current)
      }
      resizeObs.disconnect()
    }
  }, [])

  useEffect(() => {
    if (!engineRef.current) return
    destroyChain()
    const ax = sizeRef.current.w / 2
    const ay = 0
    anchorRef.current = { x: ax, y: ay }
    createChain(ax, ay)
  }, [config])

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0"
      style={{
        width: '100%',
        height: '100%',
        zIndex: 50,
        cursor: 'grab',
        touchAction: 'none',
      }}
    />
  )
}
