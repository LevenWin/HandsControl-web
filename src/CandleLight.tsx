import { useRef, useEffect, useCallback, useState } from 'react'
import { ArrowLeft, Upload, Camera, Settings, X } from 'lucide-react'

interface CandleConfig {
  candleX: number
  candleY: number
  flameOffsetX: number
  flameOffsetY: number
  candleScale: number
  spotlightRadius: number
  flickerAmplitude: number
  flickerSpeed: number
  warmth: number
}

const defaultConfig: CandleConfig = {
  candleX: 0.5,
  candleY: 0.35,
  flameOffsetX: 0,
  flameOffsetY: -18,
  candleScale: 1.0,
  spotlightRadius: 160,
  flickerAmplitude: 8,
  flickerSpeed: 0.03,
  warmth: 0.85,
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
  const [useWebcam, setUseWebcam] = useState(false)
  const [bgImage, setBgImage] = useState<HTMLImageElement | null>(null)
  const [showPanel, setShowPanel] = useState(false)
  const [cfg, setCfg] = useState<CandleConfig>(defaultConfig)
  const cfgRef = useRef(defaultConfig)
  cfgRef.current = cfg

  const draggingRef = useRef(false)
  const dragOffsetRef = useRef({ x: 0, y: 0 })
  const candleScreenRef = useRef({ x: 0, y: 0, w: 0, h: 0 })

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
      const hasWebcam = useWebcam && videoRef.current && videoRef.current.readyState >= 2
      const bgSource = hasWebcam ? videoRef.current : bgImage

      const flameScreenX = c.candleX * w + c.flameOffsetX
      const flameScreenY = c.candleY * h + c.flameOffsetY
      const candleImg = candleImgRef.current

      flickerPhaseRef.current += c.flickerSpeed
      const sinFlicker = Math.sin(flickerPhaseRef.current) * c.flickerAmplitude
      const noiseFlicker = (Math.random() - 0.5) * c.flickerAmplitude * 0.5
      const flickerR = c.spotlightRadius + sinFlicker + noiseFlicker
      const innerR = flickerR * 0.15

      ctx.clearRect(0, 0, w, h)

      if (bgSource) {
        const sw = hasWebcam ? (videoRef.current!.videoWidth || w) : (bgImage!.naturalWidth || w)
        const sh = hasWebcam ? (videoRef.current!.videoHeight || h) : (bgImage!.naturalHeight || h)
        drawCoverBackground(ctx, bgSource, sw, sh, w, h)
      } else {
        ctx.fillStyle = '#000'
        ctx.fillRect(0, 0, w, h)
      }

      ctx.save()
      ctx.fillStyle = 'rgba(0,0,0,1)'
      ctx.fillRect(0, 0, w, h)

      ctx.globalCompositeOperation = 'destination-out'
      const revealGrad = ctx.createRadialGradient(flameScreenX, flameScreenY, innerR, flameScreenX, flameScreenY, flickerR)
      revealGrad.addColorStop(0, 'rgba(255,255,255,1)')
      revealGrad.addColorStop(0.1, 'rgba(255,255,255,1)')
      revealGrad.addColorStop(0.3, 'rgba(255,255,255,0.88)')
      revealGrad.addColorStop(0.55, 'rgba(255,255,255,0.45)')
      revealGrad.addColorStop(0.8, 'rgba(255,255,255,0.08)')
      revealGrad.addColorStop(1, 'rgba(255,255,255,0)')
      ctx.fillStyle = revealGrad
      ctx.beginPath()
      ctx.arc(flameScreenX, flameScreenY, flickerR, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()

      ctx.save()
      const glowR = flickerR * 1.6
      const glowGrad = ctx.createRadialGradient(flameScreenX, flameScreenY, flickerR * 0.25, flameScreenX, flameScreenY, glowR)
      glowGrad.addColorStop(0, `rgba(255,180,50,${c.warmth * 0.3})`)
      glowGrad.addColorStop(0.3, `rgba(255,140,20,${c.warmth * 0.12})`)
      glowGrad.addColorStop(0.7, 'rgba(200,80,10,0.01)')
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
    <div ref={containerRef} className="w-full h-full bg-black overflow-hidden relative">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" style={{ cursor: 'default' }} />

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
        <div className="absolute top-14 right-3 z-20 w-52 bg-black/80 border border-white/10 rounded-xl p-3 backdrop-blur-xl max-h-[80vh] overflow-y-auto">
          <h3 className="text-[10px] font-semibold text-text-dim uppercase tracking-widest mb-2">Flame</h3>
          <Slider label="Spotlight Radius" value={cfg.spotlightRadius} min={60} max={350} step={1} onChange={(v) => updateCfg('spotlightRadius', v)} unit="px" />
          <Slider label="Flicker Amount" value={cfg.flickerAmplitude} min={0} max={30} step={0.5} onChange={(v) => updateCfg('flickerAmplitude', v)} unit="px" />
          <Slider label="Flicker Speed" value={cfg.flickerSpeed} min={0.005} max={0.12} step={0.005} onChange={(v) => updateCfg('flickerSpeed', v)} />

          <h3 className="text-[10px] font-semibold text-text-dim uppercase tracking-widest mt-3 mb-2">Lighting</h3>
          <Slider label="Warmth" value={cfg.warmth} min={0} max={1.5} step={0.05} onChange={(v) => updateCfg('warmth', v)} />

          <h3 className="text-[10px] font-semibold text-text-dim uppercase tracking-widest mt-3 mb-2">Candle</h3>
          <Slider label="Scale" value={cfg.candleScale} min={0.3} max={2.5} step={0.05} onChange={(v) => updateCfg('candleScale', v)} unit="x" />
          <Slider label="Flame X Offset" value={cfg.flameOffsetX} min={-40} max={40} step={1} onChange={(v) => updateCfg('flameOffsetX', v)} unit="px" />
          <Slider label="Flame Y Offset" value={cfg.flameOffsetY} min={-80} max={20} step={1} onChange={(v) => updateCfg('flameOffsetY', v)} unit="px" />

          <button
            onClick={() => setCfg(defaultConfig)}
            className="w-full mt-3 py-1.5 rounded-md text-[10px] font-medium uppercase tracking-wider bg-bg-control text-text-secondary hover:text-text-primary border border-border/50 transition-colors"
          >
            Reset Defaults
          </button>
        </div>
      )}
    </div>
  )
}
