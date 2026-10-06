import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it, vi } from 'vitest'
import { CartoonCheckbox } from './CartoonCheckbox'
import { BottomSheet } from './BottomSheet'
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
