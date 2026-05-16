import { useRef, useEffect, useCallback, useState } from 'react'
import { ArrowLeft, Upload, Camera } from 'lucide-react'

const FLAME_OFFSET_X = 0
const FLAME_OFFSET_Y = -18
const SPOTLIGHT_RADIUS = 180
const FLICKER_AMPLITUDE = 14
const FLICKER_SPEED = 0.02
const DARKNESS_ALPHA = 0.95
const VIGNETTE_BLUR = 3

export default function CandleLight({ onBack }: { onBack: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const candleImgRef = useRef<HTMLImageElement | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const mouseRef = useRef({ x: -200, y: -200 })
  const targetRef = useRef({ x: -200, y: -200 })
  const animRef = useRef(0)
  const sizeRef = useRef({ w: 0, h: 0 })
  const flickerPhaseRef = useRef(0)
  const [useWebcam, setUseWebcam] = useState(false)
  const [bgImage, setBgImage] = useState<HTMLImageElement | null>(null)

  const drawCoverBackground = useCallback((ctx: CanvasRenderingContext2D, source: CanvasImageSource, sw: number, sh: number, dw: number, dh: number) => {
    const scale = Math.max(dw / sw, dh / sh)
    const iw = sw * scale
    const ih = sh * scale
    const ox = (dw - iw) / 2
    const oy = (dh - ih) / 2
    ctx.drawImage(source, ox, oy, iw, ih)
  }, [])

  useEffect(() => {
    const img = new Image()
    img.src = '/candle.png'
    img.onload = () => {
      candleImgRef.current = img
    }
  }, [])

  useEffect(() => {
    const container = containerRef.current
    const canvas = canvasRef.current
    if (!container || !canvas) return

    let running = true

    const resize = () => {
      const w = container.clientWidth
      const h = container.clientHeight
      sizeRef.current = { w, h }
      canvas.width = w
      canvas.height = h
    }

    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(container)

    const ease = 0.12

    const render = () => {
      if (!running) return
      const { w, h } = sizeRef.current
      if (w === 0 || h === 0) {
        animRef.current = requestAnimationFrame(render)
        return
      }

      const ctx2 = canvas.getContext('2d')!
      ctx2.clearRect(0, 0, w, h)

      const hasWebcam = useWebcam && videoRef.current && videoRef.current.readyState >= 2
      const bgSource = hasWebcam ? videoRef.current : bgImage

      if (bgSource) {
        const sw = hasWebcam ? (videoRef.current!.videoWidth || w) : (bgImage!.naturalWidth || w)
        const sh = hasWebcam ? (videoRef.current!.videoHeight || h) : (bgImage!.naturalHeight || h)
        drawCoverBackground(ctx2, bgSource, sw, sh, w, h)
      } else {
        ctx2.fillStyle = '#0a0a0a'
        ctx2.fillRect(0, 0, w, h)
      }

      const mx = targetRef.current.x
      const my = targetRef.current.y
      mouseRef.current.x += (mx - mouseRef.current.x) * ease
      mouseRef.current.y += (my - mouseRef.current.y) * ease
      const lx = mouseRef.current.x
      const ly = mouseRef.current.y

      flickerPhaseRef.current += FLICKER_SPEED
      const sinFlicker = Math.sin(flickerPhaseRef.current) * FLICKER_AMPLITUDE
      const noiseFlicker = (Math.random() - 0.5) * FLICKER_AMPLITUDE * 0.6
      const flickerR = SPOTLIGHT_RADIUS + sinFlicker + noiseFlicker
      const innerR = flickerR * 0.15

      ctx2.save()
      ctx2.fillStyle = `rgba(0,0,0,${DARKNESS_ALPHA})`
      ctx2.fillRect(0, 0, w, h)

      ctx2.globalCompositeOperation = 'destination-out'
      const gradient = ctx2.createRadialGradient(lx, ly, innerR, lx, ly, flickerR)
      gradient.addColorStop(0, 'rgba(255,255,255,1)')
      gradient.addColorStop(0.35, 'rgba(255,255,255,0.85)')
      gradient.addColorStop(0.65, 'rgba(255,255,255,0.35)')
      gradient.addColorStop(1, 'rgba(255,255,255,0)')
      ctx2.fillStyle = gradient
      ctx2.beginPath()
      ctx2.arc(lx, ly, flickerR, 0, Math.PI * 2)
      ctx2.fill()
      ctx2.restore()

      if (VIGNETTE_BLUR > 0 && bgSource) {
        ctx2.save()
        ctx2.globalCompositeOperation = 'source-over'
        const vignetteGrad = ctx2.createRadialGradient(lx, ly, flickerR * 0.6, lx, ly, flickerR * 1.8)
        vignetteGrad.addColorStop(0, 'rgba(0,0,0,0)')
        vignetteGrad.addColorStop(1, `rgba(0,0,0,${DARKNESS_ALPHA})`)
        ctx2.fillStyle = vignetteGrad
        ctx2.beginPath()
        ctx2.arc(lx, ly, flickerR * 1.8, 0, Math.PI * 2)
        ctx2.fill()
        ctx2.restore()
      }

      const candle = candleImgRef.current
      if (candle) {
        const cw = 64
        const ch = (candle.naturalHeight / candle.naturalWidth) * cw
        const cx = lx - cw / 2 + FLAME_OFFSET_X
        const cy = ly - ch / 2 + FLAME_OFFSET_Y
        ctx2.drawImage(candle, cx, cy, cw, ch)
      }

      animRef.current = requestAnimationFrame(render)
    }

    animRef.current = requestAnimationFrame(render)

    return () => {
      running = false
      cancelAnimationFrame(animRef.current)
      ro.disconnect()
    }
  }, [useWebcam, bgImage, drawCoverBackground])

  useEffect(() => {
    if (useWebcam) {
      navigator.mediaDevices
        .getUserMedia({ video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' } })
        .then((s) => {
          streamRef.current = s
          if (!videoRef.current) {
            const v = document.createElement('video')
            v.setAttribute('playsinline', '')
            v.muted = true
            v.autoplay = true
            v.srcObject = s
            v.play()
            videoRef.current = v
          } else {
            videoRef.current.srcObject = s
            videoRef.current.play()
          }
        })
        .catch(() => setUseWebcam(false))
      return () => {
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((t) => t.stop())
          streamRef.current = null
          videoRef.current = null
        }
      }
    } else {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop())
        streamRef.current = null
        videoRef.current = null
      }
    }
  }, [useWebcam])

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      targetRef.current.x = e.clientX
      targetRef.current.y = e.clientY
    }
    window.addEventListener('pointermove', onMove)
    return () => window.removeEventListener('pointermove', onMove)
  }, [])

  const handleFileUpload = useCallback((file: File) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      setBgImage(img)
      setUseWebcam(false)
    }
    img.src = url
  }, [])

  return (
    <div ref={containerRef} className="w-full h-full bg-black overflow-hidden relative cursor-none">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

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
          onClick={() => setUseWebcam((p) => !p)}
          className={`w-8 h-8 flex items-center justify-center rounded-lg border transition-colors ${
            useWebcam
              ? 'bg-accent/20 text-accent border-accent/30'
              : 'bg-black/40 text-text-secondary hover:text-text-primary border-white/10'
          }`}
          title="Toggle webcam"
        >
          <Camera size={14} />
        </button>
      </div>
    </div>
  )
}
