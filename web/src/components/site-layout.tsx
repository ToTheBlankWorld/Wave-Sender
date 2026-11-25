import { ArrowUpRight, Menu, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { BrandMark, GithubMark } from './brand-mark'
import { useWaveStore } from '@/store/wave-store'

const navigation = [
  { to: '/', label: 'Overview' },
  { to: '/studio', label: 'Studio' },
  { to: '/history', label: 'History' },
  { to: '/settings', label: 'Settings' },
]

export function SiteLayout() {
  const [openMenuPath, setOpenMenuPath] = useState<string | null>(null)
  const location = useLocation()
  const menuOpen = openMenuPath === location.pathname
  const { stopReceiving } = useWaveStore()

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' })
  }, [location.pathname])

  useEffect(() => {
    if (location.pathname !== '/studio') stopReceiving()
  }, [location.pathname, stopReceiving])

  return (
    <div className="site-shell">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <header className="site-header">
        <div className="header-inner">
          <Link className="brand" to="/" aria-label="Wave-Sender home">
            <span className="brand-symbol"><BrandMark /></span>
            <span>Wave-Sender</span>
          </Link>

          <nav className="desktop-nav" aria-label="Main navigation">
            {navigation.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="header-actions">
            <a
              className="icon-button github-link"
              href="https://github.com/ToTheBlankWorld/Wave-Sender"
              target="_blank"
              rel="noreferrer"
              aria-label="View Wave-Sender on GitHub"
            >
              <GithubMark size={18} />
            </a>
            <Link className="button-primary header-cta" to="/studio">
              Open studio <ArrowUpRight size={16} />
            </Link>
            <button
              className="icon-button menu-button"
              type="button"
              aria-label={menuOpen ? 'Close navigation' : 'Open navigation'}
              aria-expanded={menuOpen}
              onClick={() => setOpenMenuPath(menuOpen ? null : location.pathname)}
            >
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {menuOpen && (
          <nav className="mobile-nav" aria-label="Mobile navigation">
            {navigation.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}
                onClick={() => setOpenMenuPath(null)}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        )}
      </header>

      <main id="main-content">
        <Outlet />
      </main>

      <footer className="site-footer">
        <div className="footer-inner">
          <Link className="brand footer-brand" to="/">
            <span className="brand-symbol"><BrandMark /></span>
            <span>Wave-Sender</span>
          </Link>
          <p>Short messages. Nearby devices. No network required.</p>
          <a
            className="footer-owner"
            href="https://github.com/ToTheBlankWorld"
            target="_blank"
            rel="noreferrer"
          >
            Built by ToTheBlankWorld <ArrowUpRight size={14} />
          </a>
        </div>
      </footer>
    </div>
  )
}
