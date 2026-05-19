import { useRef, useEffect, useCallback, useState } from 'react'
import { ArrowLeft, Volume2, VolumeX } from 'lucide-react'
import Matter from 'matter-js'
import IntroOverlay from './IntroOverlay'

const INDEX_TIP = 8
const THUMB_TIP = 4
const CURVE_SEGMENTS = 28
const CURVE_RADIUS = 6
const MAX_HANDS = 2
const YT_PLAYLIST_ID = 'RDpM98BjKOBP4'

type Tip = { x: number; y: number }
type HandTips = { thumb: Tip; index: Tip }

type HandCurve = {
  segs: Matter.Body[]
  segIds: Set<number>
  touching: Set<number>
  dipFactor: number
  active: boolean
}

type BgStar = {
  x: number
  y: number
  r: number
  phase: number
  speed: number
  nextFlash: number
}

function loadHandsScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.Hands) { resolve(); return }
    const script = document.createElement('script')
    script.src = 'https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240/hands.js'
    script.crossOrigin = 'anonymous'
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Failed to load MediaPipe Hands'))
    document.head.appendChild(script)
  })
}

function drawStar(ctx: CanvasRenderingContext2D, cx: number, cy: number, outerR: number) {
  const innerR = outerR * 0.382
  const points = 5
  ctx.beginPath()
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outerR : innerR
    const angle = (Math.PI * i) / points - Math.PI / 2
    const x = cx + Math.cos(angle) * r
    const y = cy + Math.sin(angle) * r
    if (i === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  }
  ctx.closePath()
}

function buildBgStars(w: number, h: number): BgStar[] {
  const count = Math.max(80, Math.min(260, Math.floor((w * h) / 6500)))
  const stars: BgStar[] = []
  const now = performance.now()
  for (let i = 0; i < count; i++) {
    stars.push({
      x: Math.random() * w,
      y: Math.random() * h,
      r: 0.4 + Math.random() * 1.6,
      phase: Math.random() * Math.PI * 2,
      speed: 0.3 + Math.random() * 1.1,
      nextFlash: now + 4000 + Math.random() * 14000,
    })
  }
  return stars
}

