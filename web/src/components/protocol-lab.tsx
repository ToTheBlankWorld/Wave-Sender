import { Ear, Pause, Play, Radio, Volume2, Waves } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'
import { BarVisualizer } from '@/components/ui/bar-visualizer'
import { SmoothWaveform } from '@/components/ui/smooth-waveform'
import { useDemoSignal } from '@/hooks/use-demo-signal'
import { useReducedMotion } from '@/hooks/use-reduced-motion'
import { WaveBackdrop } from '@/components/wave-backdrop'

type Protocol = 'audible' | 'ultrasound'

export function ProtocolLab() {
  const [protocol, setProtocol] = useState<Protocol>('audible')
  const [paused, setPaused] = useState(false)
  const reduceMotion = useReducedMotion()
  const signal = useDemoSignal({
    kind: protocol === 'audible' ? 'speech' : 'tone',
    bands: 40,
    seed: protocol === 'audible' ? 4 : 9,
    playing: !paused && !reduceMotion,
  })

  return (
    <div className="protocol-lab">
      <div className="protocol-tabs" role="group" aria-label="Choose a signal protocol">
        {(['audible', 'ultrasound'] as const).map((item) => (
          <button
            key={item}
            type="button"
            aria-pressed={protocol === item}
            onClick={() => setProtocol(item)}
          >
            {protocol === item && (
              <motion.span
                className="switch-pill"
                layoutId="lab-protocol-pill"
                transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 460, damping: 36 }}
              />
            )}
            <span className="switch-label">
              {item === 'audible' ? <><Volume2 size={17} /> Audible</> : <><Waves size={17} /> Ultrasound</>}
            </span>
          </button>
        ))}
      </div>

      <div className="protocol-screen">
        <div className="protocol-screen-top">
          <span><Radio size={14} /> {protocol === 'audible' ? 'Everyday audio band' : 'High-frequency channel'}</span>
          <div className="protocol-preview-actions">
            <span>{protocol === 'audible' ? 'Open air' : 'Low distraction'}</span>
            {!reduceMotion && (
              <button
                className="preview-toggle"
                type="button"
                aria-label={paused ? 'Resume protocol preview' : 'Pause protocol preview'}
                aria-pressed={paused}
                onClick={() => setPaused((value) => !value)}
              >
                {paused ? <Play size={14} /> : <Pause size={14} />}
              </button>
            )}
          </div>
        </div>
        <WaveBackdrop className={protocol === 'ultrasound' ? 'text-accent' : 'text-primary'} />
        {!paused && !reduceMotion && (
          <>
            <SmoothWaveform
              aria-label={`${protocol} signal waveform`}
              className={`protocol-waveform ${protocol === 'ultrasound' ? 'text-accent' : 'text-primary'}`}
              source={signal.visual}
              mode={protocol === 'audible' ? 'wave' : 'scope'}
              sensitivity={protocol === 'audible' ? 1.1 : 1.45}
              lineWidth={2}
            />
            <BarVisualizer
              aria-label={`${protocol} frequency spectrum`}
              className={`protocol-spectrum ${protocol === 'ultrasound' ? 'text-accent' : 'text-primary'}`}
              source={signal.visual}
              barCount={36}
              align="center"
              mirrored
            />
          </>
        )}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={protocol}
          className="protocol-description"
          initial={reduceMotion ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -4 }}
          transition={{ duration: reduceMotion ? 0 : 0.2, ease: [0.22, 1, 0.36, 1] }}
        >
          {protocol === 'audible' ? <Ear size={22} /> : <Waves size={22} />}
          <div>
            <h3>{protocol === 'audible' ? 'Easy to hear. Easy to share.' : 'A quieter channel for nearby devices.'}</h3>
            <p>
              {protocol === 'audible'
                ? 'A familiar audio signal that works with standard phone and laptop speakers. Best for demos, classrooms, and quick handoffs.'
                : 'A high-frequency signal designed to be less intrusive. Device support varies, so audible mode remains the reliable fallback.'}
            </p>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
