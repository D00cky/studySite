import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { signedIn } from '../../test/handlers'
import { renderApp } from '../../test/render'
import { server } from '../../test/server'

describe('como estudamos', () => {
  it('torna visíveis o ciclo, a política de IA, os modos semanais e os papéis', async () => {
    server.use(...signedIn())
    renderApp('/como-estudamos')
    const loop = await screen.findByRole('region', { name: 'Ciclo de aprendizagem' })
    expect(within(loop).getAllByRole('listitem').map((li) => li.textContent)).toEqual([
      expect.stringContaining('Pergunta'),
      expect.stringContaining('Previsão'),
    ])
    const ai = screen.getByRole('region', { name: 'Política de IA' })
    expect(within(ai).getByText('Tente manualmente antes.')).toBeInTheDocument()
    const modes = screen.getByRole('region', { name: 'Rotina flexível' })
    expect(within(modes).getByText(/Resgate excepcional/)).toBeInTheDocument()
    expect(within(modes).getByText(/não conclui marcos/i)).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Papéis nas sessões do time' })).toHaveTextContent('Autor(a)')
  })
})
