import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { Download, FolderUp } from 'lucide-react'
import { useRuntime } from '../../app/context'
import { useFeedback } from '../../app/feedback-context'
import { CartoonButton } from '../../components/CartoonButton'
import { FilePicker } from '../../components/FilePicker'
import { BottomSheet } from '../../components/BottomSheet'
import { useTask } from '../../hooks/useTask'
import { replaceBackup, snapshotBackup } from './commands'
import type { BackupData } from './format'
import { exportBackup, readBackup, downloadBackup } from './client'
import { celebrations } from '../../celebrations/engine'
import styles from '../../app/layout.module.css'
import { PageHeading } from '../../components/PageHeading'
const exportedAt = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
  timeStyle: 'short',
})
export function BackupScreen() {
  const { db, context, profile } = useRuntime()
  const { show, dismiss } = useFeedback()
  const navigate = useNavigate()
  const { pending, error, run } = useTask()
  const saving = useTask()
  const [backup, setBackup] = useState<BackupData | null>(null)
  const [invalid, setInvalid] = useState('')
  const [saved, setSaved] = useState(false)
  const exportCurrent = async () => exportBackup(await snapshotBackup(db))
  return (
    <>
      <div className={styles.heading}>
        <div>
          <p className={styles.eyebrow}>Uma cópia para guardar</p>
          <PageHeading title="Backup">Seus dados, com você.</PageHeading>
          <p className="muted">
            Um backup inclui perfil, listas, itens, histórico, preferências e
            fotos.
          </p>
        </div>
      </div>
      <div className="stack">
        <div className={styles.card}>
          <h2>Exportar meus dados</h2>
          <p className="muted">
            Guarde o arquivo em um lugar seguro. Ele contém seus dados pessoais
            e não é protegido por senha.
          </p>
          <CartoonButton
            busy={pending}
            onClick={() => {
              void run(exportCurrent, (blob) => {
                downloadBackup(blob)
                show('Backup exportado! Guarde seu arquivo.')
              })
            }}
          >
            <Download size={20} />
            {pending ? 'Preparando…' : 'Exportar backup'}
          </CartoonButton>
        </div>
        <div className={styles.card}>
          <h2>Restaurar backup</h2>
          <p className="muted">
            Primeiro verificamos o arquivo. A restauração substitui todos os
            dados atuais deste dispositivo; exporte uma cópia antes.
          </p>
          <FilePicker
            label="Escolher arquivo de backup"
            accept=".zip,application/zip"
            onPick={(file) => {
              setInvalid('')
              setSaved(false)
              void run(async () => {
                try {
                  return await readBackup(file)
                } catch {
                  setInvalid(
                    'Este arquivo não é um backup válido do Cartoon Check. Seus dados atuais não foram alterados.',
                  )
                  throw new Error('Invalid backup')
                }
              }, setBackup)
            }}
          >
            <FolderUp size={20} />
            Escolher arquivo de backup
          </FilePicker>
        </div>
        {invalid ? (
          <p className="error" role="alert">
            {invalid}
          </p>
        ) : (
          error && (
            <p className="error" role="alert">
              {error}
            </p>
          )
        )}
        <Link
          to={profile ? '/app/settings' : '/onboarding'}
          className="text-link"
        >
          {profile ? 'Voltar aos ajustes' : 'Voltar ao primeiro uso'}
        </Link>
      </div>
      {backup && (
        <BottomSheet
          open
          onOpenChange={(open) => {
            if (!open && !pending) setBackup(null)
          }}
          title="Restaurar estes dados?"
          alert
          description="Tudo que está neste dispositivo será substituído. Não há como desfazer sem um backup anterior."
        >
          <div className="stack">
            <p style={{ marginBottom: 0 }}>
              {backup.metadata.data.profile?.name ?? 'Sem perfil'} ·{' '}
              {backup.metadata.data.lists.length} listas ·{' '}
              {backup.metadata.data.items.length} itens ·{' '}
              {backup.metadata.assets.length} fotos
              <small
                className="muted"
                style={{ display: 'block', marginTop: 6 }}
              >
                Exportado em{' '}
                {exportedAt.format(new Date(backup.metadata.exportedAt))} ·
                versão {backup.metadata.appVersion}
              </small>
            </p>
            {profile && (
              <>
                <CartoonButton
                  variant="quiet"
                  busy={saving.pending}
                  onClick={() => {
                    void saving.run(exportCurrent, (blob) => {
                      downloadBackup(blob)
                      setSaved(true)
                    })
                  }}
                >
                  <Download size={20} />
                  Exportar meus dados atuais antes
                </CartoonButton>
                <p role="status" className="muted" style={{ margin: 0 }}>
                  {saved ? 'Cópia dos dados atuais exportada.' : ''}
                </p>
              </>
            )}
            <CartoonButton
              variant="quiet"
              disabled={pending}
              onClick={() => {
                setBackup(null)
              }}
            >
              Cancelar restauração
            </CartoonButton>
            <CartoonButton
              variant="danger"
              disabled={pending || saving.pending}
              onClick={() => {
                void run(
                  () => replaceBackup(db, context, backup),
                  () => {
                    celebrations.cancel()
                    dismiss()
                    setBackup(null)
                    void navigate('/app', { replace: true })
                    location.reload()
                  },
                )
              }}
            >
              Substituir e restaurar
            </CartoonButton>
            {(error || saving.error) && (
              <p className="error" role="alert">
                {error || saving.error}
              </p>
            )}
          </div>
        </BottomSheet>
      )}
    </>
  )
}
