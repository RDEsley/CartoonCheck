import type { ReactNode } from 'react'
import { ArrowLeft } from 'lucide-react'
import { Link, useLocation, useNavigate } from 'react-router'
import { useRuntime } from '../../app/context'
import { Wordmark } from '../../components/BrandArt'
import { PageHeading } from '../../components/PageHeading'
import layout from '../../app/layout.module.css'
import styles from './about.module.css'
import { legalUpdatedAt } from './info'

/**
 * The frame of the support, terms and privacy pages. They are public: anyone
 * can read them before creating a profile.
 */
export function AboutPage({
  title,
  updated = false,
  children,
}: {
  title: string
  updated?: boolean
  children: ReactNode
}) {
  const { profile } = useRuntime()
  const navigate = useNavigate()
  const location = useLocation()
  const fallback = profile ? '/app/settings' : '/'
  return (
    <main className={[layout.onboarding, styles.page].join(' ')}>
      <Link to="/" aria-label="Cartoon Check: início">
        <Wordmark />
      </Link>
      {/* Goes back to where the person came from; a page opened directly has
          no history inside the app, so the link itself is used. */}
      <Link
        to={fallback}
        className={styles.back}
        onClick={(event) => {
          if (location.key === 'default') return
          event.preventDefault()
          void navigate(-1)
        }}
      >
        <ArrowLeft size={20} aria-hidden="true" />
        Voltar
      </Link>
      <PageHeading title={title} />
      {updated && <p className="hint">Última atualização: {legalUpdatedAt}</p>}
      {children}
      <nav aria-label="Sobre o Cartoon Check" className={styles.links}>
        <Link to="/app/about/support">Apoiar</Link>
        <Link to="/app/about/terms">Termos de uso</Link>
        <Link to="/app/about/privacy">Privacidade</Link>
        <Link to={fallback}>
          {profile ? 'Voltar aos ajustes' : 'Voltar ao início'}
        </Link>
      </nav>
    </main>
  )
}
