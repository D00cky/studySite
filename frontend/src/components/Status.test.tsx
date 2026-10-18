import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import { EmptyState, Loading } from './Status'

describe('estados de carregamento e vazio', () => {
  it('carregando mostra um esqueleto decorativo com status acessível', () => {
    const { container } = render(<Loading />)
    expect(screen.getByRole('status', { name: 'Carregando…' })).toBeInTheDocument()
    const skeleton = container.querySelector('.skeleton')!
    expect(skeleton).toHaveAttribute('aria-hidden', 'true')
  })

  it('o esqueleto de cards desenha a quantidade pedida', () => {
    const { container } = render(<Loading variant="cards" count={4} />)
    expect(container.querySelectorAll('.skeleton-card')).toHaveLength(4)
  })

  it('estado vazio explica e convida para a próxima ação', () => {
    render(
      <MemoryRouter>
        <EmptyState title="Nenhuma evidência ainda" action={{ to: '/roadmap', label: 'Escolher um tópico' }}>
          Evidência é o que mostra o que você fez.
        </EmptyState>
      </MemoryRouter>,
    )
    expect(screen.getByText('Nenhuma evidência ainda')).toBeInTheDocument()
    expect(screen.getByText('Evidência é o que mostra o que você fez.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Escolher um tópico' })).toHaveAttribute('href', '/roadmap')
  })
})
