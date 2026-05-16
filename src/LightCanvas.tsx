import { useRef, useEffect, useState } from 'react'
import PullChain, { type ChainConfig } from './PullChain'

interface LightCanvasProps {
  backgroundImage: string | null
  useWebcam: boolean
  isLightOn: boolean
  nightMode: boolean
  intensity: number
  reach: number
  colorTemp: number
  ambientLight: number
  shadowDeepness: number
  isoNoise: number
  nightExposure: number
  nightBlueShift: number
  bulbX: number
  bulbY: number
  bulbSize: number
  lightSourceX: number
  lightSourceY: number
  onPullRelease: () => void
  chainConfig: Partial<ChainConfig>
}

function colorTempToRGB(kelvin: number): [number, number, number] {
  const temp = kelvin / 100
  let r: number, g: number, b: number
  if (temp <= 66) {
    r = 255
    g = 99.4708025861 * Math.log(temp) - 161.1195681661
    b = temp <= 19 ? 0 : 138.5177312231 * Math.log(temp - 10) - 305.0447927307
  } else {
    r = 329.698727446 * Math.pow(temp - 60, -0.1332047592)
    g = 288.1221695283 * Math.pow(temp - 60, -0.0755148492)
    b = 255
  }
  return [
    Math.min(255, Math.max(0, r)),
    Math.min(255, Math.max(0, g)),
    Math.min(255, Math.max(0, b)),
  ]
}

