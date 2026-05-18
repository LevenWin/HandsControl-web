import { useRef, useEffect, useCallback, useState } from 'react'
import { ArrowLeft, Upload, Camera, Settings, X, Download, FileInput, Music, VolumeX } from 'lucide-react'
import IntroOverlay from './IntroOverlay'

const HAND_CONNECTIONS: [number, number][] = [
  [0,1], [1,2], [2,3], [3,4],
  [0,5], [5,6], [6,7], [7,8],
  [0,9], [9,10], [10,11], [11,12],
  [0,13], [13,14], [14,15], [15,16],
  [0,17], [17,18], [18,19], [19,20],
  [5,9], [9,13], [13,17],
]

interface NormalizedLandmark {
  x: number
  y: number
  z: number
  visibility?: number
}

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
  multiHandLandmarks?: NormalizedLandmark[][]
  multiHandedness?: { index: number; score: number; label: string }[]
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

interface CandleConfig {
  candleX: number
  candleY: number
  flameOffsetX: number
  flameOffsetY: number
  candleScale: number
  spotlightRadius: number
  flickerAmplitude: number
  flickerSpeed: number
  flickerRandomness: number
  centerBrightness: number
  edgeSoftness: number
  glowIntensity: number
  glowRadius: number
  warmth: number
  maskColorTemp: number
  handOffsetX: number
  handOffsetY: number
}

const defaultConfig: CandleConfig = {
  candleX: 0.46481566733919966,
  candleY: 0.5072977622581403,
  flameOffsetX: -17,
  flameOffsetY: -120,
  candleScale: 2.85,
  spotlightRadius: 125,
  flickerAmplitude: 8,
  flickerSpeed: 0.065,
  flickerRandomness: 0.5,
  centerBrightness: 0.15,
  edgeSoftness: 1,
  glowIntensity: 0.5,
  glowRadius: 1.6,
  warmth: 1.35,
  maskColorTemp: 1,
  handOffsetX: 96,
  handOffsetY: 36,
}

interface SliderProps {
  label: string
  value: number
  min: number
  max: number
  step: number
  onChange: (v: number) => void
  unit?: string
}

function Slider({ label, value, min, max, step, onChange, unit }: SliderProps) {
  const pct = ((value - min) / (max - min)) * 100
  return (
    <div className="mb-2.5">
      <div className="flex justify-between items-center mb-0.5">
        <span className="text-[10px] text-text-dim">{label}</span>
        <span className="text-[10px] text-text-secondary tabular-nums">
          {value.toFixed(step < 0.01 ? 3 : step < 0.1 ? 2 : 0)}{unit ?? ''}
        </span>
      </div>
      <div className="relative h-1.5 bg-bg-control rounded-full cursor-pointer"
        onPointerDown={(e) => {
          const rect = e.currentTarget.getBoundingClientRect()
          const update = (ev: PointerEvent) => {
            const p = Math.max(0, Math.min(1, (ev.clientX - rect.left) / rect.width))
            onChange(Math.round((min + p * (max - min)) / step) * step)
          }
          update(e.nativeEvent)
          const onUp = () => { window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp) }
          const onMove = (ev: PointerEvent) => update(ev)
          window.addEventListener('pointermove', onMove)
          window.addEventListener('pointerup', onUp)
        }}
      >
        <div className="absolute top-0 left-0 h-full bg-warm-glow rounded-full transition-all duration-75" style={{ width: `${pct}%` }} />
        <div className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow border border-warm-glow/50 transition-all duration-75" style={{ left: `${pct}%`, marginLeft: -6 }} />
      </div>
    </div>
  )
}


