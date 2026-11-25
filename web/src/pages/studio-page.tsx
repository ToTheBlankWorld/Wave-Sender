import { ArrowRight, Radio } from 'lucide-react'
import { Link } from 'react-router-dom'

export function StudioPage() {
  return (
    <section className="placeholder-page section-wrap">
      <div className="placeholder-icon"><Radio size={28} /></div>
      <p className="section-kicker">Browser messenger</p>
      <h1>The studio is being tuned.</h1>
      <p>
        The next stage connects the visual instrument to real ggwave transmission, microphone capture, and local message history.
      </p>
      <Link className="button-primary" to="/">
        Back to the overview <ArrowRight size={17} />
      </Link>
    </section>
  )
}
