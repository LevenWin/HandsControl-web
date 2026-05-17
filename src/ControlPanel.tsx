import { Download, Sun, Moon, Camera, Upload, Crosshair, Lightbulb, Link } from 'lucide-react'
import type { ChainConfig } from './PullChain'

interface SliderProps {
  label: string
  value: number
  min: number
  max: number
  step: number
  onChange: (value: number) => void
  unit?: string
  disabled?: boolean
}

function Slider({ label, value, min, max, step, onChange, unit, disabled }: SliderProps) {
  const percentage = ((value - min) / (max - min)) * 100

  return (
    <div className={`mb-3.5 ${disabled ? 'opacity-40 pointer-events-none' : ''}`}>
      <div className="flex justify-between items-center mb-1">
        <label className="text-[10px] font-medium text-text-secondary uppercase tracking-wider">
          {label}
        </label>
        <span className="text-[10px] font-mono text-text-primary tabular-nums">
          {value.toFixed(step < 1 ? 2 : 0)}{unit || ''}
        </span>
      </div>
      <div className="relative h-5 flex items-center">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="w-full h-1.5 appearance-none rounded-full outline-none cursor-pointer"
          style={{
            background: `linear-gradient(to right, #f59e0b 0%, #f59e0b ${percentage}%, #333 ${percentage}%, #333 100%)`,
          }}
        />
      </div>
    </div>
  )
}

function PositionPair({
  label,
  icon: Icon,
  x,
  y,
  yMin,
  onXChange,
  onYChange,
}: {
  label: string
  icon: React.ComponentType<{ size: number; className?: string }>
  x: number
  y: number
  yMin: number
  onXChange: (v: number) => void
  onYChange: (v: number) => void
}) {
  const yRange = 100 - yMin
  const yPct = ((y - yMin) / yRange) * 100
  const xPct = x

  return (
    <div className="mb-2">
      <div className="flex items-center gap-1.5 mb-1">
        <Icon size={10} className="text-text-dim" />
        <span className="text-[10px] font-medium text-text-secondary uppercase tracking-wider">
          {label}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <div className="flex justify-between items-center mb-0.5">
            <span className="text-[9px] text-text-dim">X</span>
            <span className="text-[9px] font-mono text-text-primary tabular-nums">{x.toFixed(0)}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            step={0.5}
            value={x}
            onChange={(e) => onXChange(parseFloat(e.target.value))}
            className="w-full h-1 appearance-none rounded-full outline-none cursor-pointer"
            style={{
              background: `linear-gradient(to right, #f59e0b 0%, #f59e0b ${xPct}%, #333 ${xPct}%, #333 100%)`,
            }}
          />
        </div>
        <div>
          <div className="flex justify-between items-center mb-0.5">
            <span className="text-[9px] text-text-dim">Y</span>
            <span className="text-[9px] font-mono text-text-primary tabular-nums">{y.toFixed(0)}%</span>
          </div>
          <input
            type="range"
            min={yMin}
            max={100}
            step={0.5}
            value={y}
            onChange={(e) => onYChange(parseFloat(e.target.value))}
            className="w-full h-1 appearance-none rounded-full outline-none cursor-pointer"
            style={{
              background: `linear-gradient(to right, #f59e0b 0%, #f59e0b ${yPct}%, #333 ${yPct}%, #333 100%)`,
            }}
          />
        </div>
      </div>
    </div>
  )
}

function ColorInput({
  label,
  hexKey,
  alphaKey,
  hex,
  alpha,
  onChange,
}: {
  label: string
  hexKey: keyof ChainConfig
  alphaKey: keyof ChainConfig
  hex: string
  alpha: number
  onChange: (key: keyof ChainConfig, value: number | string) => void
}) {
  return (
    <div className="mb-2">
      <span className="text-[10px] font-medium text-text-secondary uppercase tracking-wider">
        {label}
      </span>
      <div className="flex items-center gap-2 mt-1">
        <input
          type="color"
          value={hex}
          onChange={(e) => onChange(hexKey, e.target.value)}
          className="w-7 h-7 rounded border border-border cursor-pointer p-0 bg-transparent"
        />
        <div className="flex-1 flex items-center gap-1.5">
          <span className="text-[9px] text-text-dim">α</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={alpha}
            onChange={(e) => onChange(alphaKey, parseFloat(e.target.value))}
            className="flex-1 h-1 appearance-none rounded-full outline-none cursor-pointer"
            style={{
              background: `linear-gradient(to right, ${hex}00 0%, ${hex} ${alpha * 100}%)`,
            }}
          />
          <span className="text-[9px] font-mono text-text-primary tabular-nums w-7 text-right">
            {alpha.toFixed(2)}
          </span>
        </div>
      </div>
    </div>
  )
}

