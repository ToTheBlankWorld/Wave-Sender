export type SignalProtocol = 'audible' | 'ultrasound'

export interface WaveSettings {
  protocol: SignalProtocol
  volume: number
  inputDeviceId: string | null
  keepScreenAwake: boolean
  haptics: boolean
}

const STORAGE_KEY = 'wave-sender.web.settings.v1'

export const defaultSettings: WaveSettings = {
  protocol: 'audible',
  volume: 0.72,
  inputDeviceId: null,
  keepScreenAwake: false,
  haptics: true,
}

const finiteVolume = (value: unknown) =>
  typeof value === 'number' && Number.isFinite(value)
    ? Math.min(1, Math.max(0, value))
    : defaultSettings.volume

export const loadSettings = (): WaveSettings => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaultSettings
    const value = JSON.parse(raw) as Partial<WaveSettings>
    return {
      protocol: value.protocol === 'ultrasound' ? 'ultrasound' : 'audible',
      volume: finiteVolume(value.volume),
      inputDeviceId: typeof value.inputDeviceId === 'string' ? value.inputDeviceId : null,
      keepScreenAwake: value.keepScreenAwake === true,
      haptics: value.haptics !== false,
    }
  } catch {
    return defaultSettings
  }
}

export const saveSettings = (settings: WaveSettings) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  } catch {
    // Storage can be unavailable in private or restricted browser contexts.
  }
}
