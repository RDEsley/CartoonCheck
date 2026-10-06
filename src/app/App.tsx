import { BrowserRouter, Routes, Route, Link } from 'react-router'
import { lazy, Suspense } from 'react'
import { RuntimeProvider } from './RuntimeProvider'
import { ErrorBoundary } from './ErrorBoundary'
import { AppShell } from './AppShell'
import { Onboarding } from '../features/profile/Onboarding'
import { Home } from '../features/lists/Home'
import { ListScreen } from '../features/lists/ListScreen'
import { FeedbackProvider } from './FeedbackProvider'
import { HistoryScreen } from '../features/history/HistoryScreen'
import { CelebrationProvider } from '../celebrations/CelebrationProvider'
import { SettingsScreen } from '../features/settings/SettingsScreen'
import { ProfileScreen } from '../features/profile/ProfileScreen'
import { Wordmark } from '../components/BrandArt'
import { Landing } from '../routes/Landing'
import { PageHeading } from '../components/PageHeading'
import styles from './layout.module.css'
const BackupScreen = lazy(async () => {
  const module = await import('../features/backup/BackupScreen')
  return { default: module.BackupScreen }
})

export function App() {
  return (
    <ErrorBoundary>
      <RuntimeProvider>
        <BrowserRouter>
          <FeedbackProvider>
            <CelebrationProvider>
              <Routes>
                <Route path="/" element={<Landing />} />
                <Route path="/onboarding" element={<Onboarding />} />
                <Route
                  path="/restore"
                  element={
                    <main className={styles.onboarding}>
                      <Suspense fallback={<p role="status">Abrindo backup…</p>}>
                        <BackupScreen />
                      </Suspense>
                    </main>
                  }
                />
                <Route path="/app" element={<AppShell />}>
                  <Route index element={<Home />} />
                  <Route path="archived" element={<Home archived />} />
                  <Route path="lists/:listId" element={<ListScreen />} />
                  <Route path="history" element={<HistoryScreen />} />
                  <Route path="settings" element={<SettingsScreen />} />
                  <Route path="settings/profile" element={<ProfileScreen />} />
                  <Route
                    path="settings/backup"
                    element={
                      <Suspense fallback={<p role="status">Abrindo backup…</p>}>
                        <BackupScreen />
                      </Suspense>
                    }
                  />
                </Route>
                <Route
                  path="*"
                  element={
                    <main className={styles.onboarding}>
                      <Wordmark />
                      <PageHeading title="Página não encontrada">
                        Este caminho ainda não está pronto.
                      </PageHeading>
                      <Link to="/app" className="text-link">
                        Voltar para suas listas
                      </Link>
                    </main>
                  }
                />
              </Routes>
            </CelebrationProvider>
          </FeedbackProvider>
        </BrowserRouter>
      </RuntimeProvider>
    </ErrorBoundary>
  )
}