export default function CandleLight({ onBack }: { onBack: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const candleImgRef = useRef<HTMLImageElement | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const animRef = useRef(0)
  const sizeRef = useRef({ w: 0, h: 0 })
  const flickerPhaseRef = useRef(0)
  const [useWebcam, setUseWebcam] = useState(true)
  const [bgIsWebcam, setBgIsWebcam] = useState(false)
  const [bgImage, setBgImage] = useState<HTMLImageElement | null>(null)
  const [showPanel, setShowPanel] = useState(false)
  const [cfg, setCfg] = useState<CandleConfig>(defaultConfig)
  const cfgRef = useRef(defaultConfig)
  cfgRef.current = cfg

  const ytPlayerRef = useRef<any>(null)
  const ytReadyRef = useRef(false)
  const [ytPlaying, setYtPlaying] = useState(false)

  const draggingRef = useRef(false)
  const dragOffsetRef = useRef({ x: 0, y: 0 })
  const candleScreenRef = useRef({ x: 0, y: 0, w: 0, h: 0 })

  const handsRef = useRef<HandsInstance | null>(null)
  const handLandmarksRef = useRef<NormalizedLandmark[][]>([])
  const handGrabbingRef = useRef(false)
  const handSmoothRef = useRef({ x: 0.5, y: 0.35 })

  const updateCandleScreen = (imgW: number, imgH: number, screenW: number, screenH: number) => {
    const c = cfgRef.current
    const cw = 64 * c.candleScale
    const ch = (imgH / imgW) * cw
    const cx = c.candleX * screenW - cw / 2
    const cy = c.candleY * screenH - ch / 2
    candleScreenRef.current = { x: cx, y: cy, w: cw, h: ch }
  }

  const updateCfg = useCallback((key: keyof CandleConfig, value: number) => {
    setCfg((prev) => ({ ...prev, [key]: value }))
  }, [])

  const drawCoverBackground = useCallback((ctx: CanvasRenderingContext2D, source: CanvasImageSource, sw: number, sh: number, dw: number, dh: number) => {
    const scale = Math.max(dw / sw, dh / sh)
    const iw = sw * scale
    const ih = sh * scale
    const ox = (dw - iw) / 2
    const oy = (dh - ih) / 2
    ctx.drawImage(source, ox, oy, iw, ih)
  }, [])

  useEffect(() => {
    const img = candleImgRef.current
    if (!img) return
    const { w, h } = sizeRef.current
    if (w > 0 && h > 0) {
      updateCandleScreen(img.naturalWidth, img.naturalHeight, w, h)
    }
  }, [cfg.candleScale])

  useEffect(() => {
    const img = new Image()
    img.src = '/candle_bg.jpg'
    img.onload = () => { setBgImage(img) }
  }, [])

  useEffect(() => {
    const img = new Image()
    img.src = '/candle.png'
    img.onload = () => {
      candleImgRef.current = img
      const { w, h } = sizeRef.current
      if (w > 0 && h > 0) {
        updateCandleScreen(img.naturalWidth, img.naturalHeight, w, h)
      }
    }
  }, [])

  useEffect(() => {
    const container = containerRef.current
    const canvas = canvasRef.current
    if (!container || !canvas) return

    let running = true
    const ctx = canvas.getContext('2d', { willReadFrequently: false })!

    const resize = () => {
      const w = container.clientWidth
      const h = container.clientHeight
      sizeRef.current = { w, h }
      canvas.width = w
      canvas.height = h
      const img = candleImgRef.current
      if (img) updateCandleScreen(img.naturalWidth, img.naturalHeight, w, h)
    }

    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(container)

    const render = () => {
      if (!running) return
      const { w, h } = sizeRef.current
      if (w === 0 || h === 0) {
        animRef.current = requestAnimationFrame(render)
        return
      }

      const c = cfgRef.current
      const hasWebcamVideo = useWebcam && videoRef.current && videoRef.current.readyState >= 2
      const showWebcamBg = hasWebcamVideo && bgIsWebcam
      const bgSource = showWebcamBg ? videoRef.current : bgImage

      const flameScreenX = c.candleX * w + c.flameOffsetX
      const flameScreenY = c.candleY * h + c.flameOffsetY
      const candleImg = candleImgRef.current

      flickerPhaseRef.current += c.flickerSpeed
      const sinFlicker = Math.sin(flickerPhaseRef.current) * c.flickerAmplitude
      const noiseFlicker = (Math.random() - 0.5) * c.flickerAmplitude * c.flickerRandomness
      const flickerR = c.spotlightRadius + sinFlicker + noiseFlicker
      const innerR = flickerR * c.centerBrightness

      const temp = c.maskColorTemp
      const maskR = Math.round(255)
      const maskG = Math.round(220 + 35 * (1 - temp))
      const maskB = Math.round(140 + 115 * (1 - temp))

      ctx.clearRect(0, 0, w, h)

      ctx.fillStyle = '#000'
      ctx.fillRect(0, 0, w, h)

      ctx.save()
      ctx.globalCompositeOperation = 'destination-out'
      const revealGrad = ctx.createRadialGradient(flameScreenX, flameScreenY, innerR, flameScreenX, flameScreenY, flickerR)
      const e = c.edgeSoftness
      revealGrad.addColorStop(0, 'rgba(255,255,255,1)')
      revealGrad.addColorStop(Math.max(0.02, 0.1 * e), 'rgba(255,255,255,1)')
      revealGrad.addColorStop(Math.min(0.95, 0.35 * e), `rgba(${maskR},${maskG},${maskB},0.88)`)
      revealGrad.addColorStop(Math.min(0.96, 0.6 * e), `rgba(${maskR},${maskG},${maskB},0.45)`)
      revealGrad.addColorStop(Math.min(0.97, 0.85 * e), `rgba(${maskR},${maskG},${maskB},0.08)`)
      revealGrad.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = revealGrad
      ctx.beginPath()
      ctx.arc(flameScreenX, flameScreenY, flickerR, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()

      if (bgSource) {
        ctx.save()
        ctx.globalCompositeOperation = 'destination-over'
        const sw = showWebcamBg ? (videoRef.current!.videoWidth || w) : (bgImage!.naturalWidth || w)
        const sh = showWebcamBg ? (videoRef.current!.videoHeight || h) : (bgImage!.naturalHeight || h)
        drawCoverBackground(ctx, bgSource, sw, sh, w, h)
        ctx.restore()
      }

      ctx.save()
      const glowR = flickerR * c.glowRadius
      const gi = c.glowIntensity
      const glowGrad = ctx.createRadialGradient(flameScreenX, flameScreenY, flickerR * 0.25, flameScreenX, flameScreenY, glowR)
      glowGrad.addColorStop(0, `rgba(255,180,50,${c.warmth * 0.3 * gi})`)
      glowGrad.addColorStop(0.3, `rgba(255,140,20,${c.warmth * 0.12 * gi})`)
      glowGrad.addColorStop(0.7, `rgba(200,80,10,${0.01 * gi})`)
      glowGrad.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = glowGrad
      ctx.beginPath()
      ctx.arc(flameScreenX, flameScreenY, glowR, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()

      if (candleImg) {
        const cs = candleScreenRef.current
        ctx.drawImage(candleImg, cs.x, cs.y, cs.w, cs.h)
      }

      const allHands = handLandmarksRef.current
      if (allHands.length > 0) {
        for (const landmarks of allHands) {
          if (!landmarks || landmarks.length < 21) continue

          const wrist = landmarks[0]
          const wristDist = (x: number, y: number) => {
            const dx = x - wrist.x
            const dy = y - wrist.y
            return Math.sqrt(dx * dx + dy * dy)
          }
          const middleMcpDist = wristDist(landmarks[9].x, landmarks[9].y)
          const tipIndices = [4, 8, 12, 16, 20]
          let curledCount = 0
          for (const ti of tipIndices) {
            if (wristDist(landmarks[ti].x, landmarks[ti].y) < middleMcpDist * 1.2) {
              curledCount++
            }
          }
          const isFist = curledCount >= 4

          if (isFist && !handGrabbingRef.current && !draggingRef.current) {
            handGrabbingRef.current = true
          }
          if (!isFist && handGrabbingRef.current) {
            handGrabbingRef.current = false
          }

          if (handGrabbingRef.current) {
            const midX = landmarks[9].x * w + c.handOffsetX
            const midY = landmarks[9].y * h + c.handOffsetY
            const nx = (midX - candleScreenRef.current.w / 2) / w
            const ny = (midY - candleScreenRef.current.h / 2) / h
            const cx = Math.max(0.02, Math.min(0.98, nx))
            const cy = Math.max(0.02, Math.min(0.98, ny))
            handSmoothRef.current.x += (cx - handSmoothRef.current.x) * 0.18
            handSmoothRef.current.y += (cy - handSmoothRef.current.y) * 0.18
            setCfg((prev) => ({
              ...prev,
              candleX: handSmoothRef.current.x,
              candleY: handSmoothRef.current.y,
            }))
            const img = candleImgRef.current
            if (img) updateCandleScreen(img.naturalWidth, img.naturalHeight, w, h)
          }

          ctx.save()
          ctx.strokeStyle = 'rgba(255,255,255,0.55)'
          ctx.lineWidth = 2
          ctx.shadowColor = 'rgba(255,255,255,0.2)'
          ctx.shadowBlur = 3
          for (const [a, b] of HAND_CONNECTIONS) {
            if (landmarks[a] && landmarks[b]) {
              ctx.beginPath()
              ctx.moveTo(landmarks[a].x * w, landmarks[a].y * h)
              ctx.lineTo(landmarks[b].x * w, landmarks[b].y * h)
              ctx.stroke()
            }
          }
          ctx.restore()
        }
      }

      animRef.current = requestAnimationFrame(render)
    }

    animRef.current = requestAnimationFrame(render)

    const onPointerDown = (e: PointerEvent) => {
      const cs = candleScreenRef.current
      if (e.clientX >= cs.x && e.clientX <= cs.x + cs.w && e.clientY >= cs.y && e.clientY <= cs.y + cs.h) {
        draggingRef.current = true
        dragOffsetRef.current = { x: e.clientX - cs.x, y: e.clientY - cs.y }
        if (canvasRef.current) canvasRef.current.style.cursor = 'grabbing'
        e.preventDefault()
      }
    }
    const onPointerMove = (e: PointerEvent) => {
      if (draggingRef.current) {
        const { w, h } = sizeRef.current
        const nx = (e.clientX - dragOffsetRef.current.x + candleScreenRef.current.w / 2) / w
        const ny = (e.clientY - dragOffsetRef.current.y + candleScreenRef.current.h / 2) / h
        const cx = Math.max(0.02, Math.min(0.98, nx))
        const cy = Math.max(0.02, Math.min(0.98, ny))
        setCfg((prev) => ({ ...prev, candleX: cx, candleY: cy }))
        const img = candleImgRef.current
        if (img) updateCandleScreen(img.naturalWidth, img.naturalHeight, w, h)
      } else {
        const cs = candleScreenRef.current
        if (e.clientX >= cs.x && e.clientX <= cs.x + cs.w && e.clientY >= cs.y && e.clientY <= cs.y + cs.h) {
          if (canvasRef.current) canvasRef.current.style.cursor = 'grab'
        } else {
          if (canvasRef.current) canvasRef.current.style.cursor = 'default'
        }
      }
    }
    const onPointerUp = () => {
      draggingRef.current = false
      if (canvasRef.current) canvasRef.current.style.cursor = 'default'
    }

    canvas.addEventListener('pointerdown', onPointerDown)
    canvas.addEventListener('pointermove', onPointerMove)
    canvas.addEventListener('pointerup', onPointerUp)
    canvas.addEventListener('pointerleave', onPointerUp)

    return () => {
      running = false
      cancelAnimationFrame(animRef.current)
      ro.disconnect()
      canvas.removeEventListener('pointerdown', onPointerDown)
      canvas.removeEventListener('pointermove', onPointerMove)
      canvas.removeEventListener('pointerup', onPointerUp)
      canvas.removeEventListener('pointerleave', onPointerUp)
    }
  }, [useWebcam, bgImage, drawCoverBackground])

  useEffect(() => {
    if (useWebcam) {
      let handsActive = true
      navigator.mediaDevices
        .getUserMedia({ video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' } })
        .then((s) => {
          if (!handsActive) { s.getTracks().forEach((t) => t.stop()); return }
          streamRef.current = s
          if (!videoRef.current) {
            const v = document.createElement('video')
            v.setAttribute('playsinline', '')
            v.setAttribute('webkit-playsinline', '')
            v.muted = true
            v.autoplay = true
            v.srcObject = s
            v.play().catch(() => {})
            videoRef.current = v
          } else {
            videoRef.current.srcObject = s
            videoRef.current.play().catch(() => {})
          }

          loadHandsScript().then(async () => {
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
              selfieMode: true,
            })
            hands.onResults((results: HandResults) => {
              handLandmarksRef.current = results.multiHandLandmarks ?? []
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
          }).catch(() => {})
        })
        .catch(() => { if (handsActive) setUseWebcam(false) })
      return () => {
        handsActive = false
        handLandmarksRef.current = []
        handGrabbingRef.current = false
        if (handsRef.current) {
          handsRef.current.close().catch(() => {})
          handsRef.current = null
        }
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((t) => t.stop())
          streamRef.current = null
          videoRef.current = null
        }
      }
    } else {
      handLandmarksRef.current = []
      handGrabbingRef.current = false
      if (handsRef.current) {
        handsRef.current.close().catch(() => {})
        handsRef.current = null
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop())
        streamRef.current = null
        videoRef.current = null
      }
    }
  }, [useWebcam])

  useEffect(() => {
    const createPlayer = () => {
      if (ytPlayerRef.current) return
      ytPlayerRef.current = new (window as any).YT.Player('yt-bgm', {
        videoId: 'L4TxN85tw7M',
        playerVars: { autoplay: 1, controls: 0, loop: 1, playlist: 'L4TxN85tw7M' },
        events: {
          onReady: () => { ytReadyRef.current = true; setYtPlaying(true) },
          onStateChange: (e: any) => {
            if (e.data === 1) setYtPlaying(true)
            else if (e.data === 2) setYtPlaying(false)
          },
        },
      })
    }

    if ((window as any).YT?.Player) {
      createPlayer()
      return () => { ytPlayerRef.current?.destroy() }
    }

    const prevCallback = (window as any).onYouTubeIframeAPIReady
    ;(window as any).onYouTubeIframeAPIReady = () => {
      if (prevCallback) prevCallback()
      createPlayer()
    }

    if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
      const tag = document.createElement('script')
      tag.src = 'https://www.youtube.com/iframe_api'
      document.head.appendChild(tag)
    }

    return () => {
      ytPlayerRef.current?.destroy()
    }
  }, [])

  const toggleBgm = () => {
    if (!ytPlayerRef.current || !ytReadyRef.current) return
    if (ytPlaying) {
      ytPlayerRef.current.pauseVideo()
    } else {
      ytPlayerRef.current.playVideo()
    }
  }

  const handleFileUpload = useCallback((file: File) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      setBgImage(img)
      setBgIsWebcam(false)
    }
    img.src = url
  }, [])

  const handleExportConfig = useCallback(() => {
    const json = JSON.stringify(cfg, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `candle-preset-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }, [cfg])

  const handleImportConfig = useCallback((file: File) => {
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const preset: CandleConfig = JSON.parse(reader.result as string)
        setCfg(preset)
      } catch { /* ignore invalid JSON */ }
    }
    reader.readAsText(file)
  }, [])

  return (
    <div ref={containerRef} className="w-full h-full bg-black overflow-hidden relative">
      <div id="yt-bgm" style={{ position: 'absolute', top: 0, left: 0, width: 1, height: 1, opacity: 0, pointerEvents: 'none' }} />
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" style={{ cursor: 'default', touchAction: 'none' }} />

      <div className="absolute top-3 left-3 z-10 flex items-center gap-2">
        <button
          onClick={onBack}
          className="w-8 h-8 flex items-center justify-center rounded-lg bg-black/40 text-text-secondary hover:text-text-primary border border-white/10 transition-colors"
          title="Back to home"
        >
          <ArrowLeft size={14} />
        </button>
        <span className="text-[11px] font-medium text-text-secondary bg-black/40 px-2.5 py-1.5 rounded-lg border border-white/10">
          Candle Light
        </span>
      </div>

      <div className="absolute top-3 right-3 z-10 flex gap-2">
        <label className="w-8 h-8 flex items-center justify-center rounded-lg bg-black/40 text-text-secondary hover:text-text-primary border border-white/10 transition-colors cursor-pointer">
          <Upload size={14} />
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) handleFileUpload(file)
            }}
          />
        </label>
        <button
          onClick={() => setBgIsWebcam((p) => !p)}
          className={`w-8 h-8 flex items-center justify-center rounded-lg border transition-colors ${
            bgIsWebcam
              ? 'bg-accent/20 text-accent border-accent/30'
              : 'bg-black/40 text-text-secondary hover:text-text-primary border-white/10'
          }`}
          title={bgIsWebcam ? 'Switch to image background' : 'Switch to camera background'}
        >
          <Camera size={14} />
        </button>
        <button
          onClick={toggleBgm}
          className={`w-8 h-8 flex items-center justify-center rounded-lg border transition-colors ${
            ytPlaying
              ? 'bg-green-500/20 text-green-400 border-green-500/30'
              : 'bg-black/40 text-text-secondary hover:text-text-primary border-white/10'
          }`}
          title={ytPlaying ? 'Pause music' : 'Play music'}
        >
          {ytPlaying ? <Music size={14} /> : <VolumeX size={14} />}
        </button>
        <button
          onClick={() => setShowPanel((p) => !p)}
          className={`w-8 h-8 flex items-center justify-center rounded-lg border transition-colors ${
            showPanel
              ? 'bg-accent/20 text-accent border-accent/30'
              : 'bg-black/40 text-text-secondary hover:text-text-primary border-white/10'
          }`}
          title="Settings"
        >
          {showPanel ? <X size={14} /> : <Settings size={14} />}
        </button>
      </div>

      {showPanel && (
        <div className="absolute top-14 right-3 left-3 sm:left-auto z-20 sm:w-56 bg-black/80 border border-white/10 rounded-xl p-3 backdrop-blur-xl max-h-[75vh] overflow-y-auto">
          <h3 className="text-[10px] font-semibold text-text-dim uppercase tracking-widest mb-2">Flame</h3>
          <Slider label="Spotlight Radius" value={cfg.spotlightRadius} min={60} max={350} step={1} onChange={(v) => updateCfg('spotlightRadius', v)} unit="px" />
          <Slider label="Flicker Amount" value={cfg.flickerAmplitude} min={0} max={30} step={0.5} onChange={(v) => updateCfg('flickerAmplitude', v)} unit="px" />
          <Slider label="Flicker Speed" value={cfg.flickerSpeed} min={0.005} max={0.12} step={0.005} onChange={(v) => updateCfg('flickerSpeed', v)} />
          <Slider label="Flicker Randomness" value={cfg.flickerRandomness} min={0} max={2} step={0.05} onChange={(v) => updateCfg('flickerRandomness', v)} />

          <h3 className="text-[10px] font-semibold text-text-dim uppercase tracking-widest mt-3 mb-2">Mask</h3>
          <Slider label="Center Brightness" value={cfg.centerBrightness} min={0.02} max={0.4} step={0.01} onChange={(v) => updateCfg('centerBrightness', v)} />
          <Slider label="Edge Softness" value={cfg.edgeSoftness} min={0.3} max={3} step={0.05} onChange={(v) => updateCfg('edgeSoftness', v)} />
          <Slider label="Mask Color Temp" value={cfg.maskColorTemp} min={0} max={1} step={0.05} onChange={(v) => updateCfg('maskColorTemp', v)} />

          <h3 className="text-[10px] font-semibold text-text-dim uppercase tracking-widest mt-3 mb-2">Glow</h3>
          <Slider label="Glow Intensity" value={cfg.glowIntensity} min={0} max={2} step={0.05} onChange={(v) => updateCfg('glowIntensity', v)} />
          <Slider label="Glow Radius" value={cfg.glowRadius} min={0.5} max={4} step={0.1} onChange={(v) => updateCfg('glowRadius', v)} unit="x" />

          <h3 className="text-[10px] font-semibold text-text-dim uppercase tracking-widest mt-3 mb-2">Lighting</h3>
          <Slider label="Warmth" value={cfg.warmth} min={0} max={2} step={0.05} onChange={(v) => updateCfg('warmth', v)} />

          <h3 className="text-[10px] font-semibold text-text-dim uppercase tracking-widest mt-3 mb-2">Candle</h3>
          <Slider label="Scale" value={cfg.candleScale} min={0.3} max={5} step={0.05} onChange={(v) => updateCfg('candleScale', v)} unit="x" />
          <Slider label="Flame X Offset" value={cfg.flameOffsetX} min={-40} max={40} step={1} onChange={(v) => updateCfg('flameOffsetX', v)} unit="px" />
          <Slider label="Flame Y Offset" value={cfg.flameOffsetY} min={-120} max={20} step={1} onChange={(v) => updateCfg('flameOffsetY', v)} unit="px" />

          <h3 className="text-[10px] font-semibold text-text-dim uppercase tracking-widest mt-3 mb-2">Hand Tracking</h3>
          <Slider label="Hand Offset X" value={cfg.handOffsetX} min={-200} max={200} step={4} onChange={(v) => updateCfg('handOffsetX', v)} unit="px" />
          <Slider label="Hand Offset Y" value={cfg.handOffsetY} min={-300} max={100} step={4} onChange={(v) => updateCfg('handOffsetY', v)} unit="px" />

          <button
            onClick={() => setCfg(defaultConfig)}
            className="w-full mt-3 py-1.5 rounded-md text-[10px] font-medium uppercase tracking-wider bg-bg-control text-text-secondary hover:text-text-primary border border-border/50 transition-colors"
          >
            Reset Defaults
          </button>

          <div className="flex gap-2 mt-2">
            <button
              onClick={handleExportConfig}
              className="flex-1 py-1.5 rounded-md text-[10px] font-medium uppercase tracking-wider bg-bg-control text-text-secondary hover:text-text-primary border border-border/50 transition-colors flex items-center justify-center gap-1"
            >
              <Download size={11} />
              Export
            </button>
            <label className="flex-1 py-1.5 rounded-md text-[10px] font-medium uppercase tracking-wider bg-bg-control text-text-secondary hover:text-text-primary border border-border/50 transition-colors flex items-center justify-center gap-1 cursor-pointer">
              <FileInput size={11} />
              Import
              <input
                type="file"
                accept=".json"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) handleImportConfig(file)
                }}
              />
            </label>
          </div>
        </div>
      )}

      <IntroOverlay
        title="Candle Light"
        zh="握紧拳头抓住烛火，移动手部即可拖动烛光位置；张开手心即可放下。烛光会随手而行，照亮黑夜。"
        en="Make a fist to grab the candle, then move your hand to drag the glow. Open your palm to release it. The flame follows where you guide it."
      />
    </div>
  )
}
