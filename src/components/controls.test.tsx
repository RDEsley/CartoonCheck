import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { expect, it, vi } from 'vitest'
import { CartoonCheckbox } from './CartoonCheckbox'
import { BottomSheet } from './BottomSheet'
import { ProgressMeter } from './ProgressMeter'
it('reports list progress as a percentage and keeps an empty list at zero', () => {
  const { rerender } = render(<ProgressMeter value={50} />)
  const meter = screen.getByRole('progressbar', { name: 'Progresso da lista' })
  expect(meter).toHaveAttribute('aria-valuenow', '50')
  expect(meter).toHaveAttribute('aria-valuetext', '50% comprado')
  expect(meter.firstElementChild).toHaveStyle({ transform: 'scaleX(0.5)' })
  rerender(<ProgressMeter value={null} />)
  expect(meter).toHaveAttribute('aria-valuenow', '0')
  expect(meter).toHaveAttribute('aria-valuetext', 'Lista vazia')
  expect(meter.firstElementChild).toHaveStyle({ transform: 'scaleX(0)' })
})
it('exposes purchase state and supports keyboard activation', async () => {
  const onChange = vi.fn()
  const user = userEvent.setup()
  const { rerender } = render(
    <CartoonCheckbox
      checked={false}
      label="Comprar câmera"
      onChange={onChange}
    />,
  )
  const checkbox = screen.getByRole('checkbox', { name: 'Comprar câmera' })
  expect(checkbox).toHaveAttribute('aria-checked', 'false')
  await user.tab()
  await user.keyboard(' ')
  expect(onChange).toHaveBeenCalledOnce()
  rerender(
    <CartoonCheckbox checked label="Comprar câmera" onChange={onChange} />,
  )
  expect(checkbox).toHaveAttribute('aria-checked', 'true')
})
it('names the sheet and closes with Escape', async () => {
  const user = userEvent.setup()
  const close = vi.fn()
  render(
    <BottomSheet
      open
      onOpenChange={close}
      title="Nova lista"
      description="Uma lista do seu jeito."
    >
      <label>
        Nome
        <input />
      </label>
    </BottomSheet>,
  )
  expect(screen.getByRole('dialog', { name: 'Nova lista' })).toBeInTheDocument()
  await user.keyboard('{Escape}')
  expect(close).toHaveBeenCalledWith(false)
})
it('focuses the marked field and returns focus to the trigger when the sheet closes', async () => {
  const user = userEvent.setup()
  function Example() {
    const [open, setOpen] = useState(false)
    return (
      <>
        <button
          onClick={() => {
            setOpen(true)
          }}
        >
          Abrir
        </button>
        {open && (
          <BottomSheet
            open
            onOpenChange={setOpen}
            title="Nova lista"
            description="Uma lista do seu jeito."
          >
            <button>Antes do campo</button>
            <label>
              Nome
              <input data-autofocus />
            </label>
          </BottomSheet>
        )}
      </>
    )
  }
  render(<Example />)
  await user.click(screen.getByRole('button', { name: 'Abrir' }))
  expect(screen.getByLabelText('Nome')).toHaveFocus()
  await user.keyboard('{Escape}')
  await waitFor(() => {
    expect(screen.getByRole('button', { name: 'Abrir' })).toHaveFocus()
  })
})
