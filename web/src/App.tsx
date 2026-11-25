import { Route, Routes } from 'react-router-dom'
import { SiteLayout } from '@/components/site-layout'
import { HistoryPage } from '@/pages/history-page'
import { HomePage } from '@/pages/home-page'
import { NotFoundPage } from '@/pages/not-found-page'
import { SettingsPage } from '@/pages/settings-page'
import { StudioPage } from '@/pages/studio-page'
import { WaveStoreProvider } from '@/store/wave-store'

export default function App() {
  return (
    <WaveStoreProvider>
      <Routes>
        <Route element={<SiteLayout />}>
          <Route index element={<HomePage />} />
          <Route path="studio" element={<StudioPage />} />
          <Route path="history" element={<HistoryPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </WaveStoreProvider>
  )
}
