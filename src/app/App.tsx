import { BrowserRouter, Routes, Route, Link } from 'react-router'
import { lazy, Suspense } from 'react'
import { RuntimeProvider } from './RuntimeProvider'
import { ErrorBoundary } from './ErrorBoundary'
import { AppShell } from './AppShell'
import { Onboarding } from '../features/profile/Onboarding'
import { Home } from '../features/lists/Home'
import { FeedbackProvider } from './FeedbackProvider'
import { CelebrationProvider } from '../celebrations/CelebrationProvider'
import { Wordmark } from '../components/BrandArt'
import { Landing } from '../routes/Landing'
import { PageHeading } from '../components/PageHeading'
import styles from './layout.module.css'
// The first screens ship with the entry; the others load when they are opened
// and are precached by the service worker for offline use.
const ListScreen = lazy(async () => ({
  default: (await import('../features/lists/ListScreen')).ListScreen,
}))
const HistoryScreen = lazy(async () => ({
  default: (await import('../features/history/HistoryScreen')).HistoryScreen,
}))
const SettingsScreen = lazy(async () => ({
  default: (await import('../features/settings/SettingsScreen')).SettingsScreen,
}))
const ProfileScreen = lazy(async () => ({
  default: (await import('../features/profile/ProfileScreen')).ProfileScreen,
}))
const BackupScreen = lazy(async () => ({
  default: (await import('../features/backup/BackupScreen')).BackupScreen,
}))
const SupportScreen = lazy(async () => ({
  default: (await import('../features/about/SupportScreen')).SupportScreen,
}))
const TermsScreen = lazy(async () => ({
  default: (await import('../features/about/TermsScreen')).TermsScreen,
}))
const PrivacyScreen = lazy(async () => ({
  default: (await import('../features/about/PrivacyScreen')).PrivacyScreen,
}))
const opening = <p role="status">Abrindo…</p>

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
                {/* Public pages. They live under /app, which the hosting and the
                    service worker already serve, but outside the shell: no
                    profile is needed to read them. */}
                <Route
                  path="/app/about/support"
                  element={
                    <Suspense fallback={opening}>
                      <SupportScreen />
                    </Suspense>
                  }
                />
                <Route
                  path="/app/about/terms"
                  element={
                    <Suspense fallback={opening}>
                      <TermsScreen />
                    </Suspense>
                  }
                />
                <Route
                  path="/app/about/privacy"
                  element={
                    <Suspense fallback={opening}>
                      <PrivacyScreen />
                    </Suspense>
                  }
                />
                <Route path="/app" element={<AppShell />}>
                  <Route index element={<Home />} />
                  <Route path="archived" element={<Home archived />} />
                  <Route path="lists/:listId" element={<ListScreen />} />
                  <Route path="history" element={<HistoryScreen />} />
                  <Route path="settings" element={<SettingsScreen />} />
                  <Route path="settings/profile" element={<ProfileScreen />} />
                  <Route path="settings/backup" element={<BackupScreen />} />
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
