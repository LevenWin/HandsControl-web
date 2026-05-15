import type { ChainConfig } from './PullChain'

export interface LightPreset {
  lightOn: boolean
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
  chainConfig: Partial<ChainConfig>
}

export interface AppState {
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
  chainConfig: Partial<ChainConfig>
}