export default function LightCanvas({
  backgroundImage,
  useWebcam,
  isLightOn,
  nightMode,
  intensity,
  reach,
  colorTemp,
  ambientLight,
  shadowDeepness,
  isoNoise,
  nightExposure,
  nightBlueShift,
  bulbX,
  bulbY,
  bulbSize,
  lightSourceX,
  lightSourceY,
  onPullRelease,
  chainConfig,
}: LightCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)

  useEffect(() => {
    if (useWebcam) {
      navigator.mediaDevices
        .getUserMedia({ video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' } })
        .then((s) => {
          setStream(s)
          if (videoRef.current) {
            videoRef.current.srcObject = s
          }
        })
        .catch(() => {})
      return () => {
        if (stream) {
          stream.getTracks().forEach((t) => t.stop())
        }
      }
    } else {
      if (stream) {
        stream.getTracks().forEach((t) => t.stop())
        setStream(null)
      }
    }
  }, [useWebcam])

  const [r, g, b] = colorTempToRGB(colorTemp)

  const bgFilter: React.CSSProperties = (() => {
    if (!nightMode) {
      return { filter: 'none', transition: 'filter 0.5s ease-in-out' }
    }
    if (isLightOn) {
      return {
        filter: `brightness(${0.4 + nightExposure * 0.6}) saturate(0.8)`,
        transition: 'filter 0.5s ease-in-out',
      }
    }
    return {
      filter: `brightness(${nightExposure}) saturate(${0.3 + nightBlueShift * 0.4})`,
      transition: 'filter 0.5s ease-in-out',
    }
  })()

  const glowColor = `rgba(${r},${g},${b},${isLightOn ? intensity : intensity * 0.15})`

  const lightIntensity = isLightOn ? intensity : 0
  const darkEdgeStrength = nightMode ? 0.88 + shadowDeepness * 0.12 : 0.55 + shadowDeepness * 0.35

  const lightStops = isLightOn
    ? [
        `rgba(${r},${g},${b},${lightIntensity * 0.85}) 0%`,
        `rgba(${r},${g},${b},${lightIntensity * 0.55}) ${reach * 3}%`,
        `rgba(${r},${g},${b},${lightIntensity * 0.2}) ${reach * 8}%`,
        `rgba(${r},${g},${b},0) ${reach * 18}%`,
      ]
    : [
        `rgba(${r},${g},${b},${0.03 * ambientLight}) 0%`,
        `rgba(${r},${g},${b},0) ${reach * 5}%`,
      ]

  const vignetteStops = [
    `rgba(0,0,0,0) ${reach * 15}%`,
    `rgba(0,0,0,${darkEdgeStrength * 0.5}) ${reach * 35}%`,
    `rgba(0,0,0,${darkEdgeStrength}) ${reach * 60}%`,
    `rgba(0,0,0,${Math.min(1, darkEdgeStrength + 0.1)}) 100%`,
  ]

  const blueOverlayOpacity = !isLightOn && nightMode ? 0.15 + nightBlueShift * 0.45 : 0
  const blueOverlayStyle: React.CSSProperties = {
    background: `linear-gradient(to bottom, rgba(10,20,50,${blueOverlayOpacity}), rgba(5,10,40,${blueOverlayOpacity + 0.1}))`,
    mixBlendMode: 'multiply' as const,
    transition: 'opacity 0.5s ease-in-out',
  }

  const bloomScale = isLightOn ? 3.5 + intensity * 1.5 : 1.5
  const bloomOpacity = isLightOn ? intensity * 0.7 : intensity * 0.1 * ambientLight

  const sourceMarkerSize = 20

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden bg-black"
    >
      {backgroundImage && !useWebcam && (
        <div className="absolute inset-0 w-full h-full" style={bgFilter}>
          <img
            src={backgroundImage}
            alt="background"
            className="absolute inset-0 w-full h-full object-cover"
            draggable={false}
          />
        </div>
      )}

      {useWebcam && (
        <div className="absolute inset-0 w-full h-full" style={bgFilter}>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="absolute inset-0 w-full h-full object-cover"
            style={{ transform: 'scaleX(-1)' }}
          />
        </div>
      )}

      {!backgroundImage && !useWebcam && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-text-dim text-sm">
            Click to place a light bulb, or upload a background image
          </div>
        </div>
      )}

      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(circle at ${lightSourceX}% ${lightSourceY}%, ${lightStops.join(', ')})`,
          mixBlendMode: 'screen' as const,
          transition: 'opacity 0.5s ease-in-out',
        }}
      />

      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(circle at ${lightSourceX}% ${lightSourceY}%, ${vignetteStops.join(', ')})`,
          mixBlendMode: 'multiply' as const,
          transition: 'opacity 0.5s ease-in-out',
        }}
      />

      <div
        className="absolute inset-0 pointer-events-none"
        style={blueOverlayStyle}
      />

      {isoNoise > 0 && (
        <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ opacity: isoNoise }}>
          <filter id="noise-filter">
            <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" />
            <feColorMatrix type="saturate" values="0" />
          </filter>
          <rect width="100%" height="100%" filter="url(#noise-filter)" />
        </svg>
      )}

      <PullChain
        videoRef={videoRef}
        containerRef={containerRef}
        isLightOn={isLightOn}
        onPullRelease={onPullRelease}
        config={chainConfig}
      />

      <div
        className="absolute z-20 pointer-events-none"
        style={{
          left: `${lightSourceX}%`,
          top: `${lightSourceY}%`,
          transform: 'translate(-50%, -50%)',
          transition: 'left 0.5s ease-in-out, top 0.5s ease-in-out',
          width: sourceMarkerSize,
          height: sourceMarkerSize,
        }}
      >
        <div
          className="w-full h-full rounded-full border-2"
          style={{
            borderColor: isLightOn ? `rgba(${r},${g},${b},0.9)` : 'rgba(255,255,255,0.35)',
            background: isLightOn
              ? `rgba(${r},${g},${b},0.25)`
              : 'rgba(255,255,255,0.08)',
            boxShadow: isLightOn
              ? `0 0 8px rgba(${r},${g},${b},0.5)`
              : '0 0 4px rgba(255,255,255,0.15)',
            transition: 'border-color 0.5s ease-in-out, background 0.5s ease-in-out, box-shadow 0.5s ease-in-out',
          }}
        />
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-px rotate-45 pointer-events-none"
          style={{ background: isLightOn ? `rgba(${r},${g},${b},0.7)` : 'rgba(255,255,255,0.25)' }}
        />
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-px -rotate-45 pointer-events-none"
          style={{ background: isLightOn ? `rgba(${r},${g},${b},0.7)` : 'rgba(255,255,255,0.25)' }}
        />
      </div>

      <div
        className="absolute z-30 pointer-events-none"
        style={{
          left: `${bulbX}%`,
          top: `${bulbY}%`,
          transform: 'translate(-50%, -50%)',
          transition: 'left 0.5s ease-in-out, top 0.5s ease-in-out',
          width: bulbSize,
          height: bulbSize,
        }}
      >
        <img
          src={isLightOn ? '/light_on.png' : '/light_off.png'}
          alt="light bulb"
          className="w-full h-full object-contain select-none pointer-events-none"
          style={{
            filter: isLightOn ? 'brightness(1)' : `brightness(${0.2 + ambientLight * 0.3})`,
            transition: 'filter 0.5s ease-in-out',
          }}
          draggable={false}
        />
        <div
          className="absolute inset-0 rounded-full pointer-events-none"
          style={{
            background: `radial-gradient(circle, ${glowColor} 0%, rgba(0,0,0,0) 70%)`,
            filter: 'blur(12px)',
            transform: `scale(${bloomScale})`,
            opacity: bloomOpacity,
            transition: 'opacity 0.5s ease-in-out, transform 0.5s ease-in-out',
          }}
        />
      </div>
    </div>
  )
}
