import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { ArrowLeft, HeartHandshake, X } from 'lucide-react'
import { BottomSheet } from '../../components/BottomSheet'
import { CartoonButton } from '../../components/CartoonButton'
import controls from '../../components/controls.module.css'
import { JarArt, WaveArt } from './DonationArt'
import {
  cardAfterVisits,
  cardHidden,
  countVisit,
  hideCard,
  inviteAfterVisits,
  inviteLockMs,
  inviteSeen,
  markInviteSeen,
} from './invite'
import styles from './about.module.css'

type Step = 'ask' | 'thanks'

/** The sheet only closes through its own buttons. */
const stay = () => undefined

/**
 * The donation invitation: a small card at the foot of the app and a sheet that
 * opens by itself a single time, after a few visits. Dismissing the card opens
 * the sheet once more and hides the card for good.
 */
export function DonationInvite() {
  const navigate = useNavigate()
  const [card, setCard] = useState(false)
  const [step, setStep] = useState<Step | null>(null)
  const [unlocked, setUnlocked] = useState<Step | null>(null)

  useEffect(() => {
    const visits = countVisit()
    const timer = window.setTimeout(() => {
      setCard(visits >= cardAfterVisits && !cardHidden())
      if (visits < inviteAfterVisits || inviteSeen()) return
      markInviteSeen()
      setStep('ask')
    }, 1500)
    return () => {
      window.clearTimeout(timer)
    }
  }, [])

  useEffect(() => {
    if (step === null) return
    const timer = window.setTimeout(() => {
      setUnlocked(step)
    }, inviteLockMs)
    return () => {
      window.clearTimeout(timer)
      setUnlocked(null)
    }
  }, [step])

  const locked = unlocked !== step

  return (
    <>
      {card && (
        <aside
          className={styles.supportCard}
          aria-label="Apoiar o Cartoon Check"
        >
          <HeartHandshake size={24} aria-hidden="true" />
          <p>
            <strong>O Cartoon Check te ajuda?</strong>
            <span className="muted">Apoie com qualquer valor, se quiser.</span>
          </p>
          <Link to="/app/about/support">Quero apoiar</Link>
          <button
            type="button"
            className={controls.iconButton}
            aria-label="Dispensar o convite de apoio"
            onClick={() => {
              hideCard()
              markInviteSeen()
              setCard(false)
              setStep('ask')
            }}
          >
            <X size={22} />
          </button>
        </aside>
      )}
      {step === 'ask' && (
        <BottomSheet
          open
          dismissible={false}
          onOpenChange={stay}
          title="Que bom ter você por aqui!"
          description="Você já abriu o Cartoon Check algumas vezes, então ele deve estar sendo útil. Fico feliz de verdade."
        >
          <WaveArt className={styles.inviteArt} />
          <p>
            Ele é gratuito e vai continuar assim. Sou só eu cuidando dele, no
            meu tempo livre, e mantê-lo no ar dá trabalho e tem seus custos. Se
            quiser ajudar, qualquer valor conta: <strong>R$ 1 já ajuda</strong>.
          </p>
          <div className="stack">
            <CartoonButton
              busy={locked}
              data-autofocus
              onClick={() => {
                setStep(null)
                void navigate('/app/about/support')
              }}
            >
              Quero ajudar
            </CartoonButton>
            <CartoonButton
              variant="quiet"
              busy={locked}
              onClick={() => {
                setStep('thanks')
              }}
            >
              Agora não
            </CartoonButton>
          </div>
        </BottomSheet>
      )}
      {step === 'thanks' && (
        <BottomSheet
          open
          dismissible={false}
          onOpenChange={stay}
          title="Tudo bem, obrigado mesmo assim!"
          description="Fique à vontade para usar o Cartoon Check de graça, sempre que quiser. Saber que ele é útil já faz valer a pena."
        >
          <JarArt className={styles.inviteArt} />
          <p>
            Se um dia quiser apoiar, é só abrir{' '}
            <strong>Ajustes → Apoiar o Cartoon Check</strong>.
          </p>
          <div className="stack">
            <CartoonButton
              busy={locked}
              data-autofocus
              onClick={() => {
                setStep(null)
              }}
            >
              Tudo bem
            </CartoonButton>
            <CartoonButton
              variant="quiet"
              onClick={() => {
                setStep('ask')
              }}
            >
              <ArrowLeft size={20} />
              Voltar
            </CartoonButton>
          </div>
        </BottomSheet>
      )}
    </>
  )
}
