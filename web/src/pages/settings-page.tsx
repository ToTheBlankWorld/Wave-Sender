import { Eye, Mic, Radio, Trash2, Vibrate, Volume2, Waves, X } from 'lucide-react'
import { motion } from 'motion/react'
import { useState, type ReactNode } from 'react'
import {
  AudioDeviceSelect,
  AudioDeviceSelectTrigger,
  AudioDeviceSelectValue,
} from '@/components/ui/audio-device-select'
import { VolumeControl } from '@/components/ui/volume-control'
import { useReducedMotion } from '@/hooks/use-reduced-motion'
import { useWaveStore } from '@/store/wave-store'

function SettingToggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
}) {
  return (
    <button
      className="setting-toggle"
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
    >
      <span />
    </button>
  )
}

function SettingRow({
  icon,
  title,
  description,
  children,
}: {
  icon: ReactNode
  title: string
  description: string
  children: ReactNode
}) {
  return (
    <div className="setting-row">
      <div className="setting-row-icon">{icon}</div>
      <div className="setting-row-copy"><h3>{title}</h3><p>{description}</p></div>
      <div className="setting-row-control">{children}</div>
    </div>
  )
}

export function SettingsPage() {
  const store = useWaveStore()
  const [confirmClear, setConfirmClear] = useState(false)
  const reduceMotion = useReducedMotion()
  const deviceOptions = store.devices.map((device) => ({
    id: device.id,
    label: device.label,
    isDefault: device.isDefault,
  }))

  return (
    <div className="settings-page section-wrap">
      <header className="page-heading">
        <div>
          <p className="section-kicker"><Radio size={16} /> Signal preferences</p>
          <h1>Make the channel yours.</h1>
        </div>
        <p className="settings-saved">Changes save automatically on this device.</p>
      </header>

      <div className="settings-group">
        <h2>Audio</h2>
        <SettingRow icon={<Waves size={19} />} title="Protocol" description="Audible is the most compatible. Ultrasound needs supporting hardware.">
          <div className="protocol-switch settings-protocol" role="group" aria-label="Default protocol">
            {(['audible', 'ultrasound'] as const).map((item) => (
              <button
                key={item}
                type="button"
                aria-pressed={store.settings.protocol === item}
                onClick={() => store.updateSettings({ protocol: item })}
              >
                {store.settings.protocol === item && (
                  <motion.span
                    className="switch-pill"
                    layoutId="settings-protocol-pill"
                    transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 460, damping: 36 }}
                  />
                )}
                <span className="switch-label">{item === 'audible' ? 'Audible' : 'Ultrasound'}</span>
              </button>
            ))}
          </div>
        </SettingRow>
        <SettingRow icon={<Volume2 size={19} />} title="Playback volume" description="Used when a signal is transmitted from this browser.">
          <VolumeControl value={store.settings.volume} onValueChange={(volume) => store.updateSettings({ volume })} curve="perceptual" aria-label="Default playback volume" />
        </SettingRow>
        <SettingRow icon={<Mic size={19} />} title="Microphone" description="Choose an input or use the system default.">
          <label className="sr-only" htmlFor="settings-microphone">Microphone</label>
          <AudioDeviceSelect
            devices={deviceOptions}
            value={store.settings.inputDeviceId}
            onValueChange={(inputDeviceId) => store.updateSettings({ inputDeviceId })}
            allowNone
            noneLabel="System default"
            loading={store.isLoadingDevices}
            permission={store.devicePermission === 'unsupported' ? 'prompt' : store.devicePermission}
            onRequestPermission={() => void store.requestDevicePermission()}
          >
            <AudioDeviceSelectTrigger id="settings-microphone">
              <AudioDeviceSelectValue />
            </AudioDeviceSelectTrigger>
          </AudioDeviceSelect>
        </SettingRow>
      </div>

      <div className="settings-group">
        <h2>Experience</h2>
        <SettingRow icon={<Eye size={19} />} title="Keep screen awake" description="Request a screen wake lock while receiving.">
          <SettingToggle checked={store.settings.keepScreenAwake} onChange={(keepScreenAwake) => store.updateSettings({ keepScreenAwake })} label="Keep screen awake" />
        </SettingRow>
        <SettingRow icon={<Vibrate size={19} />} title="Haptic feedback" description="Vibrate when a message is decoded on supported devices.">
          <SettingToggle checked={store.settings.haptics} onChange={(haptics) => store.updateSettings({ haptics })} label="Haptic feedback" />
        </SettingRow>
      </div>

      <div className="settings-group local-data-group">
        <div>
          <h2>Local data</h2>
          <p>Received messages and preferences never leave this browser.</p>
        </div>
        {confirmClear && store.history.length > 0 ? (
          <div className="confirm-inline" role="group" aria-label="Confirm clearing history">
            <button
              className="button-secondary danger-confirm"
              type="button"
              onClick={() => {
                store.clearHistory()
                setConfirmClear(false)
              }}
            >
              <Trash2 size={15} /> Confirm clear
            </button>
            <button className="icon-button" type="button" aria-label="Cancel clear" onClick={() => setConfirmClear(false)}>
              <X size={16} />
            </button>
          </div>
        ) : (
          <button
            className="button-secondary danger-button"
            type="button"
            disabled={store.history.length === 0}
            onClick={() => setConfirmClear(true)}
          >
            <Trash2 size={16} /> Clear received history
          </button>
        )}
      </div>
    </div>
  )
}
