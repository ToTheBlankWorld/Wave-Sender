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
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useMemo, useRef, useState } from 'react'
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
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const reduceMotion = useReducedMotion()
  const demo = useDemoSignal({
    kind: store.isTransmitting ? 'tone' : 'speech',
    bands: 32,
    playing: !store.isReceiving && !previewPaused && !reduceMotion,
  })
  const bytes = encoder.encode(message).length
  const byteRatio = Math.min(1, bytes / MAX_PAYLOAD_BYTES)
  const deviceOptions = useMemo(() => store.devices.map((device) => ({
    id: device.id,
    label: device.label,
    isDefault: device.isDefault,
  })), [store.devices])
  const receiveActive = mode === 'receive' && store.isReceiving
  const monitorSource = receiveActive ? store.visualSource : demo.visual
  const showWaveform = receiveActive || (mode === 'send' && !previewPaused && !reduceMotion)
  const showSpectrum = showWaveform || (mode === 'receive' && !reduceMotion)

  useEffect(() => () => {
    if (copyTimerRef.current) clearTimeout(copyTimerRef.current)
  }, [])

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
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current)
      copyTimerRef.current = setTimeout(() => setCopied(false), 1600)
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
          {mode === 'send' && (
            <motion.span
              className="tab-pill tab-pill-send"
              layoutId="studio-mode-pill"
              transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 460, damping: 36 }}
            />
          )}
          <span className="switch-label"><Send size={17} /> Send</span>
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
          {mode === 'receive' && (
            <motion.span
              className="tab-pill tab-pill-receive"
              layoutId="studio-mode-pill"
              transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 460, damping: 36 }}
            />
          )}
          <span className="switch-label"><Mic size={17} /> Receive</span>
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
          <AnimatePresence mode="wait">
            {mode === 'send' ? (
              <motion.div
                key="send-panel"
                className="studio-panel-body"
                initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -6 }}
                transition={{ duration: reduceMotion ? 0 : 0.18, ease: [0.22, 1, 0.36, 1] }}
              >
                <div className="control-heading">
                  <span className="control-icon"><Send size={20} /></span>
                  <div>
                    <h2>Compose a message</h2>
                    <p>Short text or a link, encoded into sound.</p>
                  </div>
                </div>

                <div>
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
                    <div className="byte-meter" aria-hidden="true">
                      <span
                        className={bytes > MAX_PAYLOAD_BYTES ? 'over' : byteRatio > 0.85 ? 'near' : ''}
                        style={{ transform: `scaleX(${byteRatio})` }}
                      />
                    </div>
                    <div className="message-meta" id="wave-message-meta">
                      <button type="button" onClick={() => setMessage('Meet me by the north gate.')}>Use sample</button>
                      <span className={bytes > MAX_PAYLOAD_BYTES ? 'over-limit' : ''}>
                        {bytes} / {MAX_PAYLOAD_BYTES} bytes{bytes > MAX_PAYLOAD_BYTES ? ` · Shorten by ${bytes - MAX_PAYLOAD_BYTES}` : ''}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="control-block">
                  <span className="field-label">Protocol</span>
                  <div className="protocol-switch studio-protocol" role="group" aria-label="Transmission protocol">
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
                            layoutId="studio-protocol-pill"
                            transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 460, damping: 36 }}
                          />
                        )}
                        <span className="switch-label">{item === 'audible' ? 'Audible' : 'Ultrasound'}</span>
                      </button>
                    ))}
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
                  className={`button-primary studio-action ${store.isTransmitting ? 'is-transmitting' : ''}`}
                  type="button"
                  disabled={!message.trim() || bytes > MAX_PAYLOAD_BYTES || store.isTransmitting}
                  onClick={transmit}
                >
                  {store.isTransmitting ? <><LoaderCircle className="spin" size={17} /> Transmitting…</> : <><Waves size={17} /> Transmit signal</>}
                </button>
                <p className="control-help">Keep the receiving device nearby and raise the volume gradually.</p>
              </motion.div>
            ) : (
              <motion.div
                key="receive-panel"
                className="studio-panel-body"
                initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -6 }}
                transition={{ duration: reduceMotion ? 0 : 0.18, ease: [0.22, 1, 0.36, 1] }}
              >
                <div className="control-heading">
                  <span className="control-icon control-icon-receive"><Mic size={20} /></span>
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

                <AnimatePresence>
                  {store.lastDecoded && (
                    <motion.div
                      key={store.lastDecoded}
                      className="decoded-result"
                      role="status"
                      aria-live="polite"
                      initial={reduceMotion ? false : { opacity: 0, y: 8, scale: 0.985 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -6 }}
                      transition={{ duration: reduceMotion ? 0 : 0.24, ease: [0.22, 1, 0.36, 1] }}
                    >
                      <div className="decoded-result-top">
                        <span><Check size={15} /> Message decoded</span>
                        <button type="button" onClick={copyDecoded}>{copied ? <Check size={14} /> : <Copy size={14} />} {copied ? 'Copied' : 'Copy'}</button>
                      </div>
                      <p>{store.lastDecoded}</p>
                    </motion.div>
                  )}
                </AnimatePresence>

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

                <Link className="text-link" to="/history">Open received history <ArrowUpRight size={15} /></Link>
              </motion.div>
            )}
          </AnimatePresence>
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
          <div className={`monitor-screen ${receiveActive || store.isTransmitting ? 'is-active' : ''}`}>
            <div className="wave-grid" aria-hidden="true" />
            <WaveBackdrop className={mode === 'receive' ? 'text-accent' : 'text-primary'} />
            {showWaveform && (
              <SmoothWaveform
                aria-label={mode === 'send' ? 'Transmission waveform' : 'Microphone waveform'}
                className={`monitor-waveform ${mode === 'receive' ? 'text-accent' : 'text-primary'}`}
                source={monitorSource}
                mode={store.isTransmitting ? 'scope' : 'wave'}
                sensitivity={1.25}
                lineWidth={2.2}
              />
            )}
            <AnimatePresence>
              {mode === 'receive' && store.lastDecoded && (
                <motion.div
                  key={store.lastDecoded}
                  className="decoded-message"
                  aria-live="polite"
                  initial={reduceMotion ? false : { opacity: 0, y: 10, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -6 }}
                  transition={{ duration: reduceMotion ? 0 : 0.24, ease: [0.22, 1, 0.36, 1] }}
                >
                  <span className="decoded-check"><Check size={15} /></span>
                  <span>{store.lastDecoded}</span>
                </motion.div>
              )}
            </AnimatePresence>
            <div className="monitor-readout">
              <span>{mode === 'send' ? store.settings.protocol : receiveActive ? 'MIC 01' : 'MIC —'}</span>
              <span>{mode === 'send' ? `${bytes} bytes` : receiveActive ? '48 kHz decoder' : store.lastDecoded ? 'Decoded' : 'No capture'}</span>
            </div>
          </div>
          {showSpectrum && (
            <div className="monitor-spectrum">
              <BarVisualizer
                aria-label="Live frequency spectrum"
                className={`${mode === 'receive' ? 'text-accent' : 'text-primary'} h-16 w-full`}
                source={showWaveform ? monitorSource : null}
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
