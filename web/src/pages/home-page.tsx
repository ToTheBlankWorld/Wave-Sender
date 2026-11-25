import {
  ArrowRight,
  Bluetooth,
  Check,
  CloudOff,
  Copy,
  History,
  LockKeyhole,
  MonitorSmartphone,
  RadioTower,
  ShieldCheck,
  Smartphone,
  UserRound,
  WifiOff,
  Waves,
} from 'lucide-react'
import { motion } from 'motion/react'
import { Link } from 'react-router-dom'
import { ContourField } from '@/components/contour-field'
import { ProtocolLab } from '@/components/protocol-lab'
import { SignalConsole } from '@/components/signal-console'
import { useReducedMotion } from '@/hooks/use-reduced-motion'

const easeCurve = [0.22, 1, 0.36, 1] as const

const steps = [
  {
    title: 'Write something short',
    text: 'Type a message or paste a link. Wave-Sender measures the UTF-8 payload before it becomes sound.',
    detail: 'Up to 64 bytes',
  },
  {
    title: 'Play the encoded signal',
    text: 'The speaker emits an audible or ultrasonic ggwave signal. Keep the receiving device nearby and the volume comfortable.',
    detail: 'No pairing needed',
  },
  {
    title: 'Receive and keep it',
    text: 'The other device decodes the signal and saves the message locally. Copy it, revisit it, or clear it whenever you want.',
    detail: 'Local history only',
  },
]

const useCases = [
  { title: 'Field notes', text: 'Pass a coordinate or quick note between nearby devices.' },
  { title: 'Classroom handoffs', text: 'Share short prompts without a shared network.' },
  { title: 'Event crews', text: 'Exchange simple cues when connectivity is unreliable.' },
  { title: 'Offline demos', text: 'Show data-over-sound with nothing but two screens.' },
]

const faqs = [
  {
    question: 'Does this need Wi-Fi or Bluetooth?',
    answer: 'No. The message is encoded into audio and travels through the air between nearby devices. The web app itself must be loaded once, but transmission does not use a network connection.',
  },
  {
    question: 'Is the microphone always on?',
    answer: 'No. Capture starts only after you choose Start receiving and grant permission. Stopping, switching modes, navigating away, or backgrounding the page releases the microphone.',
  },
  {
    question: 'Where are received messages stored?',
    answer: 'In local browser storage on the receiving device. Wave-Sender does not send message content to a server or require an account.',
  },
  {
    question: 'Can every device decode ultrasound?',
    answer: 'Support varies by speaker, microphone, browser, and device. Audible mode is the most compatible option; ultrasound is useful when the hardware supports it.',
  },
]

