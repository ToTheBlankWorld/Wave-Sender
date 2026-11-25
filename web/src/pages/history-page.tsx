import { History } from 'lucide-react'

export function HistoryPage() {
  return (
    <section className="placeholder-page section-wrap">
      <div className="placeholder-icon"><History size={28} /></div>
      <p className="section-kicker">Local archive</p>
      <h1>Your received signals will live here.</h1>
      <p>History stays in this browser and can be copied or cleared at any time.</p>
    </section>
  )
}
