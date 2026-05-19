import { useRef, useEffect, useState } from 'react'
import { ArrowLeft } from 'lucide-react'

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
  multiHandLandmarks?: NormalizedLandmark[][]
}

interface NormalizedLandmark {
  x: number
  y: number
  z: number
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

export default function HandDistance({ onBack }: { onBack: () => void }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const handsRef = useRef<HandsInstance | null>(null)
  const bgVideoRef = useRef<HTMLVideoElement | null>(null)
  const [distance, setDistance] = useState(0)
  const [handOpen, setHandOpen] = useState(false)
  const [speed, setSpeed] = useState(1.0)
  const landmarksRef = useRef<NormalizedLandmark[]>([])

  useEffect(() => {
    const container = containerRef.current
    const canvas = canvasRef.current
    if (!container || !canvas) return

    let active = true
    const ctx = canvas.getContext('2d')!

    const resize = () => {
      canvas.width = container.clientWidth
      canvas.height = container.clientHeight
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(container)

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
        videoRef.current = video

        await loadHandsScript()

        const hands = new window.Hands({
          locateFile: (file: string) =>
            `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240/${file}`,
        })
        hands.setOptions({
          maxNumHands: 1,
          modelComplexity: 0,
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.4,
          selfieMode: true,
        })

        hands.onResults((results: HandResults) => {
          const hands = results.multiHandLandmarks
          if (hands && hands.length > 0 && hands[0].length >= 21) {
            landmarksRef.current = hands[0]
          } else {
            landmarksRef.current = []
          }
        })

        handsRef.current = hands
        await hands.initialize()

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

    const render = () => {
      if (!active) return
      const w = canvas.width
      const h = canvas.height
      ctx.clearRect(0, 0, w, h)

      const lm = landmarksRef.current

      if (lm.length >= 21) {
        const palmLeft = lm[17]
        const palmRight = lm[5]
        const palmW = Math.hypot(palmRight.x - palmLeft.x, palmRight.y - palmLeft.y)
        const rawDist = 0.18 / Math.max(0.001, palmW)
        const clampedDist = Math.round(Math.min(100, Math.max(0, rawDist * 10)))

        const wristDist = (ti: number) => {
          const dx = lm[ti].x - lm[0].x
          const dy = lm[ti].y - lm[0].y
          return Math.sqrt(dx * dx + dy * dy)
        }
        const middleMcpDist = wristDist(9)
        const openCount = [4, 8, 12, 16, 20].filter((ti) => wristDist(ti) > middleMcpDist * 1.3).length
        const isOpen = openCount >= 4

        setDistance(clampedDist)
        setHandOpen(isOpen)

        const targetSpeed = (() => {
          if (clampedDist >= 50) return 0
          if (clampedDist >= 30) return (50 - clampedDist) * 0.025
          if (clampedDist >= 16) return 0.7 - (clampedDist - 16) * (0.2 / 14)
          if (clampedDist >= 12) return 1.0 - (clampedDist - 12) * (0.3 / 4)
          return 1.0 + (12 - clampedDist) * 0.075
        })()
        const roundedSpeed = Math.round(targetSpeed * 100) / 100
        setSpeed(roundedSpeed)
        if (bgVideoRef.current && bgVideoRef.current.readyState >= 2) {
          bgVideoRef.current.playbackRate = roundedSpeed
        }

        const CONNECTIONS: [number, number][] = [
          [0,1],[1,2],[2,3],[3,4],[0,5],[5,6],[6,7],[7,8],
          [0,9],[9,10],[10,11],[11,12],[0,13],[13,14],[14,15],[15,16],
          [0,17],[17,18],[18,19],[19,20],[5,9],[9,13],[13,17],
        ]

        ctx.save()
        ctx.strokeStyle = isOpen ? 'rgba(0,255,100,0.6)' : 'rgba(255,255,255,0.35)'
        ctx.lineWidth = 2
        ctx.shadowColor = isOpen ? 'rgba(0,255,100,0.3)' : 'rgba(255,255,255,0.15)'
        ctx.shadowBlur = 3
        for (const [a, b] of CONNECTIONS) {
          if (lm[a] && lm[b]) {
            ctx.beginPath()
            ctx.moveTo(lm[a].x * w, lm[a].y * h)
            ctx.lineTo(lm[b].x * w, lm[b].y * h)
            ctx.stroke()
          }
        }
        ctx.restore()

        const px = Math.round(lm[17].x * w)
        const py = Math.round(lm[17].y * h)
        const px2 = Math.round(lm[5].x * w)
        const py2 = Math.round(lm[5].y * h)
        ctx.beginPath()
        ctx.strokeStyle = 'rgba(255,255,0,0.7)'
        ctx.lineWidth = 3
        ctx.setLineDash([6, 3])
        ctx.moveTo(px, py)
        ctx.lineTo(px2, py2)
        ctx.stroke()
        ctx.setLineDash([])
      } else {
        setSpeed(0)
        if (bgVideoRef.current && bgVideoRef.current.readyState >= 2) {
          bgVideoRef.current.playbackRate = 0
        }
      }

      requestAnimationFrame(render)
    }
    requestAnimationFrame(render)

    return () => {
      active = false
      ro.disconnect()
      if (handsRef.current) {
        handsRef.current.close().catch(() => {})
        handsRef.current = null
      }
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream
        stream.getTracks().forEach((t) => t.stop())
      }
    }
  }, [])

  return (
    <div ref={containerRef} className="w-full h-full bg-black overflow-hidden relative">
      <video
        ref={bgVideoRef}
        src="/draw.mp4"
        playsInline
        muted
        loop
        autoPlay
        className="absolute inset-0 w-full h-full object-cover"
        style={{ opacity: 0.35 }}
        onLoadedMetadata={() => bgVideoRef.current?.play().catch(() => {})}
      />
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" style={{ touchAction: 'none' }} />

      <div className="absolute top-3 left-3 z-10 flex items-center gap-2">
        <button
          onClick={onBack}
          className="w-8 h-8 flex items-center justify-center rounded-lg bg-black/40 text-text-secondary hover:text-text-primary border border-white/10 transition-colors"
        >
          <ArrowLeft size={14} />
        </button>
        <span className="text-[11px] font-medium text-text-secondary bg-black/40 px-2.5 py-1.5 rounded-lg border border-white/10">
          Hand Distance
        </span>
      </div>

      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2">
        <div className={`text-sm font-medium px-4 py-2 rounded-xl backdrop-blur-md border transition-colors ${
          handOpen
            ? 'bg-green-500/10 text-green-400 border-green-500/30'
            : 'bg-black/40 text-text-dim border-white/10'
        }`}>
          {handOpen ? 'Open Hand Detected' : 'Show open palm'}
        </div>
        <div className="text-[10px] text-text-dim tracking-widest uppercase">
          Relative Distance
        </div>
        <div className="text-5xl font-bold text-white tabular-nums tracking-tight">
          {distance}
        </div>
        <div className="text-[10px] text-text-dim tracking-widest uppercase">
          {distance < 20 ? 'Too close' : distance < 40 ? 'Near' : distance < 60 ? 'Mid' : distance < 80 ? 'Far' : 'Very far'}
        </div>
        <div className="flex items-center gap-3 mt-1">
          <div className="text-[10px] text-text-dim tracking-widest uppercase">
            Speed
          </div>
          <div className="text-lg font-mono font-bold text-amber-400 tabular-nums">
            {speed.toFixed(2)}×
          </div>
        </div>
      </div>
    </div>
  )
}
