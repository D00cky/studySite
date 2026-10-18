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

  it('apresenta o método de prática com as fontes do Akita citadas', async () => {
    server.use(...signedIn())
    renderApp('/como-estudamos')
    const region = await screen.findByRole('region', { name: /Prática deliberada/ })
    expect(region).toHaveAttribute('id', 'pratica')
    expect(within(region).getByText('Redigitar à mão')).toBeInTheDocument()
    expect(within(region).getByText(/Crie um novo diretório e redigite tudo do zero de novo/)).toBeInTheDocument()
    expect(within(region).getByRole('link', { name: '[Akitando] #69' })).toHaveAttribute('href', 'https://akitaonrails.com/2019/12/11/x/')
    expect(within(region).getByText('Redigitar não é colar.')).toBeInTheDocument()
  })
})