interface ControlPanelProps {
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
  backgroundImage: string | null
  useWebcam: boolean
  onToggleLight: () => void
  onIntensityChange: (v: number) => void
  onReachChange: (v: number) => void
  onColorTempChange: (v: number) => void
  onAmbientLightChange: (v: number) => void
  onShadowDeepnessChange: (v: number) => void
  onIsoNoiseChange: (v: number) => void
  onNightExposureChange: (v: number) => void
  onNightBlueShiftChange: (v: number) => void
  onNightModeToggle: () => void
  onBulbXChange: (v: number) => void
  onBulbYChange: (v: number) => void
  onBulbSizeChange: (v: number) => void
  onLightSourceXChange: (v: number) => void
  onLightSourceYChange: (v: number) => void
  chainConfig: Partial<ChainConfig>
  onChainConfigChange: (key: keyof ChainConfig, value: number | boolean | string) => void
  onUploadBackground: (file: File) => void
  onToggleWebcam: () => void
  onExportPreset: () => void
  onImportPreset: (file: File) => void
}

export default function ControlPanel({
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
  backgroundImage,
  useWebcam,
  onToggleLight,
  onIntensityChange,
  onReachChange,
  onColorTempChange,
  onAmbientLightChange,
  onShadowDeepnessChange,
  onIsoNoiseChange,
  onNightExposureChange,
  onNightBlueShiftChange,
  onNightModeToggle,
  onBulbXChange,
  onBulbYChange,
  onBulbSizeChange,
  onLightSourceXChange,
  onLightSourceYChange,
  chainConfig,
  onChainConfigChange,
  onUploadBackground,
  onToggleWebcam,
  onExportPreset,
  onImportPreset,
}: ControlPanelProps) {
  return (
    <div className="w-72 h-full bg-bg-panel border-l border-border flex flex-col select-none overflow-y-auto">
      <div className="p-4 border-b border-border">
        <h1 className="text-sm font-bold text-text-primary tracking-wider uppercase mb-1">
          Incandescent Vision Lab
        </h1>
        <p className="text-[10px] text-text-dim uppercase tracking-widest">
          Point Light Simulator
        </p>
      </div>

      <div className="p-4 border-b border-border space-y-3">
        <button
          onClick={onToggleLight}
          className={`w-full py-2.5 rounded-lg text-xs font-semibold uppercase tracking-wider flex items-center justify-center gap-2 transition-all duration-500 ${
            isLightOn
              ? 'bg-accent text-black shadow-lg shadow-accent/30'
              : 'bg-bg-control text-text-secondary hover:text-text-primary'
          }`}
        >
          {isLightOn ? <Sun size={14} /> : <Moon size={14} />}
          {isLightOn ? 'Turn Off' : 'Turn On'}
        </button>

        <div className="flex gap-2">
          <label
            className={`flex-1 py-1.5 rounded-md text-[10px] font-medium uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
              backgroundImage
                ? 'bg-accent/20 text-accent border border-accent/30'
                : 'bg-bg-control text-text-secondary hover:text-text-primary border border-border'
            }`}
          >
            <Upload size={12} />
            Image
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) onUploadBackground(file)
              }}
            />
          </label>

          <button
            onClick={onToggleWebcam}
            className={`flex-1 py-1.5 rounded-md text-[10px] font-medium uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors ${
              useWebcam
                ? 'bg-accent/20 text-accent border border-accent/30'
                : 'bg-bg-control text-text-secondary hover:text-text-primary border border-border'
            }`}
          >
            <Camera size={12} />
            Webcam
          </button>
        </div>
      </div>

      <div className="p-4 border-b border-border">
        <h2 className="text-[10px] font-semibold text-text-dim uppercase tracking-widest mb-3">
          Light Source
        </h2>
        <Slider
          label="Bulb Intensity"
          value={intensity}
          min={0}
          max={3}
          step={0.01}
          onChange={onIntensityChange}
        />
        <Slider
          label="Light Reach"
          value={reach}
          min={0.1}
          max={2}
          step={0.01}
          onChange={onReachChange}
          unit="x"
        />
        <Slider
          label="Color Temp"
          value={colorTemp}
          min={2700}
          max={3000}
          step={10}
          onChange={onColorTempChange}
          unit="K"
        />
      </div>

      <div className="p-4 border-b border-border">
        <h2 className="text-[10px] font-semibold text-text-dim uppercase tracking-widest mb-3">
          Position
        </h2>
        <Slider
          label="Bulb Size"
          value={bulbSize}
          min={16}
          max={1200}
          step={2}
          onChange={onBulbSizeChange}
          unit="px"
        />
        <PositionPair
          label="Bulb Image"
          icon={Lightbulb}
          x={bulbX}
          y={bulbY}
          yMin={-50}
          onXChange={onBulbXChange}
          onYChange={onBulbYChange}
        />
        <PositionPair
          label="Light Center"
          icon={Crosshair}
          x={lightSourceX}
          y={lightSourceY}
          yMin={-50}
          onXChange={onLightSourceXChange}
          onYChange={onLightSourceYChange}
        />
      </div>

      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Link size={10} className="text-text-dim" />
            <h2 className="text-[10px] font-semibold text-text-dim uppercase tracking-widest">
              Pull Chain
            </h2>
          </div>
          <button
            onClick={() => onChainConfigChange('chainVisible', !(chainConfig.chainVisible ?? true))}
            className={`px-2 py-0.5 rounded text-[9px] font-medium uppercase tracking-wider transition-all duration-300 ${
              (chainConfig.chainVisible ?? true)
                ? 'bg-accent/20 text-accent border border-accent/30'
                : 'bg-bg-control text-text-dim border border-border'
            }`}
          >
            {(chainConfig.chainVisible ?? true) ? 'ON' : 'OFF'}
          </button>
        </div>

        <div className="mb-3 pb-3 border-b border-border/50">
          <span className="text-[9px] font-semibold text-text-dim uppercase tracking-widest">Structure</span>
          <div className="mt-1.5">
            <Slider label="Chain Length" value={chainConfig.segmentCount ?? 19} min={5} max={40} step={1} onChange={(v) => onChainConfigChange('segmentCount', v)} unit=" seg" />
            <Slider label="Segment Spacing" value={chainConfig.segmentSpacing ?? 16} min={6} max={40} step={1} onChange={(v) => onChainConfigChange('segmentSpacing', v)} unit="px" />
            <Slider label="Segment Radius" value={chainConfig.segmentRadius ?? 5} min={2} max={15} step={0.5} onChange={(v) => onChainConfigChange('segmentRadius', v)} unit="px" />
          </div>
        </div>

        <div className="mb-3 pb-3 border-b border-border/50">
          <span className="text-[9px] font-semibold text-text-dim uppercase tracking-widest">Elasticity</span>
          <div className="mt-1.5">
            <Slider label="Stiffness" value={chainConfig.constraintStiffness ?? 0.45} min={0.05} max={1} step={0.01} onChange={(v) => onChainConfigChange('constraintStiffness', v)} />
            <Slider label="Damping" value={chainConfig.constraintDamping ?? 0.22} min={0} max={0.5} step={0.01} onChange={(v) => onChainConfigChange('constraintDamping', v)} />
            <Slider label="Friction" value={chainConfig.bodyFrictionAir ?? 0.08} min={0} max={0.1} step={0.001} onChange={(v) => onChainConfigChange('bodyFrictionAir', v)} />
            <Slider label="Bounce" value={chainConfig.bodyRestitution ?? 0.15} min={0} max={0.5} step={0.01} onChange={(v) => onChainConfigChange('bodyRestitution', v)} />
            <Slider label="Tip Weight" value={chainConfig.tipMass ?? 2.5} min={0.2} max={4} step={0.1} onChange={(v) => onChainConfigChange('tipMass', v)} unit="x" />
            <Slider label="Gravity" value={chainConfig.gravityY ?? 1.61} min={0.1} max={2} step={0.01} onChange={(v) => onChainConfigChange('gravityY', v)} />
          </div>
        </div>

        <div className="mb-3 pb-3 border-b border-border/50">
          <span className="text-[9px] font-semibold text-text-dim uppercase tracking-widest">Colors</span>
          <div className="mt-1.5">
            <ColorInput label="Chain Line" hexKey="chainColorHex" alphaKey="chainAlpha" hex={chainConfig.chainColorHex ?? '#dcb478'} alpha={chainConfig.chainAlpha ?? 0.9} onChange={onChainConfigChange} />
            <ColorInput label="Tip Fill" hexKey="tipColorHex" alphaKey="tipAlpha" hex={chainConfig.tipColorHex ?? '#dcb478'} alpha={chainConfig.tipAlpha ?? 0.7} onChange={onChainConfigChange} />
            <ColorInput label="Glow" hexKey="glowColorHex" alphaKey="glowAlphaIdle" hex={chainConfig.glowColorHex ?? '#ffc850'} alpha={chainConfig.glowAlphaIdle ?? 0.35} onChange={onChainConfigChange} />
          </div>
        </div>

        <div className="mb-3">
          <span className="text-[9px] font-semibold text-text-dim uppercase tracking-widest">Appearance</span>
          <div className="mt-1.5">
            <Slider label="Line Width" value={chainConfig.lineWidthIdle ?? 3} min={1} max={10} step={0.5} onChange={(v) => onChainConfigChange('lineWidthIdle', v)} unit="px" />
            <Slider label="Grab Width" value={chainConfig.lineWidthGrabbed ?? 4} min={1} max={12} step={0.5} onChange={(v) => onChainConfigChange('lineWidthGrabbed', v)} unit="px" />
            <Slider label="Glow Blur" value={chainConfig.glowBlurIdle ?? 8} min={0} max={30} step={1} onChange={(v) => onChainConfigChange('glowBlurIdle', v)} unit="px" />
            <Slider label="Glow Blur Grab" value={chainConfig.glowBlurGrabbed ?? 16} min={0} max={40} step={1} onChange={(v) => onChainConfigChange('glowBlurGrabbed', v)} unit="px" />
          </div>
        </div>

        <div className="mb-3 pb-3 border-b border-border/50">
          <span className="text-[9px] font-semibold text-text-dim uppercase tracking-widest">Interaction</span>
          <div className="mt-1.5">
            <Slider label="Grab Radius" value={chainConfig.grabRadius ?? 90} min={30} max={200} step={1} onChange={(v) => onChainConfigChange('grabRadius', v)} unit="px" />
            <Slider label="Stretch Trigger" value={chainConfig.pullTriggerDelta ?? 20} min={3} max={50} step={1} onChange={(v) => onChainConfigChange('pullTriggerDelta', v)} unit="%" />
            <Slider label="Pinch Threshold" value={chainConfig.pinchThreshold ?? 35} min={15} max={100} step={1} onChange={(v) => onChainConfigChange('pinchThreshold', v)} unit="px" />
          </div>
        </div>
      </div>

      <div className="p-4 border-b border-border">
        <h2 className="text-[10px] font-semibold text-text-dim uppercase tracking-widest mb-3">
          Environment
        </h2>
        <Slider
          label="Ambient Light"
          value={ambientLight}
          min={0}
          max={1}
          step={0.01}
          onChange={onAmbientLightChange}
        />
        <Slider
          label="Shadow Depth"
          value={shadowDeepness}
          min={0}
          max={1}
          step={0.01}
          onChange={onShadowDeepnessChange}
        />
        <Slider
          label="ISO Noise"
          value={isoNoise}
          min={0}
          max={1}
          step={0.01}
          onChange={onIsoNoiseChange}
        />
      </div>

      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Moon size={10} className="text-text-dim" />
            <h2 className="text-[10px] font-semibold text-text-dim uppercase tracking-widest">
              Night Effect
            </h2>
          </div>
          <button
            onClick={onNightModeToggle}
            className={`px-2 py-0.5 rounded text-[9px] font-medium uppercase tracking-wider transition-all duration-300 ${
              nightMode
                ? 'bg-blue-900/40 text-blue-300 border border-blue-700/50'
                : 'bg-bg-control text-text-dim border border-border'
            }`}
          >
            {nightMode ? 'ON' : 'OFF'}
          </button>
        </div>
        <Slider
          label="Night Exposure"
          value={nightExposure}
          min={0.05}
          max={1}
          step={0.01}
          onChange={onNightExposureChange}
          disabled={!nightMode}
        />
        <Slider
          label="Blue Shift"
          value={nightBlueShift}
          min={0}
          max={1}
          step={0.01}
          onChange={onNightBlueShiftChange}
          disabled={!nightMode}
        />
      </div>

      <div className="p-4 mt-auto border-t border-border">
        <div className="flex gap-2">
          <button
            onClick={onExportPreset}
            className="flex-1 py-2 rounded-md text-[10px] font-medium uppercase tracking-wider flex items-center justify-center gap-1.5 bg-bg-control text-text-secondary hover:text-text-primary border border-border transition-colors"
          >
            <Download size={12} />
            Export
          </button>
          <label
            className="flex-1 py-2 rounded-md text-[10px] font-medium uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer bg-bg-control text-text-secondary hover:text-text-primary border border-border transition-colors"
          >
            <Upload size={12} />
            Import
            <input
              type="file"
              accept=".json"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) onImportPreset(file)
              }}
            />
          </label>
        </div>
      </div>
    </div>
  )
}
