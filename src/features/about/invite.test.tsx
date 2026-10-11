import { act, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DonationInvite } from './DonationInvite'
import { countVisit, inviteSeen, settleInvite } from './invite'

const visits = (count: number) => {
  localStorage.setItem('cartoon-check:visits', String(count))
}
const renderInvite = () =>
  render(
    <MemoryRouter>
      <DonationInvite />
    </MemoryRouter>,
  )
const wait = (ms: number) => {
  act(() => {
    vi.advanceTimersByTime(ms)
  })
}

beforeEach(() => {
  localStorage.clear()
  sessionStorage.clear()
  vi.useFakeTimers()
})
afterEach(() => {
  vi.useRealTimers()
})

describe('visit count', () => {
  it('counts one visit per opening of the app', () => {
    expect(countVisit()).toBe(1)
    expect(countVisit()).toBe(1)
    sessionStorage.clear()
    expect(countVisit()).toBe(2)
  })
})

describe('DonationInvite', () => {
  it('stays out of the way on the first visits', () => {
    renderInvite()
    wait(2000)
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.queryByRole('link', { name: 'Quero apoiar' })).toBeNull()
  })

  it('opens once on the fifth visit, locked for two seconds', () => {
    visits(4)
    const first = renderInvite()
    wait(1500)
    const decline = screen.getByRole('button', { name: 'Agora não' })
    expect(decline).toHaveAttribute('aria-disabled', 'true')
    fireEvent.click(decline)
    expect(screen.getByText('Que bom ter você por aqui!')).toBeInTheDocument()

    wait(2000)
    fireEvent.click(screen.getByRole('button', { name: 'Agora não' }))
    expect(
      screen.getByText('Tudo bem, obrigado mesmo assim!'),
    ).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Voltar' }))
    expect(screen.getByText('Que bom ter você por aqui!')).toBeInTheDocument()
    expect(inviteSeen()).toBe(true)

    first.unmount()
    sessionStorage.clear()
    renderInvite()
    wait(2000)
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('opens the sheet once more when the card is dismissed', () => {
    visits(2)
    const first = renderInvite()
    wait(1500)
    expect(screen.queryByRole('dialog')).toBeNull()
    fireEvent.click(
      screen.getByRole('button', { name: 'Dispensar o convite de apoio' }),
    )
    expect(screen.getByText('Que bom ter você por aqui!')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Quero apoiar' })).toBeNull()

    first.unmount()
    renderInvite()
    wait(2000)
    expect(screen.queryByRole('link', { name: 'Quero apoiar' })).toBeNull()
  })

  it('does not invite whoever already copied the Pix code', () => {
    visits(7)
    settleInvite()
    renderInvite()
    wait(2000)
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.queryByRole('link', { name: 'Quero apoiar' })).toBeNull()
  })
})
