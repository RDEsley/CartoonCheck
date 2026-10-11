import { useState } from 'react'
import { Copy } from 'lucide-react'
import { useFeedback } from '../../app/feedback-context'
import { CartoonButton } from '../../components/CartoonButton'
import layout from '../../app/layout.module.css'
import { AboutPage } from './AboutPage'
import { JarArt, WaveArt } from './DonationArt'
import { PixQrCode } from './PixQrCode'
import {
  donation,
  donationCode,
  formatDonation,
  parseDonation,
} from './donation'
import { settleInvite } from './invite'
import styles from './about.module.css'

type Choice = number | 'custom' | 'bank'

export function SupportScreen() {
  const { show } = useFeedback()
  const [choice, setChoice] = useState<Choice>('bank')
  const [custom, setCustom] = useState('')
  const [error, setError] = useState('')
  const [thanked, setThanked] = useState(false)
  const amount =
    choice === 'custom'
      ? parseDonation(custom)
      : choice === 'bank'
        ? null
        : choice
  const code = donationCode(amount)
  const option = (value: Choice, label: string) => (
    <button
      key={value}
      type="button"
      className={styles.amount}
      aria-pressed={choice === value}
      onClick={() => {
        setChoice(value)
      }}
    >
      {label}
    </button>
  )
  return (
    <AboutPage title="Apoiar o Cartoon Check">
      <JarArt className={styles.supportArt} />
      <p>
        O Cartoon Check é gratuito, sem anúncios e sem conta, e vai continuar
        assim. Ele é feito por uma pessoa só, no tempo livre.
      </p>
      <p>
        Se ele te ajuda e você quiser retribuir, pode doar qualquer valor por
        Pix. Doar é opcional e não libera nenhuma função.
      </p>
      <div className={[layout.card, styles.pix].join(' ')}>
        <h2>Doar por Pix</h2>
        <p className="muted">
          Recebedor: <strong>{donation.receiver}</strong>
        </p>
        <div className={styles.amounts} role="group" aria-label="Valor">
          {donation.suggestedAmounts.map((value) =>
            option(value, formatDonation(value)),
          )}
          {option('custom', 'Outro valor')}
          {option('bank', 'Decidir no banco')}
        </div>
        {choice === 'custom' && (
          <label className={styles.custom}>
            Valor em reais
            <input
              inputMode="decimal"
              value={custom}
              placeholder="Ex.: 15,00"
              aria-describedby={
                custom && amount === null ? 'donation-amount-hint' : undefined
              }
              onChange={(event) => {
                setCustom(event.target.value)
              }}
            />
            {custom && amount === null && (
              <span id="donation-amount-hint" className="error">
                Use só números, como 15 ou 15,50 (máximo de{' '}
                {formatDonation(donation.maxAmount)}).
              </span>
            )}
          </label>
        )}
        <PixQrCode value={code} />
        <p className={styles.chosen}>
          {amount === null ? (
            'Você escolhe o valor no app do banco.'
          ) : (
            <>
              Valor: <strong>{formatDonation(amount)}</strong>
            </>
          )}
        </p>
        <code className={styles.code}>{code}</code>
        <CartoonButton
          onClick={() => {
            navigator.clipboard.writeText(code).then(
              () => {
                setError('')
                setThanked(true)
                settleInvite()
                show('Código Pix copiado!')
              },
              () => {
                setError(
                  'Não deu para copiar. Selecione o código acima e copie.',
                )
              },
            )
          }}
        >
          <Copy size={20} />
          Copiar código Pix
        </CartoonButton>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        {thanked && (
          <div className={styles.thanks} role="status">
            <WaveArt className={styles.thanksArt} />
            <p>
              <strong>Muito obrigado!</strong> Agora é só colar o código no Pix
              do seu banco. O Cartoon Check não fica sabendo se o pagamento foi
              feito, então o agradecimento já fica aqui: sua ajuda faz diferença
              de verdade.
            </p>
          </div>
        )}
        <ol className={styles.steps}>
          <li>
            No app do seu banco, abra o Pix e escolha “Ler QR Code” ou “Pix
            Copia e Cola”.
          </li>
          <li>
            Confira o nome do recebedor: <strong>{donation.receiver}</strong>.
            Se aparecer outro nome, não confirme.
          </li>
          <li>Confirme o valor e conclua. Muito obrigado!</li>
        </ol>
      </div>
      <p className="hint">
        O pagamento acontece no app do seu banco. O Cartoon Check não fica
        sabendo quem doou nem quanto.
      </p>
    </AboutPage>
  )
}
