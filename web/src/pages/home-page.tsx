import { ArrowRight, Radio, ShieldCheck, Smartphone, Waves } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { BarVisualizer } from '@/components/ui/bar-visualizer'
import { SmoothWaveform } from '@/components/ui/smooth-waveform'
import { VolumeControl } from '@/components/ui/volume-control'
import { useDemoSignal } from '@/hooks/use-demo-signal'

export function HomePage() {
  const [volume, setVolume] = useState(0.72)
  const [muted, setMuted] = useState(false)
  const signal = useDemoSignal({ kind: 'speech', bands: 32 })

  return (
    <div className="home-page">
      <section className="hero section-wrap">
        <div className="hero-copy">
          <div className="status-pill">
            <span className="status-dot" />
            Offline text over sound
          </div>
          <h1>Send a message.<br />Let the air carry it.</h1>
          <p className="hero-description">
            Wave-Sender turns short text into audio signals that another nearby device can hear and decode. No Wi-Fi, Bluetooth, pairing, or account.
          </p>
          <div className="hero-actions">
            <Link className="button-primary" to="/studio">
              Try the web studio <ArrowRight size={17} />
            </Link>
            <a className="button-secondary" href="#how-it-works">
              See how it works
            </a>
          </div>
          <div className="hero-facts" aria-label="Product highlights">
            <span><ShieldCheck size={16} /> Local-only history</span>
            <span><Smartphone size={16} /> Browser native</span>
          </div>
        </div>

        <div className="hero-instrument" aria-label="Animated audio signal preview">
          <div className="instrument-topline">
            <span><Radio size={15} /> Signal preview</span>
            <span className="instrument-frequency">1.8 kHz</span>
          </div>
          <div className="wave-stage">
            <div className="wave-grid" aria-hidden="true" />
            <SmoothWaveform
              aria-label="Animated speech waveform"
              className="text-primary h-48 w-full"
              source={signal.visual}
              sensitivity={1.2}
              lineWidth={2.5}
            />
            <div className="wave-caption">
              <span>Encoded payload</span>
              <span>64 bytes max</span>
            </div>
          </div>
          <div className="instrument-controls">
            <div className="spectrum-wrap">
              <BarVisualizer
                aria-label="Animated frequency spectrum"
                className="text-primary h-14 w-full"
                source={signal.visual}
                barCount={28}
                align="center"
                mirrored
              />
            </div>
            <VolumeControl
              value={volume}
              onValueChange={setVolume}
              muted={muted}
              onMutedChange={setMuted}
              curve="perceptual"
              size="sm"
              aria-label="Preview volume"
            />
          </div>
        </div>
      </section>

      <section className="how-section section-wrap" id="how-it-works">
        <div className="section-heading">
          <p className="section-kicker"><Waves size={16} /> The signal path</p>
          <h2>Three steps. One invisible handoff.</h2>
        </div>
        <div className="steps-grid">
          <article className="step">
            <span className="step-number">01</span>
            <h3>Write something short</h3>
            <p>Type a message or paste a link. Wave-Sender measures the UTF-8 payload before transmitting.</p>
          </article>
          <article className="step">
            <span className="step-number">02</span>
            <h3>Play the encoded signal</h3>
            <p>Your speaker emits an audible or ultrasonic ggwave signal. Keep the receiving device nearby.</p>
          </article>
          <article className="step">
            <span className="step-number">03</span>
            <h3>Receive and keep it</h3>
            <p>The other device decodes the sound and saves the message locally. Nothing is uploaded.</p>
          </article>
        </div>
      </section>
    </div>
  )
}
