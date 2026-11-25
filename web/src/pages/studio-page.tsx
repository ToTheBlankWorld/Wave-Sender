import {
  ArrowUpRight,
  Check,
  Copy,
  LoaderCircle,
  Mic,
  Pause,
  Play,
  Radio,
  Send,
  Square,
  Volume2,
  Waves,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  AudioDeviceSelect,
  AudioDeviceSelectTrigger,
  AudioDeviceSelectValue,
} from '@/components/ui/audio-device-select'
import { BarVisualizer } from '@/components/ui/bar-visualizer'
import { SmoothWaveform } from '@/components/ui/smooth-waveform'
import { VolumeControl } from '@/components/ui/volume-control'
import { WaveBackdrop } from '@/components/wave-backdrop'
import { useDemoSignal } from '@/hooks/use-demo-signal'
import { useReducedMotion } from '@/hooks/use-reduced-motion'
import { copyText } from '@/lib/clipboard'
import { useWaveStore } from '@/store/wave-store'

const MAX_PAYLOAD_BYTES = 64
const encoder = new TextEncoder()

export function StudioPage() {
  const store = useWaveStore()
  const [searchParams, setSearchParams] = useSearchParams()
  const mode = searchParams.get('mode') === 'receive' ? 'receive' : 'send'
  const [message, setMessage] = useState('Meet me by the north gate.')
  const [actionError, setActionError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [previewPaused, setPreviewPaused] = useState(false)
  const reduceMotion = useReducedMotion()
  const demo = useDemoSignal({
    kind: store.isTransmitting ? 'tone' : 'speech',
    bands: 32,
    playing: !store.isReceiving && !previewPaused && !reduceMotion,
  })
  const bytes = encoder.encode(message).length
  const deviceOptions = useMemo(() => store.devices.map((device) => ({
    id: device.id,
    label: device.label,
    isDefault: device.isDefault,
  })), [store.devices])
  const receiveActive = mode === 'receive' && store.isReceiving
  const monitorSource = receiveActive ? store.visualSource : demo.visual
  const monitorAnimated = receiveActive || (mode === 'send' && !previewPaused && !reduceMotion)

  const switchMode = (next: 'send' | 'receive') => {
    if (next === 'send') store.stopReceiving()
    setActionError(null)
    setSearchParams(next === 'receive' ? { mode: 'receive' } : {})
  }

  const handleTabKey = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
    event.preventDefault()
    const next = event.key === 'Home'
      ? 'send'
      : event.key === 'End'
        ? 'receive'
        : mode === 'send' ? 'receive' : 'send'
    switchMode(next)
    requestAnimationFrame(() => document.getElementById(`studio-${next}-tab`)?.focus())
  }

  const transmit = async () => {
    setActionError(null)
    try {
      await store.transmit(message)
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'The signal could not be transmitted.')
    }
  }

  const copyDecoded = async () => {
    if (!store.lastDecoded) return
    try {
      await copyText(store.lastDecoded)
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    } catch {
      setActionError('The message could not be copied. Select it and copy it manually.')
    }
  }

  return (
    <div className="studio-page section-wrap">
      <header className="studio-heading">
        <div>
          <p className="section-kicker"><Radio size={16} /> Browser messenger</p>
          <h1>Send a signal.<br />Hear it arrive.</h1>
        </div>
        <div className="studio-heading-note">
          <span className={`studio-status status-${store.status}`}><span className="status-dot" /> {store.status}</span>
          <p>Messages stay on this device. The microphone starts only when you press Start receiving.</p>
        </div>
      </header>

      <div className="studio-tabs" role="tablist" aria-label="Studio mode" onKeyDown={handleTabKey}>
        <button
          id="studio-send-tab"
          type="button"
          role="tab"
          aria-controls="studio-panel"
          aria-selected={mode === 'send'}
          tabIndex={mode === 'send' ? 0 : -1}
          className={mode === 'send' ? 'active' : ''}
          onClick={() => switchMode('send')}
        >
          <Send size={17} /> Send
        </button>
        <button
          id="studio-receive-tab"
          type="button"
          role="tab"
          aria-controls="studio-panel"
          aria-selected={mode === 'receive'}
          tabIndex={mode === 'receive' ? 0 : -1}
          className={mode === 'receive' ? 'active' : ''}
          onClick={() => switchMode('receive')}
        >
          <Mic size={17} /> Receive
        </button>
      </div>

      {(actionError || store.error) && (
        <div className="studio-error" role="alert">
          {actionError ?? store.error}
        </div>
      )}

      <div className="studio-grid">
        <section
          id="studio-panel"
          className="studio-controls"
          role="tabpanel"
          aria-labelledby={`studio-${mode}-tab`}
        >
          {mode === 'send' ? (
            <>
              <div className="control-heading">
                <span className="control-icon"><Send size={20} /></span>
                <div>
                  <h2>Compose a message</h2>
                  <p>Short text or a link, encoded into sound.</p>
                </div>
              </div>

              <label className="field-label" htmlFor="wave-message">Message</label>
              <div className={`message-field ${bytes > MAX_PAYLOAD_BYTES ? 'invalid' : ''}`}>
                <textarea
                  id="wave-message"
                  name="message"
                  autoComplete="off"
                  value={message}
                  maxLength={160}
                  aria-invalid={bytes > MAX_PAYLOAD_BYTES}
                  aria-describedby="wave-message-meta"
                  onChange={(event) => setMessage(event.target.value)}
                  placeholder="Write something worth carrying…"
                />
                <div className="message-meta" id="wave-message-meta">
                  <button type="button" onClick={() => setMessage('Meet me by the north gate.')}>Use sample</button>
                  <span className={bytes > MAX_PAYLOAD_BYTES ? 'over-limit' : ''}>
                    {bytes} / {MAX_PAYLOAD_BYTES} bytes{bytes > MAX_PAYLOAD_BYTES ? ` · Shorten by ${bytes - MAX_PAYLOAD_BYTES}` : ''}
                  </span>
                </div>
              </div>

              <div className="control-block">
                <span className="field-label">Protocol</span>
                <div className="protocol-switch studio-protocol" role="group" aria-label="Transmission protocol">
                  <button type="button" aria-pressed={store.settings.protocol === 'audible'} onClick={() => store.updateSettings({ protocol: 'audible' })}>Audible</button>
                  <button type="button" aria-pressed={store.settings.protocol === 'ultrasound'} onClick={() => store.updateSettings({ protocol: 'ultrasound' })}>Ultrasound</button>
                </div>
              </div>

              <div className="control-block volume-block">
                <span className="field-label"><Volume2 size={15} /> Playback volume</span>
                <VolumeControl
                  value={store.settings.volume}
                  onValueChange={(volume) => store.updateSettings({ volume })}
                  curve="perceptual"
                  aria-label="Playback volume"
                />
              </div>

              <button
                className="button-primary studio-action"
                type="button"
                disabled={!message.trim() || bytes > MAX_PAYLOAD_BYTES || store.isTransmitting}
                onClick={transmit}
              >
                {store.isTransmitting ? <><LoaderCircle className="spin" size={17} /> Transmitting…</> : <><Waves size={17} /> Transmit signal</>}
              </button>
              <p className="control-help">Keep the receiving device nearby and raise the volume gradually.</p>
            </>
          ) : (
            <>
              <div className="control-heading">
                <span className="control-icon"><Mic size={20} /></span>
                <div>
                  <h2>Listen for a signal</h2>
                  <p>Capture starts only after you allow the microphone.</p>
                </div>
              </div>

              <div className="receive-state-card">
                <div className={`receive-orb ${receiveActive ? 'active' : ''}`} aria-hidden="true">
                  <span /><span /><span /><Mic size={24} />
                </div>
                <h3>{store.isStarting ? 'Opening microphone…' : receiveActive ? 'Listening now' : 'Ready to receive'}</h3>
                <p>{receiveActive ? 'Keep this page active while the nearby device transmits.' : 'Press Start receiving, then allow microphone access.'}</p>
                <button
                  className={`button-primary studio-action ${receiveActive ? 'stop-action' : ''}`}
                  type="button"
                  disabled={store.isStarting}
                  onClick={() => receiveActive || store.isStarting ? store.stopReceiving() : store.startReceiving()}
                >
                  {store.isStarting ? <><LoaderCircle className="spin" size={17} /> Starting…</> : receiveActive ? <><Square size={16} /> Stop receiving</> : <><Mic size={17} /> Start receiving</>}
                </button>
              </div>

              <div className="control-block device-block">
                <label className="field-label" htmlFor="wave-microphone">Microphone</label>
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
                  <AudioDeviceSelectTrigger id="wave-microphone">
                    <AudioDeviceSelectValue />
                  </AudioDeviceSelectTrigger>
                </AudioDeviceSelect>
              </div>

              {store.lastDecoded && (
                <div className="decoded-result" role="status" aria-live="polite">
                  <div className="decoded-result-top">
                    <span><Check size={15} /> Message decoded</span>
                    <button type="button" onClick={copyDecoded}>{copied ? <Check size={14} /> : <Copy size={14} />} {copied ? 'Copied' : 'Copy'}</button>
                  </div>
                  <p>{store.lastDecoded}</p>
                </div>
              )}

              <Link className="text-link" to="/history">Open received history <ArrowUpRight size={15} /></Link>
            </>
          )}
        </section>

        <section className="studio-monitor" aria-label="Live signal monitor">
          <div className="monitor-topline">
            <span><Radio size={15} /> {mode === 'send' ? 'Transmission monitor' : 'Microphone monitor'}</span>
            <div className="monitor-topline-actions">
              <span>{receiveActive ? 'Live input' : store.isTransmitting ? 'Signal out' : 'Standby'}</span>
              {mode === 'send' && !reduceMotion && (
                <button
                  className="monitor-pause"
                  type="button"
                  aria-label={previewPaused ? 'Resume signal preview' : 'Pause signal preview'}
                  aria-pressed={previewPaused}
                  onClick={() => setPreviewPaused((paused) => !paused)}
                >
                  {previewPaused ? <Play size={14} /> : <Pause size={14} />}
                </button>
              )}
            </div>
          </div>
          <div className="monitor-screen">
            <div className="wave-grid" aria-hidden="true" />
            <WaveBackdrop className={mode === 'receive' ? 'text-accent' : 'text-primary'} />
            {monitorAnimated && (
              <SmoothWaveform
                aria-label={mode === 'send' ? 'Transmission waveform' : 'Microphone waveform'}
                className={`monitor-waveform ${mode === 'receive' ? 'text-accent' : 'text-primary'}`}
                source={monitorSource}
                mode={store.isTransmitting ? 'scope' : 'wave'}
                sensitivity={1.25}
                lineWidth={2.2}
              />
            )}
            <div className="monitor-readout">
              <span>{mode === 'send' ? store.settings.protocol : receiveActive ? 'MIC 01' : 'MIC —'}</span>
              <span>{mode === 'send' ? `${bytes} bytes` : receiveActive ? 'Native rate' : 'No capture'}</span>
            </div>
          </div>
          {monitorAnimated && (
            <div className="monitor-spectrum">
              <BarVisualizer
                aria-label="Live frequency spectrum"
                className={`${mode === 'receive' ? 'text-accent' : 'text-primary'} h-16 w-full`}
                source={monitorSource}
                barCount={36}
                align="center"
                mirrored
                idle="pulse"
              />
            </div>
          )}
          <div className="monitor-footer">
            <div><span>Payload limit</span><strong>64 bytes</strong></div>
            <div><span>History</span><strong>{store.history.length} saved</strong></div>
            <div><span>Network</span><strong>Not used</strong></div>
          </div>
        </section>
      </div>
    </div>
  )
}
