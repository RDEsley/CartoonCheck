import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { Download, FolderUp } from 'lucide-react'
import { useRuntime } from '../../app/context'
import { useFeedback } from '../../app/feedback-context'
import { CartoonButton } from '../../components/CartoonButton'
import { BottomSheet } from '../../components/BottomSheet'
import { useTask } from '../../hooks/useTask'
import { replaceBackup, snapshotBackup } from './commands'
import type { BackupData } from './format'
import { exportBackup, readBackup, downloadBackup } from './client'
import { celebrations } from '../../celebrations/engine'
import styles from '../../app/layout.module.css'
import { PageHeading } from '../../components/PageHeading'
export function BackupScreen() {
  const { db, context, profile } = useRuntime()
  const { show, dismiss } = useFeedback()
  const navigate = useNavigate()
  const { pending, error, run } = useTask()
  const [backup, setBackup] = useState<BackupData | null>(null)
  const [invalid, setInvalid] = useState('')
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
          <h2 style={{ fontSize: 22 }}>Exportar meus dados</h2>
          <p className="muted">
            Guarde o arquivo em um lugar seguro. Ele contém seus dados pessoais
            e não é protegido por senha.
          </p>
          <CartoonButton
            disabled={pending}
            onClick={() => {
              void run(
                async () => exportBackup(await snapshotBackup(db)),
                (blob) => {
                  downloadBackup(blob)
                  show('Backup exportado! Guarde seu arquivo.')
                },
              )
            }}
          >
            <Download size={20} />
            {pending ? 'Preparando…' : 'Exportar backup'}
          </CartoonButton>
        </div>
        <div className={styles.card}>
          <h2 style={{ fontSize: 22 }}>Restaurar backup</h2>
          <p className="muted">
            Primeiro verificamos o arquivo. A restauração substitui todos os
            dados atuais deste dispositivo; exporte uma cópia antes.
          </p>
          <label>
            <span className="row">
              <FolderUp size={20} />
              Escolher arquivo de backup
            </span>
            <input
              type="file"
              accept=".zip,application/zip"
              disabled={pending}
              onChange={(event) => {
                const file = event.target.files?.[0]
                if (!file) return
                setInvalid('')
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
            />
          </label>
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
            <p>
              {backup.metadata.profile?.name ?? 'Sem perfil'} ·{' '}
              {backup.metadata.lists.length} listas ·{' '}
              {backup.metadata.items.length} itens ·{' '}
              {backup.metadata.assets.length} fotos
            </p>
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
              disabled={pending}
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
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
          </div>
        </BottomSheet>
      )}
    </>
  )
}
