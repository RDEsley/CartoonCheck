import { useRef, useState } from 'react'
import { Link } from 'react-router'
import { ArrowUpRight, WifiOff, LockKeyhole, Zap } from 'lucide-react'
import { useReducedMotion } from 'motion/react'
import { Wordmark, BrandArt } from '../components/BrandArt'
import { CartoonCheckbox } from '../components/CartoonCheckbox'
import { InstallButton } from '../features/install/InstallButton'
import { celebrations } from '../celebrations/engine'
import { useRuntime } from '../app/context'
import styles from './landing.module.css'
export function Landing() {
  const { profile } = useRuntime()
  const systemReduced = useReducedMotion()
  const [checked, setChecked] = useState(false)
  const card = useRef<HTMLDivElement>(null)
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Wordmark />
        <Link to="/app">
          Suas listas <ArrowUpRight size={18} />
        </Link>
      </header>
      <main className={styles.hero}>
        <div className={styles.copy}>
          <p className={styles.eyebrow}>UM CHECK. UM PEQUENO YAY.</p>
          <h1>
            Sua lista.
            <br />
            Seu próximo
            <br />
            <span>check!</span>
            <svg viewBox="0 0 280 20" aria-hidden="true">
              <path
                d="M8 11c59-12 124 12 257-4M39 17c62-6 131 3 186-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="4"
                strokeLinecap="round"
              />
            </svg>
          </h1>
          <p className={styles.description}>
            Do mercado à viagem dos sonhos.
            <br />
            Adicione, marque e comemore as pequenas conquistas.
          </p>
          <div className={styles.actions}>
            <Link to="/app" className={styles.open}>
              Abrir Cartoon Check <ArrowUpRight size={22} />
            </Link>
            <InstallButton />
          </div>
          <p className={styles.small}>Sem conta. Sem complicar a sua lista.</p>
        </div>
        <div className={styles.scene}>
          <div className={styles.star}>
            <BrandArt kind="star" size={110} />
          </div>
          <div className={styles.bag}>
            <BrandArt size={152} />
          </div>
          <div className={styles.paper}>
            <span className={styles.ticket}>MINHA PRÓXIMA AVENTURA</span>
            <h2>Coisas que eu quero ✦</h2>
            <div ref={card} className={styles.demoItem}>
              <CartoonCheckbox
                checked={checked}
                label="Experimentar um check"
                onChange={() => {
                  const next = !checked
                  setChecked(next)
                  const rect = card.current?.getBoundingClientRect()
                  if (next && rect)
                    celebrations.purchase(
                      'Um presente especial',
                      rect,
                      false,
                      {
                        reduced:
                          systemReduced === true ||
                          profile?.reduceMotion === true,
                        haptics: false,
                        sakura: profile?.themeId === 'sakura',
                      },
                      () => undefined,
                    )
                  else celebrations.cancel()
                }}
              />
              <span
                style={{ textDecoration: checked ? 'line-through' : 'none' }}
              >
                Um presente especial
              </span>
            </div>
            <div className={styles.demoItem} aria-hidden="true">
              <span className={styles.demoCircle} />
              Tênis para ir longe
            </div>
            <div className={styles.demoItem} aria-hidden="true">
              <span className={styles.demoCircle} />
              Algo que faz sorrir
            </div>
            <p className={styles.try}>
              {checked
                ? 'Comprado! ✨ Pequeno check, grande sensação.'
                : '↑ Toque no primeiro check. É por sua conta.'}
            </p>
          </div>
          <span className={styles.sticker}>
            check it.
            <br />
            <strong>celebrate it.</strong>
          </span>
          <div className={styles.spark} aria-hidden="true">
            ✦
          </div>
        </div>
      </main>
      <div className={styles.benefits}>
        <span>
          <WifiOff size={20} />
          Offline depois de preparar
        </span>
        <span>
          <LockKeyhole size={20} />
          Dados no seu dispositivo
        </span>
        <span>
          <Zap size={20} />
          Rápido de verdade
        </span>
      </div>
      <footer className={styles.footer}>
        <span>Cartoon Check · Feito para os pequenos checks.</span>
        <a
          href="https://github.com/RDEsley/CartoonCheck"
          target="_blank"
          rel="noreferrer"
        >
          Código no GitHub ↗
        </a>
      </footer>
    </div>
  )
}
