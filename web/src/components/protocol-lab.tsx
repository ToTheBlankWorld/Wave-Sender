import { Ear, Radio, Volume2, Waves } from 'lucide-react'
import { useState } from 'react'
import { BarVisualizer } from '@/components/ui/bar-visualizer'
import { SmoothWaveform } from '@/components/ui/smooth-waveform'
import { useDemoSignal } from '@/hooks/use-demo-signal'
import { WaveBackdrop } from '@/components/wave-backdrop'

type Protocol = 'audible' | 'ultrasound'

export function ProtocolLab() {
  const [protocol, setProtocol] = useState<Protocol>('audible')
  const signal = useDemoSignal({
    kind: protocol === 'audible' ? 'speech' : 'tone',
    bands: 40,
    seed: protocol === 'audible' ? 4 : 9,
  })

  return (
    <div className="protocol-lab">
      <div className="protocol-tabs" role="group" aria-label="Choose a signal protocol">
        <button
          type="button"
          aria-pressed={protocol === 'audible'}
          onClick={() => setProtocol('audible')}
        >
          <Volume2 size={17} /> Audible
        </button>
        <button
          type="button"
          aria-pressed={protocol === 'ultrasound'}
          onClick={() => setProtocol('ultrasound')}
        >
          <Waves size={17} /> Ultrasound
        </button>
      </div>

      <div className="protocol-screen">
        <div className="protocol-screen-top">
          <span><Radio size={14} /> {protocol === 'audible' ? 'Everyday audio band' : 'High-frequency channel'}</span>
          <span>{protocol === 'audible' ? 'Open air' : 'Low distraction'}</span>
        </div>
        <WaveBackdrop className={protocol === 'ultrasound' ? 'text-accent' : 'text-primary'} />
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
      </div>

      <div className="protocol-description">
        {protocol === 'audible' ? <Ear size={22} /> : <Waves size={22} />}
        <div>
          <h3>{protocol === 'audible' ? 'Easy to hear. Easy to share.' : 'A quieter channel for nearby devices.'}</h3>
          <p>
            {protocol === 'audible'
              ? 'A familiar audio signal that works with standard phone and laptop speakers. Best for demos, classrooms, and quick handoffs.'
              : 'A high-frequency signal designed to be less intrusive. Device support varies, so audible mode remains the reliable fallback.'}
          </p>
        </div>
      </div>
    </div>
  )
}
