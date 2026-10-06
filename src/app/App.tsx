import { BrowserRouter, Routes, Route, Link } from 'react-router'
import { RuntimeProvider } from './RuntimeProvider'
import { ErrorBoundary } from './ErrorBoundary'
import { AppShell } from './AppShell'
import { Onboarding } from '../features/profile/Onboarding'
import { Home } from '../features/lists/Home'
import { ListScreen } from '../features/lists/ListScreen'
import { FeedbackProvider } from './FeedbackProvider'
import { HistoryScreen } from '../features/history/HistoryScreen'
import { Wordmark, BrandArt } from '../components/BrandArt'
import styles from './layout.module.css'

export function App() {
  return (
    <ErrorBoundary>
      <RuntimeProvider>
        <BrowserRouter>
          <FeedbackProvider>
            <Routes>
              <Route
                path="/"
                element={
                  <main className={styles.onboarding}>
                    <Wordmark />
                    <h1>
                      Adicione.
                      <br />
                      Marque.
                      <br />
                      Comemore.
                    </h1>
                    <BrandArt size={140} />
                    <p>
                      Suas compras, com um pequeno toque de desenho animado.
                    </p>
                    <Link to="/app">Abrir Cartoon Check →</Link>
                  </main>
                }
              />
              <Route path="/onboarding" element={<Onboarding />} />
              <Route path="/app" element={<AppShell />}>
                <Route index element={<Home />} />
                <Route path="archived" element={<Home archived />} />
                <Route path="lists/:listId" element={<ListScreen />} />
                <Route path="history" element={<HistoryScreen />} />
              </Route>
              <Route
                path="*"
                element={
                  <main className={styles.onboarding}>
                    <Wordmark />
                    <h1>Este caminho ainda não está pronto.</h1>
                    <Link to="/app">Voltar para suas listas</Link>
                  </main>
                }
              />
            </Routes>
          </FeedbackProvider>
        </BrowserRouter>
      </RuntimeProvider>
    </ErrorBoundary>
  )
}
