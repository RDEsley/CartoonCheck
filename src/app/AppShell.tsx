import { Link, NavLink, Outlet, Navigate, useLocation } from 'react-router'
import { House, Clock3, Settings2, Archive } from 'lucide-react'
import { useEffect } from 'react'
import { useRuntime } from './context'
import { Wordmark } from '../components/BrandArt'
import styles from './layout.module.css'
import { PwaStatus } from '../pwa/PwaStatus'
import { DraftRecovery } from '../pwa/DraftRecovery'
export function AppShell() {
  const { profile } = useRuntime()
  const location = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [location.pathname])
  if (profile === null) return <Navigate to="/onboarding" replace />
  return (
    <div className={styles.shell}>
      <a href="#main-content" className={styles.skip}>
        Ir para o conteúdo
      </a>
      <header className={styles.header}>
        <Link to="/app" aria-label="Cartoon Check: início">
          <Wordmark />
        </Link>
        <span className={styles.localBadge}>no seu dispositivo</span>
      </header>
      <main id="main-content" className={styles.main}>
        <PwaStatus />
        <DraftRecovery />
        <Outlet />
      </main>
      <nav aria-label="Navegação principal" className={styles.nav}>
        <NavLink to="/app" end>
          <House size={22} />
          Listas
        </NavLink>
        <NavLink to="/app/archived">
          <Archive size={22} />
          Arquivo
        </NavLink>
        <NavLink to="/app/history">
          <Clock3 size={22} />
          Histórico
        </NavLink>
        <NavLink to="/app/settings">
          <Settings2 size={22} />
          Ajustes
        </NavLink>
      </nav>
    </div>
  )
}
