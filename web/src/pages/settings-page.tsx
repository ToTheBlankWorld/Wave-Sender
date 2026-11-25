import { SlidersHorizontal } from 'lucide-react'

export function SettingsPage() {
  return (
    <section className="placeholder-page section-wrap">
      <div className="placeholder-icon"><SlidersHorizontal size={28} /></div>
      <p className="section-kicker">Signal preferences</p>
      <h1>Make the channel yours.</h1>
      <p>Protocol, volume, input device, and motion preferences are coming in the messenger stage.</p>
    </section>
  )
}
