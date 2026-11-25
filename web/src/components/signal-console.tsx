import { AnimatePresence, motion } from 'motion/react'
import { Check, LoaderCircle, Pause, Play, Radio, RotateCcw, Waves } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useReducedMotion } from '@/hooks/use-reduced-motion'
import { BarVisualizer } from '@/components/ui/bar-visualizer'
import { SmoothWaveform } from '@/components/ui/smooth-waveform'
import { VolumeControl } from '@/components/ui/volume-control'
import { useDemoSignal } from '@/hooks/use-demo-signal'
import { WaveBackdrop } from '@/components/wave-backdrop'

type Protocol = 'audible' | 'ultrasound'
type Phase = 'idle' | 'encoding' | 'transmitting' | 'received'

const demoMessage = 'Meet me by the north gate.'

export function SignalConsole() {
  const [protocol, setProtocol] = useState<Protocol>('audible')
  const [phase, setPhase] = useState<Phase>('idle')
  const [volume, setVolume] = useState(0.72)
  const [muted, setMuted] = useState(false)
  const [previewPaused, setPreviewPaused] = useState(false)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])
  const reduceMotion = useReducedMotion()
  const signal = useDemoSignal({
    kind: phase === 'transmitting' ? 'tone' : 'speech',
    bands: 32,
    gainDb: muted ? Number.NEGATIVE_INFINITY : -8 + volume * 8,
    playing: !previewPaused && !reduceMotion,
  })

  useEffect(() => () => {
    timers.current.forEach(clearTimeout)
  }, [])

  const runDemo = () => {
    timers.current.forEach(clearTimeout)
    timers.current = []
    setPhase('encoding')
    timers.current.push(setTimeout(() => setPhase('transmitting'), reduceMotion ? 100 : 550))
    timers.current.push(setTimeout(() => setPhase('received'), reduceMotion ? 500 : 2900))
  }

  const changeProtocol = (next: Protocol) => {
    timers.current.forEach(clearTimeout)
    timers.current = []
    setProtocol(next)
    setPhase('idle')
  }

  const statusLabel = {
    idle: 'Ready to transmit',
    encoding: 'Encoding payload',
    transmitting: 'Signal in the air',
    received: 'Message received',
  }[phase]
  const toneClass = protocol === 'ultrasound' ? 'text-accent' : 'text-primary'

  return (
    <div className="signal-console hero-instrument">
      <div className="instrument-topline">
        <span><Radio size={15} /> Live signal console</span>
        <div className="instrument-topline-actions">
          <span className={`console-state state-${phase}`} role="status" aria-live="polite">
            <span className="status-dot" /> {statusLabel}
          </span>
          {!reduceMotion && (
            <button
              className="preview-toggle"
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

      <div className={`wave-stage ${phase === 'transmitting' ? 'is-active' : ''}`}>
        <div className="wave-grid" aria-hidden="true" />
        <WaveBackdrop className={toneClass} />
        <div className="scope-label" aria-hidden="true">{protocol === 'ultrasound' ? 'CH 02 · HF' : 'CH 01'}</div>
        {!previewPaused && !reduceMotion && (
          <SmoothWaveform
            aria-label="Animated encoded audio waveform"
            className={`signal-waveform ${toneClass} h-48 w-full`}
            source={signal.visual}
            mode={phase === 'transmitting' || protocol === 'ultrasound' ? 'scope' : 'wave'}
            sensitivity={phase === 'transmitting' ? 1.55 : 1.2}
            lineWidth={2.5}
          />
        )}
        <AnimatePresence>
          {phase === 'received' && (
            <motion.div
              className="decoded-message"
              initial={reduceMotion ? false : { opacity: 0, y: 12, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
              transition={{ duration: reduceMotion ? 0 : 0.28 }}
            >
              <span className="decoded-check"><Check size={15} /></span>
              <span>{demoMessage}</span>
            </motion.div>
          )}
        </AnimatePresence>
        <div className="wave-caption">
          <span>{protocol === 'audible' ? 'Audible protocol' : 'Ultrasound protocol'}</span>
          <span>{new TextEncoder().encode(demoMessage).length} byte payload</span>
        </div>
      </div>

      {!previewPaused && !reduceMotion && (
        <div className="signal-spectrum">
          <BarVisualizer
            aria-label="Animated signal frequency spectrum"
            className={`${toneClass} h-14 w-full`}
            source={signal.visual}
            barCount={32}
            align="center"
            mirrored
            idle="pulse"
          />
        </div>
      )}

      <div className="console-settings">
        <div className="protocol-switch" role="group" aria-label="Signal protocol">
          {(['audible', 'ultrasound'] as const).map((item) => (
            <button
              key={item}
              type="button"
              aria-pressed={protocol === item}
              onClick={() => changeProtocol(item)}
            >
              {protocol === item && (
                <motion.span
                  className="switch-pill"
                  layoutId="console-protocol-pill"
                  transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 460, damping: 36 }}
                />
              )}
              <span className="switch-label">{item === 'audible' ? 'Audible' : 'Ultrasound'}</span>
            </button>
          ))}
        </div>
        <VolumeControl
          value={volume}
          onValueChange={setVolume}
          muted={muted}
          onMutedChange={setMuted}
          curve="perceptual"
          size="sm"
          className="console-volume"
          aria-label="Signal preview volume"
        />
      </div>

      <div className="transmission-track" aria-label="Transmission progress">
        <span className={phase === 'idle' ? 'active' : ''}>Encode</span>
        <span className={phase === 'transmitting' ? 'active' : ''}>Transmit</span>
        <span className={phase === 'received' ? 'active' : ''}>Decode</span>
        <div className="track-line" aria-hidden="true">
          <motion.span
            initial={false}
            animate={{
              width: phase === 'idle' ? '8%' : phase === 'encoding' ? '34%' : phase === 'transmitting' ? '68%' : '100%',
            }}
            transition={{ duration: reduceMotion ? 0 : 0.45, ease: 'easeOut' }}
          />
        </div>
      </div>

      <button
        className={`button-primary transmit-demo ${phase === 'transmitting' ? 'is-transmitting' : ''}`}
        type="button"
        disabled={phase === 'encoding' || phase === 'transmitting'}
        onClick={runDemo}
      >
        {phase === 'encoding' || phase === 'transmitting' ? (
          <><LoaderCircle className="spin" size={17} /> {phase === 'encoding' ? 'Encoding…' : 'Transmitting…'}</>
        ) : phase === 'received' ? (
          <><RotateCcw size={17} /> Transmit again</>
        ) : (
          <><Waves size={17} /> Transmit a demo</>
        )}
      </button>
    </div>
  )
}