export function HomePage() {
  const reduceMotion = useReducedMotion()
  const reveal = (delay = 0) => reduceMotion
    ? {}
    : {
        initial: { opacity: 0, y: 16 },
        whileInView: { opacity: 1, y: 0 },
        viewport: { once: true, amount: 0.18 },
        transition: { duration: 0.5, delay, ease: easeCurve },
      }

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
            Turn short text into a signal that another nearby device can hear and decode. No Wi-Fi, Bluetooth, pairing, or account.
          </p>
          <div className="hero-actions">
            <Link className="button-primary" to="/studio">
              Open the web studio <ArrowRight size={17} />
            </Link>
            <a className="button-secondary" href="#signal-path">
              Follow the signal
            </a>
          </div>
          <div className="hero-facts" aria-label="Product highlights">
            <span><ShieldCheck size={16} /> Local-only history</span>
            <span><MonitorSmartphone size={16} /> Desktop and mobile</span>
          </div>
        </div>

        <SignalConsole />
      </section>

      <section className="trust-strip" aria-label="No network infrastructure required">
        <div className="section-wrap trust-inner">
          <p>Nothing between you but air.</p>
          <div className="trust-list">
            <span><WifiOff size={17} /> No Wi-Fi</span>
            <span><Bluetooth size={17} /> No pairing</span>
            <span><UserRound size={17} /> No account</span>
            <span><CloudOff size={17} /> No cloud</span>
          </div>
        </div>
      </section>

      <section className="signal-path section-wrap" id="signal-path">
        <div className="path-intro">
          <p className="section-kicker"><Waves size={16} /> From text to sound</p>
          <h2>A short message.<br />A complete journey.</h2>
          <p>Wave-Sender uses ggwave to encode text into an audio signal, then decodes that signal back into text on the receiving device.</p>
          <Link className="text-link" to="/studio">
            Try a transmission <ArrowRight size={16} />
          </Link>
        </div>
        <div className="path-steps">
          {steps.map((step, index) => (
            <motion.article className="path-step" key={step.title} {...reveal(index * 0.06)}>
              <div className="path-step-meta">
                <span className="step-number">0{index + 1}</span>
                <span className="step-detail">{step.detail}</span>
              </div>
              <h3>{step.title}</h3>
              <p>{step.text}</p>
              <div className="step-signal" aria-hidden="true">
                <span /><span /><span /><span /><span /><span /><span /><span /><span />
              </div>
            </motion.article>
          ))}
        </div>
      </section>

      <section className="privacy-section" id="privacy">
        <ContourField className="contour-field" />
        <div className="section-wrap privacy-grid">
          <motion.div className="privacy-copy" {...reveal(0)}>
            <p className="section-kicker"><LockKeyhole size={16} /> Private by proximity</p>
            <h2>The message stays close.<br />So does the history.</h2>
            <p>
              Received messages are saved on the device that hears them. There is no inbox to sync, no profile to build, and no message archive on a remote server.
            </p>
            <ul className="privacy-list">
              <li><Check size={16} /> Microphone capture starts only when you ask</li>
              <li><Check size={16} /> History is stored in this browser</li>
              <li><Check size={16} /> Clear received messages at any time</li>
            </ul>
          </motion.div>

          <motion.div className="history-preview" aria-label="Example of local message history" {...reveal(0.08)}>
            <div className="history-preview-header">
              <span><History size={16} /> Received</span>
              <span className="local-badge"><span className="status-dot" /> On this device</span>
            </div>
            <div className="history-preview-list">
              <div className="history-preview-row">
                <div className="message-icon"><RadioTower size={18} /></div>
                <div>
                  <p>Meet me by the north gate.</p>
                  <span>Example message · just now</span>
                </div>
                <Copy size={15} aria-hidden="true" />
              </div>
              <div className="history-preview-row">
                <div className="message-icon"><Smartphone size={18} /></div>
                <div>
                  <p>The demo starts in five minutes.</p>
                  <span>Example message · 2 min ago</span>
                </div>
                <Copy size={15} aria-hidden="true" />
              </div>
              <div className="history-preview-row muted-row">
                <div className="message-icon"><Waves size={18} /></div>
                <div>
                  <p>Signal received clearly.</p>
                  <span>Example message · 4 min ago</span>
                </div>
                <Copy size={15} aria-hidden="true" />
              </div>
            </div>
            <div className="history-preview-footer">
              <LockKeyhole size={14} /> Local browser storage · nothing uploaded
            </div>
          </motion.div>
        </div>
      </section>

      <section className="protocol-section section-wrap" id="protocols">
        <div className="protocol-copy">
          <p className="section-kicker"><RadioTower size={16} /> Choose your channel</p>
          <h2>One signal.<br />Two ways to travel.</h2>
          <p>
            Use audible mode for broad compatibility, or switch to ultrasound for a higher-frequency channel. Both use the same short-text workflow.
          </p>
          <div className="protocol-note">
            <span className="note-mark">i</span>
            Keep devices nearby, reduce background noise, and use a comfortable volume.
          </div>
        </div>
        <ProtocolLab />
      </section>

      <section className="use-cases section-wrap" id="use-cases">
        <div className="section-heading">
          <div>
            <p className="section-kicker"><Smartphone size={16} /> Made for nearby moments</p>
            <h2>Useful when the network is not.</h2>
          </div>
          <p>Built for quick, local exchanges rather than long conversations.</p>
        </div>
        <div className="use-case-list">
          {useCases.map((useCase, index) => (
            <motion.article className="use-case" key={useCase.title} {...reveal(index * 0.05)}>
              <span className="use-case-index">0{index + 1}</span>
              <h3>{useCase.title}</h3>
              <p>{useCase.text}</p>
            </motion.article>
          ))}
        </div>
      </section>

      <section className="faq-section section-wrap" id="faq">
        <div className="faq-intro">
          <p className="section-kicker">Good to know</p>
          <h2>Before you press transmit.</h2>
        </div>
        <div className="faq-list">
          {faqs.map((faq) => (
            <details key={faq.question}>
              <summary>{faq.question}<span aria-hidden="true">+</span></summary>
              <p>{faq.answer}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="final-cta section-wrap" id="get-started">
        <div className="cta-rings" aria-hidden="true"><span /><span /><span /><span /></div>
        <motion.div className="final-cta-content" {...reveal(0)}>
          <p className="section-kicker">Your next message can travel through air</p>
          <h2>Ready to make<br />some noise?</h2>
          <p>Open the studio, write something short, and let a nearby device listen.</p>
          <Link className="button-primary" to="/studio">
            Launch the studio <ArrowRight size={17} />
          </Link>
        </motion.div>
      </section>
    </div>
  )
}
