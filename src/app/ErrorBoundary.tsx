import { Component } from 'react'
import type { ReactNode } from 'react'
import { CartoonButton } from '../components/CartoonButton'
export class ErrorBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  override render() {
    if (this.state.failed)
      return (
        <main className="recovery">
          <h1>Vamos tentar de novo?</h1>
          <p>
            Não conseguimos abrir esta tela. O banco de dados não foi apagado.
          </p>
          <CartoonButton
            onClick={() => {
              location.reload()
            }}
          >
            Reabrir aplicativo
          </CartoonButton>
        </main>
      )
    return this.props.children
  }
}
