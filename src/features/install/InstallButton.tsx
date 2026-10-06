import { useState, useSyncExternalStore } from 'react'
import { Link } from 'react-router'
import { Download, Share2 } from 'lucide-react'
import { useRuntime } from '../../app/context'
import { CartoonButton } from '../../components/CartoonButton'
import { BottomSheet } from '../../components/BottomSheet'
import { useTask } from '../../hooks/useTask'
import {
  getInstallState,
  isIos,
  requestInstall,
  subscribeInstall,
} from './store'
export function InstallButton() {
  const state = useSyncExternalStore(subscribeInstall, getInstallState)
  const { profile } = useRuntime()
  const [instructions, setInstructions] = useState(false)
  const { pending, error, run } = useTask()
  const ios = isIos()
  return (
    <>
      <CartoonButton
        variant="quiet"
        disabled={state.installed || pending}
        onClick={() => {
          if (state.available) void run(requestInstall)
          else setInstructions(true)
        }}
      >
        <Download size={20} />
        {state.installed ? 'Já está instalado' : 'Instalar'}
      </CartoonButton>
      {instructions && (
        <BottomSheet
          open
          onOpenChange={setInstructions}
          title="Cartoon Check na sua tela"
          description="Abra suas listas com um toque, mesmo sem internet."
        >
          <div className="stack">
            {ios ? (
              <>
                <p className="row">
                  <Share2 size={20} />
                  <strong>No Safari do iPhone ou iPad:</strong>
                </p>
                <ol style={{ lineHeight: 1.8, margin: 0 }}>
                  <li>Toque em Compartilhar.</li>
                  <li>Escolha “Adicionar à Tela de Início”.</li>
                  <li>
                    Se aparecer “Abrir como App da Web”, deixe ativado. Toque em
                    Adicionar.
                  </li>
                </ol>
                {profile && (
                  <p className="muted">
                    O app instalado pode ter um armazenamento separado do
                    Safari. Exporte seus dados aqui e restaure o arquivo depois
                    de abrir o app instalado.
                  </p>
                )}
                {profile && (
                  <Link
                    to="/app/settings/backup"
                    onClick={() => {
                      setInstructions(false)
                    }}
                  >
                    Exportar meus dados antes de instalar →
                  </Link>
                )}
              </>
            ) : (
              <>
                <p>
                  Se o navegador não mostrar o convite de instalação, abra seu
                  menu e procure “Instalar aplicativo” ou “Adicionar à tela
                  inicial”.
                </p>
                <p className="muted">
                  No computador, o botão de instalação também pode aparecer na
                  barra de endereço. A opção depende do navegador e da
                  preparação do uso offline.
                </p>
              </>
            )}
            <CartoonButton
              onClick={() => {
                setInstructions(false)
              }}
            >
              Entendi
            </CartoonButton>
          </div>
        </BottomSheet>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </>
  )
}
