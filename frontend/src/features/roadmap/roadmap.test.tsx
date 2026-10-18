import { screen, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { emptyWorkspace, topicPage } from '../../test/fixtures'
import { signedIn } from '../../test/handlers'
import { renderApp } from '../../test/render'
import { server } from '../../test/server'

function setup() {
  server.use(...signedIn())
  server.use(
    http.get('/api/me/progress', () =>
      HttpResponse.json({ 'compilation-pipeline': { ...emptyWorkspace.progress, status: 'demonstrated', acceptedReviews: 1 } }),
    ),
  )
}

describe('roadmap — lista (?visao=lista)', () => {
  it('agrupa tópicos por etapa, na ordem, com ramos separados', async () => {
    setup()
    renderApp('/roadmap?visao=lista')
    const core = await screen.findByRole('region', { name: 'Tronco comum' })
    const stages = within(core).getAllByRole('heading', { level: 3 }).map((h) => h.textContent)
    expect(stages).toEqual([
      expect.stringContaining('Ferramentas e execução'),
      expect.stringContaining('C e compilação'),
      expect.stringContaining('Sistemas operacionais'),
    ])
    const branches = screen.getByRole('region', { name: 'Ramos opcionais' })
    expect(within(branches).getByRole('link', { name: 'HTML semântico e acessibilidade' })).toBeInTheDocument()
  })

  it('cada tópico é um link e mostra status do conteúdo e progresso pessoal', async () => {
    setup()
    renderApp('/roadmap?visao=lista')
    const link = await screen.findByRole('link', { name: 'O pipeline de compilação' })
    expect(link).toHaveAttribute('href', '/topicos/compilation-pipeline')
    const item = link.closest('li')!
    expect(within(item).getByText('Demonstrado')).toBeInTheDocument()
    const planned = screen.getByRole('link', { name: 'Processos e syscalls' }).closest('li')!
    expect(within(planned).getByText('Lição planejada')).toBeInTheDocument()
  })

  it('busca sem diferenciar acentos', async () => {
    setup()
    const { user } = renderApp('/roadmap?visao=lista')
    await user.type(await screen.findByLabelText('Buscar tópico'), 'compilacao')
    expect(screen.getByRole('link', { name: 'O pipeline de compilação' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Terminal e shell' })).not.toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('1 tópico')
  })

  it('filtra por etapa e por lições completas', async () => {
    setup()
    const { user } = renderApp('/roadmap?visao=lista')
    await user.selectOptions(await screen.findByLabelText('Etapa'), 's01-tools')
    expect(screen.getByRole('link', { name: 'Terminal e shell' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'O pipeline de compilação' })).not.toBeInTheDocument()

    await user.selectOptions(screen.getByLabelText('Etapa'), '')
    await user.click(screen.getByLabelText('Só lições completas'))
    expect(screen.queryByRole('link', { name: 'Processos e syscalls' })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'O pipeline de compilação' })).toBeInTheDocument()
  })
})

describe('roadmap — dependências (?visao=grafo)', () => {
  it('alterna para o grafo de dependências e guarda a visão na URL', async () => {
    setup()
    const { user, router } = renderApp('/roadmap')
    await user.click(await screen.findByRole('button', { name: 'Dependências' }))
    expect(screen.getByRole('button', { name: 'Dependências' })).toHaveAttribute('aria-pressed', 'true')
    expect(router.state.location.search).toBe('?visao=grafo')
  })

  it('seleciona um nó pelo teclado e mostra dependências', async () => {
    setup()
    const { user } = renderApp('/roadmap?visao=grafo')
    const node = await screen.findByRole('button', { name: /O pipeline de compilação/ })
    node.focus()
    await user.keyboard('{Enter}')
    const details = screen.getByRole('region', { name: 'Tópico selecionado' })
    expect(within(details).getByRole('link', { name: 'Terminal e shell' })).toBeInTheDocument()
    expect(within(details).getByRole('link', { name: 'Processos e syscalls' })).toBeInTheDocument()
    expect(within(details).getByRole('link', { name: 'Abrir tópico' })).toHaveAttribute('href', '/topicos/compilation-pipeline')
  })
})

describe('roadmap — trilha (visão padrão, inspirada no roadmap.sh)', () => {
  it('mostra as etapas como nós numerados ao longo da trilha, com progresso por etapa', async () => {
    setup()
    renderApp('/roadmap')
    expect(await screen.findByRole('button', { name: 'Trilha' })).toHaveAttribute('aria-pressed', 'true')
    const trail = screen.getByRole('list', { name: 'Trilha do tronco comum' })
    const stages = within(trail).getAllByRole('heading', { level: 3 }).map((h) => h.textContent)
    expect(stages).toEqual([
      expect.stringContaining('Ferramentas e execução'),
      expect.stringContaining('C e compilação'),
      expect.stringContaining('Sistemas operacionais'),
    ])
    const cStage = within(trail).getByRole('heading', { level: 3, name: /C e compilação/ }).closest('li')!
    expect(cStage).toHaveTextContent('1/1 demonstrados')
    expect(screen.getByRole('list', { name: 'Ramos opcionais' })).toBeInTheDocument()
  })

  it('cada tópico mostra seu estado de progresso no nome acessível', async () => {
    setup()
    renderApp('/roadmap')
    expect(await screen.findByRole('button', { name: /O pipeline de compilação.*Demonstrado/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Processos e syscalls.*lição planejada/ })).toBeInTheDocument()
  })

  it('abre um painel lateral com o resumo do tópico e fecha com Esc', async () => {
    setup()
    server.use(http.get('/api/curriculum/topics/compilation-pipeline', () => HttpResponse.json(topicPage)))
    const { user } = renderApp('/roadmap')
    await user.click(await screen.findByRole('button', { name: /O pipeline de compilação/ }))
    const panel = await screen.findByRole('dialog', { name: 'O pipeline de compilação' })
    expect(within(panel).getByText('Separar e observar cada etapa.')).toBeInTheDocument()
    expect(within(panel).getByRole('link', { name: 'Abrir lição' })).toHaveAttribute('href', '/topicos/compilation-pipeline')
    expect(within(panel).getByRole('link', { name: 'Terminal e shell' })).toBeInTheDocument()
    expect(within(panel).getByRole('heading', { name: /O essencial/ })).toBeInTheDocument()
    expect(within(panel).getByText(/undefined reference/)).toBeInTheDocument()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
