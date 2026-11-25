import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router-dom'
import { SiteLayout } from '@/components/site-layout'
import { WaveStoreProvider } from '@/store/wave-store'

const HomePage = lazy(() => import('@/pages/home-page').then((module) => ({ default: module.HomePage })))
const StudioPage = lazy(() => import('@/pages/studio-page').then((module) => ({ default: module.StudioPage })))
const HistoryPage = lazy(() => import('@/pages/history-page').then((module) => ({ default: module.HistoryPage })))
const SettingsPage = lazy(() => import('@/pages/settings-page').then((module) => ({ default: module.SettingsPage })))
const NotFoundPage = lazy(() => import('@/pages/not-found-page').then((module) => ({ default: module.NotFoundPage })))

export default function App() {
  return (
    <WaveStoreProvider>
      <Suspense fallback={
        <main className="route-loading" role="status" aria-live="polite">
          Loading the signal…
        </main>
      }>
        <Routes>
          <Route element={<SiteLayout />}>
            <Route index element={<HomePage />} />
            <Route path="studio" element={<StudioPage />} />
            <Route path="history" element={<HistoryPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </Suspense>
    </WaveStoreProvider>
  )
}