export default function StarRain({ onBack }: { onBack: () => void }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const cameraVideoRef = useRef<HTMLVideoElement | null>(null)
  const handsRef = useRef<any>(null)
  const engineRef = useRef<Matter.Engine | null>(null)
  const handsTipsRef = useRef<(HandTips | null)[]>([null, null])
  const handCurvesRef = useRef<HandCurve[]>([])
  const spawnTimerRef = useRef(0)
  const starBodiesRef = useRef<Set<number>>(new Set())
  const worldRef = useRef<Matter.World | null>(null)
  const dimOverlayRef = useRef<HTMLCanvasElement | null>(null)
  const bgStarsRef = useRef<BgStar[]>([])

  const playerRef = useRef<any>(null)
  const [audioPlaying, setAudioPlaying] = useState(false)
  const [audioReady, setAudioReady] = useState(false)

  const removeOffscreenStars = useCallback(() => {
    const world = worldRef.current
    if (!world) return
    const h = canvasRef.current?.height ?? 0
    const allBodies = Matter.Composite.allBodies(world)
    for (const body of allBodies) {
      if (body.isStatic) continue
      if (body.position.y > h + 80) {
        starBodiesRef.current.delete(body.id)
        for (const hand of handCurvesRef.current) hand.touching.delete(body.id)
        Matter.Composite.remove(world, body)
      }
    }
  }, [])

  useEffect(() => {
    const container = containerRef.current
    const canvas = canvasRef.current
    if (!container || !canvas) return

    let active = true
    const ctx = canvas.getContext('2d')!

    const buildDimOverlay = (w: number, h: number) => {
      const dim = document.createElement('canvas')
      dim.width = w
      dim.height = h
      const dc = dim.getContext('2d')
      if (!dc) return

      const beamCx = w * 0.5
      const beamTopH = w * 0.06
      const beamBotH = w * 0.38

      const beamPath = new Path2D()
      beamPath.moveTo(beamCx - beamTopH, -10)
      beamPath.lineTo(beamCx + beamTopH, -10)
      beamPath.lineTo(beamCx + beamBotH, h + 10)
      beamPath.lineTo(beamCx - beamBotH, h + 10)
      beamPath.closePath()

      dc.fillStyle = 'rgba(0,0,0,0.32)'
      dc.fillRect(0, 0, w, h)

      dc.globalCompositeOperation = 'destination-out'
      dc.filter = 'blur(32px)'
      dc.fillStyle = 'rgba(0,0,0,1)'
      dc.fill(beamPath)
      dc.filter = 'none'

      dc.globalCompositeOperation = 'lighter'
      dc.filter = 'blur(26px)'
      const warmGrad = dc.createLinearGradient(0, 0, 0, h)
      warmGrad.addColorStop(0,    'rgba(255,240,200,0.50)')
      warmGrad.addColorStop(0.22, 'rgba(255,220,170,0.34)')
      warmGrad.addColorStop(0.55, 'rgba(250,195,130,0.16)')
      warmGrad.addColorStop(0.85, 'rgba(220,165,90,0.05)')
      warmGrad.addColorStop(1,    'rgba(180,130,70,0.00)')
      dc.fillStyle = warmGrad
      dc.fill(beamPath)
      dc.filter = 'none'
      dc.globalCompositeOperation = 'source-over'

      dimOverlayRef.current = dim
    }

    const resize = () => {
      const w = container.clientWidth
      const h = container.clientHeight
      canvas.width = w
      canvas.height = h
      buildDimOverlay(w, h)
      bgStarsRef.current = buildBgStars(w, h)
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(container)

    const engine = Matter.Engine.create({
      gravity: { x: 0, y: 0.4, scale: 0.001 },
    })
    engineRef.current = engine
    worldRef.current = engine.world

    const hands: HandCurve[] = []
    for (let hi = 0; hi < MAX_HANDS; hi++) {
      const segs: Matter.Body[] = []
      const segIds = new Set<number>()
      for (let i = 0; i < CURVE_SEGMENTS; i++) {
        const seg = Matter.Bodies.circle(-1000, -1000, CURVE_RADIUS, {
          isStatic: true,
          friction: 0.5,
          restitution: 0.4,
        })
        segs.push(seg)
        segIds.add(seg.id)
      }
      hands.push({ segs, segIds, touching: new Set<number>(), dipFactor: 0.15, active: false })
    }
    handCurvesRef.current = hands

    const onCollisionStart = (event: Matter.IEventCollision<Matter.Engine>) => {
      for (const pair of event.pairs) {
        const a = pair.bodyA.id
        const b = pair.bodyB.id
        const stars = starBodiesRef.current
        for (const hand of handCurvesRef.current) {
          if (hand.segIds.has(a) && stars.has(b)) hand.touching.add(b)
          else if (hand.segIds.has(b) && stars.has(a)) hand.touching.add(a)
        }
      }
    }
    const onCollisionEnd = (event: Matter.IEventCollision<Matter.Engine>) => {
      for (const pair of event.pairs) {
        const a = pair.bodyA.id
        const b = pair.bodyB.id
        const stars = starBodiesRef.current
        for (const hand of handCurvesRef.current) {
          if (hand.segIds.has(a) && stars.has(b)) hand.touching.delete(b)
          else if (hand.segIds.has(b) && stars.has(a)) hand.touching.delete(a)
        }
      }
    }
    Matter.Events.on(engine, 'collisionStart', onCollisionStart)
    Matter.Events.on(engine, 'collisionEnd', onCollisionEnd)

    canvas.addEventListener('pointerdown', (e) => {
      const rect = canvas.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top

      const allBodies = Matter.Composite.allBodies(engine.world)
      for (const body of allBodies) {
        if (body.isStatic) continue
        const dx = body.position.x - x
        const dy = body.position.y - y
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < 30) {
          Matter.Body.applyForce(body, body.position, { x: (x - body.position.x) * 0.005, y: -0.03 })
        }
      }
    })

    navigator.mediaDevices
      .getUserMedia({ video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' } })
      .then(async (stream) => {
        if (!active) { stream.getTracks().forEach((t) => t.stop()); return }

        const video = document.createElement('video')
        video.setAttribute('playsinline', '')
        video.setAttribute('webkit-playsinline', '')
        video.muted = true
        video.autoplay = true
        video.srcObject = stream
        video.play().catch(() => {})
        cameraVideoRef.current = video

        await loadHandsScript()

        const handsAPI = new window.Hands({
          locateFile: (file: string) =>
            `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240/${file}`,
        })
        handsAPI.setOptions({
          maxNumHands: MAX_HANDS,
          modelComplexity: 0,
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.4,
          selfieMode: true,
        })

        handsAPI.onResults((results: any) => {
          const list = results.multiHandLandmarks ?? []
          const w = canvas.width
          const h = canvas.height
          const tips: (HandTips | null)[] = [null, null]
          for (let i = 0; i < Math.min(MAX_HANDS, list.length); i++) {
            const lm = list[i]
            if (lm && lm.length >= 21) {
              tips[i] = {
                thumb: { x: lm[THUMB_TIP].x * w, y: lm[THUMB_TIP].y * h },
                index: { x: lm[INDEX_TIP].x * w, y: lm[INDEX_TIP].y * h },
              }
            }
          }
          handsTipsRef.current = tips
        })

        handsRef.current = handsAPI
        await handsAPI.initialize()

        const sendFrame = async () => {
          if (!active || !handsRef.current || video.readyState < 2) {
            if (active) requestAnimationFrame(sendFrame)
            return
          }
          await handsRef.current.send({ image: video })
          if (active) requestAnimationFrame(sendFrame)
        }
        sendFrame()
      })
      .catch(() => {})

    const drawBackground = (w: number, h: number) => {
      const grad = ctx.createLinearGradient(0, 0, 0, h)
      grad.addColorStop(0, '#0a0617')
      grad.addColorStop(0.55, '#0d0a24')
      grad.addColorStop(1, '#04020c')
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, w, h)

      const now = performance.now()
      const tSec = now * 0.001
      const stars = bgStarsRef.current
      for (const s of stars) {
        const twinkle = 0.5 + 0.5 * Math.sin(tSec * s.speed + s.phase)
        let alpha = 0.22 + 0.55 * twinkle
        let radius = s.r
        let isFlash = false
        if (now > s.nextFlash && now < s.nextFlash + 800) {
          const ft = (now - s.nextFlash) / 800
          const peak = 1 - Math.abs(ft * 2 - 1)
          alpha = Math.min(1, alpha + peak * 0.9)
          radius = s.r * (1 + peak * 1.6)
          isFlash = true
        } else if (now >= s.nextFlash + 800) {
          s.nextFlash = now + 5000 + Math.random() * 18000
        }

        ctx.save()
        if (isFlash) {
          ctx.shadowColor = 'rgba(255,240,200,0.85)'
          ctx.shadowBlur = 14
        }
        ctx.fillStyle = `rgba(255,250,240,${alpha.toFixed(3)})`
        ctx.beginPath()
        ctx.arc(s.x, s.y, radius, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()
      }
    }

    const physicsThenRender = () => {
      if (!active) return

      const w = canvas.width
      const h = canvas.height

      spawnTimerRef.current++
      if (spawnTimerRef.current % 6 === 0) {
        const size = 4 + Math.random() * 16
        const spawnHalfW = w * 0.06
        const starBody = Matter.Bodies.circle(
          w * 0.5 + (Math.random() - 0.5) * spawnHalfW * 2,
          -size * 2,
          size,
          {
            restitution: 0.3,
            friction: 0.6,
            frictionAir: 0.004,
            density: 0.002,
          }
        )
        Matter.Body.setAngularVelocity(starBody, (Math.random() - 0.5) * 0.08)
        starBodiesRef.current.add(starBody.id)
        Matter.Composite.add(engine.world, starBody)
      }

      removeOffscreenStars()

      const tSec = performance.now() * 0.001
      const allBodiesForWind = Matter.Composite.allBodies(engine.world)
      for (const body of allBodiesForWind) {
        if (body.isStatic) continue
        if (!starBodiesRef.current.has(body.id)) continue
        const phase = body.id * 0.73
        const windX =
          Math.sin(tSec * 0.6 + phase) * 0.00006 +
          Math.sin(tSec * 1.7 + phase * 2.1) * 0.00003
        Matter.Body.applyForce(body, body.position, { x: windX, y: 0 })
        Matter.Body.setAngularVelocity(
          body,
          body.angularVelocity + (Math.random() - 0.5) * 0.003
        )
      }

      Matter.Engine.update(engine, 1000 / 60)

      ctx.clearRect(0, 0, w, h)

      drawBackground(w, h)

      const allBodies = Matter.Composite.allBodies(engine.world)
      for (const body of allBodies) {
        if (body.isStatic) continue
        if (!starBodiesRef.current.has(body.id)) continue

        const r = (body as any).circleRadius ?? 8
        ctx.save()
        ctx.translate(body.position.x, body.position.y)
        ctx.rotate(body.angle)
        ctx.shadowColor = 'rgba(255,153,0,0.55)'
        ctx.shadowBlur = 18
        ctx.fillStyle = '#FF9900'
        ctx.strokeStyle = '#FF9900'
        ctx.lineJoin = 'round'
        ctx.lineWidth = Math.max(1.5, r * 0.35)
        drawStar(ctx, 0, 0, r * 1.0)
        ctx.stroke()
        ctx.fill()
        ctx.restore()
      }

      const overlay = dimOverlayRef.current
      if (overlay) {
        ctx.drawImage(overlay, 0, 0)
      }

      const tipsList = handsTipsRef.current
      for (let hi = 0; hi < MAX_HANDS; hi++) {
        const hand = handCurvesRef.current[hi]
        if (!hand) continue
        const tip = tipsList[hi]
        if (tip) {
          const { thumb, index: idx } = tip
          const mx = (idx.x + thumb.x) / 2
          const my = (idx.y + thumb.y) / 2
          const dx = idx.x - thumb.x
          const dy = idx.y - thumb.y
          const dist = Math.sqrt(dx * dx + dy * dy)
          const safeDist = Math.max(0.001, dist)

          let nx = -dy / safeDist
          let ny = dx / safeDist
          if (ny < 0) { nx = -nx; ny = -ny }

          const targetFactor = Math.min(0.7, 0.15 + 0.025 * hand.touching.size)
          hand.dipFactor += (targetFactor - hand.dipFactor) * 0.12
          const dip = dist * hand.dipFactor

          const cpx = mx + nx * dip
          const cpy = my + ny * dip

          if (!hand.active) {
            Matter.Composite.add(engine.world, hand.segs)
            hand.active = true
          }
          for (let i = 0; i < hand.segs.length; i++) {
            const t = i / (hand.segs.length - 1)
            const omt = 1 - t
            const x = omt * omt * thumb.x + 2 * omt * t * cpx + t * t * idx.x
            const y = omt * omt * thumb.y + 2 * omt * t * cpy + t * t * idx.y
            Matter.Body.setPosition(hand.segs[i], { x, y })
          }

          ctx.save()
          ctx.lineCap = 'round'
          ctx.lineJoin = 'round'

          ctx.strokeStyle = 'rgba(255,255,255,0.18)'
          ctx.lineWidth = 14
          ctx.shadowColor = 'rgba(255,255,255,0.75)'
          ctx.shadowBlur = 22
          ctx.beginPath()
          ctx.moveTo(thumb.x, thumb.y)
          ctx.quadraticCurveTo(cpx, cpy, idx.x, idx.y)
          ctx.stroke()

          ctx.strokeStyle = 'rgba(255,255,255,0.95)'
          ctx.lineWidth = 5
          ctx.shadowColor = 'rgba(255,255,255,0.6)'
          ctx.shadowBlur = 10
          ctx.beginPath()
          ctx.moveTo(thumb.x, thumb.y)
          ctx.quadraticCurveTo(cpx, cpy, idx.x, idx.y)
          ctx.stroke()

          ctx.restore()
        } else if (hand.active) {
          Matter.Composite.remove(engine.world, hand.segs)
          hand.touching.clear()
          hand.dipFactor = 0.15
          hand.active = false
        }
      }

      requestAnimationFrame(physicsThenRender)
    }
    requestAnimationFrame(physicsThenRender)

    return () => {
      active = false
      ro.disconnect()
      if (handsRef.current) {
        handsRef.current.close().catch(() => {})
        handsRef.current = null
      }
      if (cameraVideoRef.current?.srcObject) {
        const stream = cameraVideoRef.current.srcObject as MediaStream
        stream.getTracks().forEach((t) => t.stop())
      }
      if (engineRef.current) {
        Matter.Events.off(engineRef.current, 'collisionStart', onCollisionStart)
        Matter.Events.off(engineRef.current, 'collisionEnd', onCollisionEnd)
        Matter.Engine.clear(engineRef.current)
      }
    }
  }, [removeOffscreenStars])

  useEffect(() => {
    let cancelled = false

    const init = () => {
      if (cancelled) return
      const YT = (window as any).YT
      const target = document.getElementById('starrain-yt-player')
      if (!YT || !YT.Player || !target) return
      new YT.Player(target, {
        height: '1',
        width: '1',
        playerVars: {
          autoplay: 1,
          controls: 0,
          playsinline: 1,
          listType: 'playlist',
          list: YT_PLAYLIST_ID,
        },
        events: {
          onReady: (e: any) => {
            if (cancelled) {
              try { e.target.destroy() } catch {}
              return
            }
            playerRef.current = e.target
            setAudioReady(true)
            try {
              e.target.unMute()
              e.target.setVolume(60)
              e.target.playVideo()
            } catch {}
          },
          onStateChange: (e: any) => {
            if (e.data === 1) setAudioPlaying(true)
            else if (e.data === 2 || e.data === 0) setAudioPlaying(false)
          },
        },
      })
    }

    const w = window as any
    if (w.YT && w.YT.Player) {
      init()
    } else {
      if (!document.getElementById('yt-iframe-api')) {
        const s = document.createElement('script')
        s.id = 'yt-iframe-api'
        s.src = 'https://www.youtube.com/iframe_api'
        document.head.appendChild(s)
      }
      const prev = w.onYouTubeIframeAPIReady
      w.onYouTubeIframeAPIReady = () => {
        if (typeof prev === 'function') prev()
        init()
      }
    }

    return () => {
      cancelled = true
      if (playerRef.current) {
        try { playerRef.current.destroy() } catch {}
        playerRef.current = null
      }
    }
  }, [])

  const toggleAudio = () => {
    const p = playerRef.current
    if (!p) return
    try {
      const state = p.getPlayerState?.()
      if (state === 1) p.pauseVideo()
      else { p.unMute?.(); p.playVideo() }
    } catch {}
  }

  return (
    <div ref={containerRef} className="w-full h-full bg-black overflow-hidden relative">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" style={{ touchAction: 'none' }} />

      <div
        style={{
          position: 'absolute',
          width: 1,
          height: 1,
          overflow: 'hidden',
          opacity: 0,
          pointerEvents: 'none',
          left: -10,
          top: -10,
        }}
      >
        <div id="starrain-yt-player" />
      </div>

      <div className="absolute top-3 left-3 z-10 flex items-center gap-2">
        <button
          onClick={onBack}
          className="w-8 h-8 flex items-center justify-center rounded-lg bg-black/40 text-text-secondary hover:text-text-primary border border-white/10 transition-colors"
        >
          <ArrowLeft size={14} />
        </button>
        <span className="text-[11px] font-medium text-text-secondary bg-black/40 px-2.5 py-1.5 rounded-lg border border-white/10">
          Star Rain
        </span>
      </div>

      <button
        onClick={toggleAudio}
        disabled={!audioReady}
        title={audioPlaying ? 'Pause music' : 'Play music'}
        className="absolute bottom-4 right-4 z-10 w-9 h-9 flex items-center justify-center rounded-full bg-black/40 backdrop-blur text-white/70 hover:text-white border border-white/10 transition-colors disabled:opacity-40"
      >
        {audioPlaying ? <Volume2 size={15} /> : <VolumeX size={15} />}
      </button>

      <IntroOverlay
        title="Star Rain"
        zh="张开拇指与食指形成一条光弦，接住从光束中飘落的星星。星星越多，弦越下沉。支持双手同时操作。"
        en="Open thumb and index finger to form a light string, then catch the stars falling through the beam. The more stars, the lower it sags. Two hands supported."
      />
    </div>
  )
}
