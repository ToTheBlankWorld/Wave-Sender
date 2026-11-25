import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <section className="placeholder-page section-wrap">
      <p className="section-kicker">404 / Signal lost</p>
      <h1>This frequency is quiet.</h1>
      <p>The page you requested does not exist.</p>
      <Link className="button-primary" to="/">
        <ArrowLeft size={17} /> Return home
      </Link>
    </section>
  )
}
