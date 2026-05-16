import { useState, useCallback } from 'react'
import { Settings, X, ArrowLeft, Lightbulb } from 'lucide-react'
import LightCanvas from './LightCanvas'
import ControlPanel from './ControlPanel'
import HomePage from './HomePage'
import type { LightPreset } from './types'
import type { ChainConfig } from './PullChain'

const defaultChainConfig: Partial<ChainConfig> = {
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
  lineWidthIdle: 3,
  lineWidthGrabbed: 4,
  chainColorHex: '#dcb478',
  chainAlpha: 0.9,
  tipColorHex: '#dcb478',
  tipAlpha: 0.7,
  glowColorHex: '#ffc850',
  glowAlphaIdle: 0.35,
  glowAlphaGrabbed: 0.9,
  chainVisible: true,
}

export default function App() {
  const [isLightOn, setIsLightOn] = useState(true)
  const [nightMode, setNightMode] = useState(true)
  const [intensity, setIntensity] = useState(0.45)
  const [reach, setReach] = useState(2)
  const [colorTemp, setColorTemp] = useState(2810)
  const [ambientLight, setAmbientLight] = useState(0.73)
  const [shadowDeepness, setShadowDeepness] = useState(0.56)
  const [isoNoise, setIsoNoise] = useState(0.17)
  const [nightExposure, setNightExposure] = useState(0.1)
  const [nightBlueShift, setNightBlueShift] = useState(0.84)
  const [bulbX, setBulbX] = useState(79)
  const [bulbY, setBulbY] = useState(-19)
  const [bulbSize, setBulbSize] = useState(1200)
  const [lightSourceX, setLightSourceX] = useState(79)
  const [lightSourceY, setLightSourceY] = useState(39.5)
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null)
  const [useWebcam, setUseWebcam] = useState(true)
  const [showPanel, setShowPanel] = useState(false)
  const [chainConfig, setChainConfig] = useState<Partial<ChainConfig>>(defaultChainConfig)
  const [page, setPage] = useState<'home' | 'app'>('home')

  const updateChainConfig = useCallback((key: keyof ChainConfig, value: number | boolean | string) => {
    setChainConfig((prev) => ({ ...prev, [key]: value }))
  }, [])

  const handleToggleLight = useCallback(() => {
    setIsLightOn((prev) => !prev)
    const el = document.getElementById('sfx-light') as HTMLAudioElement | null
    if (el) {
      el.currentTime = 0
      el.play().catch(() => {})
    }
  }, [])

  const handleUploadBackground = useCallback((file: File) => {
    const url = URL.createObjectURL(file)
    setBackgroundImage((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return url
    })
    setUseWebcam(false)
  }, [])

  const handleToggleWebcam = useCallback(() => {
    setUseWebcam((prev) => !prev)
  }, [])

  const handleExportPreset = useCallback(() => {
    const preset: LightPreset = {
      lightOn: isLightOn,
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
      chainConfig,
    }

    const json = JSON.stringify(preset, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `incandescent-preset-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }, [isLightOn, nightMode, intensity, reach, colorTemp, ambientLight, shadowDeepness, isoNoise, nightExposure, nightBlueShift, bulbX, bulbY, bulbSize, lightSourceX, lightSourceY, chainConfig])

  const handleImportPreset = useCallback((file: File) => {
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const preset: LightPreset = JSON.parse(reader.result as string)
        setIsLightOn(preset.lightOn)
        setNightMode(preset.nightMode)
        setIntensity(preset.intensity)
        setReach(preset.reach)
        setColorTemp(preset.colorTemp)
        setAmbientLight(preset.ambientLight)
        setShadowDeepness(preset.shadowDeepness)
        setIsoNoise(preset.isoNoise)
        setNightExposure(preset.nightExposure)
        setNightBlueShift(preset.nightBlueShift)
        setBulbX(preset.bulbX)
        setBulbY(preset.bulbY)
        setBulbSize(preset.bulbSize)
        setLightSourceX(preset.lightSourceX)
        setLightSourceY(preset.lightSourceY)
        if (preset.chainConfig) {
          setChainConfig(preset.chainConfig)
        }
      } catch {
        // ignore invalid JSON
      }
    }
    reader.readAsText(file)
  }, [])

  return (
    <div className="flex w-full h-full bg-bg-primary">
      <audio id="sfx-light" src="/light.wav" preload="auto" style={{ display: 'none' }} />

      {page === 'home' && (
        <HomePage onEnter={() => setPage('app')} />
      )}

      {page === 'app' && (
        <>
          <div className="flex-1 relative">
            <div className="absolute top-3 left-3 z-[60] flex items-center gap-2">
              <button
                onClick={() => setPage('home')}
                className="w-8 h-8 flex items-center justify-center rounded-lg bg-black/60 text-text-secondary hover:text-text-primary border border-border/30 transition-colors"
                title="Back to home"
              >
                <ArrowLeft size={14} />
              </button>
              <span className="text-[11px] font-medium text-text-secondary bg-black/60 px-2.5 py-1.5 rounded-lg border border-border/30 flex items-center gap-1.5">
                <Lightbulb size={12} className="text-accent" />
                Pull Chain Light
              </span>
            </div>

            <LightCanvas
              backgroundImage={backgroundImage}
              useWebcam={useWebcam}
              isLightOn={isLightOn}
              nightMode={nightMode}
              intensity={intensity}
              reach={reach}
              colorTemp={colorTemp}
              ambientLight={ambientLight}
              shadowDeepness={shadowDeepness}
              isoNoise={isoNoise}
              nightExposure={nightExposure}
              nightBlueShift={nightBlueShift}
              bulbX={bulbX}
              bulbY={bulbY}
              bulbSize={bulbSize}
              lightSourceX={lightSourceX}
              lightSourceY={lightSourceY}
              onPullRelease={handleToggleLight}
              chainConfig={chainConfig}
            />

            <button
              onClick={() => setShowPanel((p) => !p)}
              className="absolute top-3 right-3 z-[60] w-8 h-8 flex items-center justify-center rounded-lg bg-black/60 text-text-secondary hover:text-text-primary border border-border/30 transition-colors"
              title={showPanel ? 'Hide settings' : 'Show settings'}
            >
              {showPanel ? <X size={14} /> : <Settings size={14} />}
            </button>

            <img
              src="/example.gif"
              alt="Demo"
              className="absolute bottom-3 left-3 z-[60] w-36 h-auto rounded-lg shadow-lg border border-white/20 opacity-80 hover:opacity-100 transition-opacity"
            />
          </div>

          {showPanel && (
            <ControlPanel
              isLightOn={isLightOn}
              nightMode={nightMode}
              intensity={intensity}
              reach={reach}
              colorTemp={colorTemp}
              ambientLight={ambientLight}
              shadowDeepness={shadowDeepness}
              isoNoise={isoNoise}
              nightExposure={nightExposure}
              nightBlueShift={nightBlueShift}
              bulbX={bulbX}
              bulbY={bulbY}
              bulbSize={bulbSize}
              lightSourceX={lightSourceX}
              lightSourceY={lightSourceY}
              backgroundImage={backgroundImage}
              useWebcam={useWebcam}
              onToggleLight={handleToggleLight}
              onIntensityChange={setIntensity}
              onReachChange={setReach}
              onColorTempChange={setColorTemp}
              onAmbientLightChange={setAmbientLight}
              onShadowDeepnessChange={setShadowDeepness}
              onIsoNoiseChange={setIsoNoise}
              onNightExposureChange={setNightExposure}
              onNightBlueShiftChange={setNightBlueShift}
              onNightModeToggle={() => setNightMode((p) => !p)}
              onBulbXChange={setBulbX}
              onBulbYChange={setBulbY}
              onBulbSizeChange={setBulbSize}
              onLightSourceXChange={setLightSourceX}
              onLightSourceYChange={setLightSourceY}
              onUploadBackground={handleUploadBackground}
              onToggleWebcam={handleToggleWebcam}
              onExportPreset={handleExportPreset}
              onImportPreset={handleImportPreset}
              chainConfig={chainConfig}
              onChainConfigChange={updateChainConfig}
            />
          )}
        </>
      )}
    </div>
  )
}
