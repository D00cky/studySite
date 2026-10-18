import { screen, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import type { Evidence, TopicWorkspace } from '../../api/types'
import { emptyWorkspace, topicPage } from '../../test/fixtures'
import { signedIn } from '../../test/handlers'
import { renderApp } from '../../test/render'
import { server } from '../../test/server'

let workspace: TopicWorkspace

function setup(overrides: Partial<TopicWorkspace> = {}, page = topicPage) {
  workspace = { ...emptyWorkspace, ...overrides }
  server.use(...signedIn())
  server.use(
    http.get('/api/curriculum/topics/compilation-pipeline', () => HttpResponse.json(page)),
    http.get('/api/me/topics/compilation-pipeline', () => HttpResponse.json(workspace)),
  )
}

const evidence: Evidence = {
  id: 'e1', userId: 'u-lia', authorName: 'Lia', topicId: 'compilation-pipeline', kind: 'repository',
  title: 'Etapas do pipeline', body: '', url: 'https://example.test/repo', visibility: 'private',
  createdAt: '2026-10-18T10:00:00Z', updatedAt: '2026-10-18T10:00:00Z',
}

describe('página de tópico — conteúdo', () => {
  it('mostra o essencial primeiro e o resto em seções expansíveis', async () => {
    setup()
    renderApp('/topicos/compilation-pipeline')
    expect(await screen.findByRole('heading', { level: 1, name: 'O pipeline de compilação' })).toBeInTheDocument()
    expect(screen.getByText('Separar e observar cada etapa.')).toBeInTheDocument()
    expect(screen.getByText(/economiza horas/)).toBeInTheDocument()
    for (const section of ['Explicação', 'Equívocos comuns', 'Exercício: Parar em cada etapa', 'Experimento: Comparar níveis de otimização', 'Perguntas para explicar', 'Como saber que terminei']) {
      const summary = screen.getByText(section, { selector: 'summary' })
      expect(summary.closest('details')).not.toHaveAttribute('open')
    }
  })

  it('renderiza código inline no primeiro passo e na dica da previsão', async () => {
    setup()
    renderApp('/topicos/compilation-pipeline')
    expect(await screen.findByText('gcc -c hello.c', { selector: 'code' })).toBeInTheDocument()
    const hint = screen.getByLabelText('Sua previsão').getAttribute('aria-describedby')!
    expect(document.getElementById(hint)!.querySelector('code')).toHaveTextContent('-E')
  })

  it('as caixas de texto sugerem o que escrever', async () => {
    setup()
    renderApp('/topicos/compilation-pipeline')
    expect(await screen.findByLabelText('Sua previsão')).toHaveAttribute('placeholder', expect.stringMatching(/^Eu espero que/))
    expect(screen.getByLabelText('O que a evidência mostra')).toHaveAttribute('placeholder', expect.stringContaining('saída'))
  })

  it('tem abas de navegação para as partes da lição', async () => {
    setup()
    renderApp('/topicos/compilation-pipeline')
    const tabs = await screen.findByRole('navigation', { name: 'Nesta lição' })
    expect(within(tabs).getByRole('link', { name: 'kit.sh' })).toHaveAttribute('href', '#kit-title')
    expect(within(tabs).getByRole('link', { name: 'pratica' })).toHaveAttribute('href', '#trabalho')
    expect(document.getElementById('kit-title')).not.toBeNull()
    expect(document.getElementById('trabalho')).not.toBeNull()
  })

  it('orienta sobre pré-requisitos sem bloquear o acesso', async () => {
    setup()
    renderApp('/topicos/compilation-pipeline')
    const guidance = await screen.findByRole('region', { name: 'Antes de começar' })
    expect(within(guidance).getByRole('link', { name: 'Terminal e shell' })).toHaveAttribute('href', '/topicos/terminal-shell')
    expect(screen.getByRole('button', { name: 'Começar exercício' })).toBeEnabled()
  })

  it('avisa quando a lição detalhada ainda está planejada', async () => {
    setup({}, { ...topicPage, topic: { ...topicPage.topic, status: 'planned', exercise: undefined, experiment: undefined } })
    renderApp('/topicos/compilation-pipeline')
    expect(await screen.findByText(/lição detalhada ainda está planejada/i)).toBeInTheDocument()
  })

  it('mostra o recurso inicial com seção e verificação', async () => {
    setup()
    renderApp('/topicos/compilation-pipeline')
    const res = await screen.findByRole('region', { name: 'Comece por aqui' })
    expect(within(res).getByText('Overall Options (Using the GNU Compiler Collection)')).toBeInTheDocument()
    expect(within(res).getByText(/-E · -S · -c · -o/)).toBeInTheDocument()
    expect(within(res).getByText(/Link verificado em/)).toBeInTheDocument()
  })
})

describe('página de tópico — drill-down 80/20', () => {
  it('mostra o kit mínimo como um script de terminal, antes do resto da lição', async () => {
    setup()
    renderApp('/topicos/compilation-pipeline')
    const kit = await screen.findByRole('region', { name: /Kit mínimo/ })
    const items = within(kit).getAllByRole('listitem')
    expect(items).toHaveLength(3)
    expect(within(items[0]!).getByText('gcc -Wall -Wextra -o prog prog.c', { selector: 'code' })).toBeInTheDocument()
    expect(items[0]).toHaveTextContent('Compilar e linkar com avisos ligados.')
    expect(within(items[2]!).getByText('.o', { selector: 'code' })).toBeInTheDocument()
    const startResource = screen.getByRole('region', { name: 'Comece por aqui' })
    expect(kit.compareDocumentPosition(startResource) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('mapeia o aprofundamento para depois, com quando usar e recurso', async () => {
    setup()
    renderApp('/topicos/compilation-pipeline')
    const summary = await screen.findByText(/Aprofundamento/, { selector: 'summary' })
    const details = summary.closest('details')!
    expect(details).not.toHaveAttribute('open')
    expect(within(details).getByText('Link-time optimization (LTO)')).toBeInTheDocument()
    expect(within(details).getByText(/builds de produção/)).toBeInTheDocument()
    expect(within(details).getByRole('link', { name: /Overall Options/ })).toHaveAttribute('href', topicPage.startResource!.url)
    expect(within(details).getByText('Formato ELF por dentro')).toBeInTheDocument()
  })
})

describe('página de tópico — mais para aprofundar', () => {
  it('reúne, recolhidos, vídeos e materiais extras da biblioteca', async () => {
    const extraVideo = { ...topicPage.startResource!, id: 'ben-eater-x', title: 'Ben Eater — Assembly', author: 'Ben Eater', format: 'video' as const, url: 'https://www.youtube.com/watch?v=abc123XYZ_0' }
    const extraDoc = { ...topicPage.startResource!, id: 'univesp-x', title: 'UNIVESP — Compiladores', author: 'UNIVESP', language: 'pt-BR' as const }
    setup({}, { ...topicPage, moreVideos: [extraVideo], moreResources: [extraDoc] })
    renderApp('/topicos/compilation-pipeline')
    const region = await screen.findByRole('region', { name: 'Mais para aprofundar' })
    const videos = within(region).getByText(/Mais vídeos \(1\)/, { selector: 'summary' }).closest('details')!
    expect(videos).not.toHaveAttribute('open')
    expect(within(videos).getByText('Ben Eater — Assembly')).toBeInTheDocument()
    const docs = within(region).getByText(/Leituras e materiais \(1\)/, { selector: 'summary' }).closest('details')!
    expect(within(docs).getByText('UNIVESP — Compiladores')).toBeInTheDocument()
  })

  it('não mostra a seção quando a biblioteca não tem nada além da lição', async () => {
    setup()
    renderApp('/topicos/compilation-pipeline')
    await screen.findByRole('heading', { level: 1 })
    expect(screen.queryByRole('region', { name: 'Mais para aprofundar' })).not.toBeInTheDocument()
  })
})

describe('página de tópico — livros de referência', () => {
  const book = {
    ...topicPage.startResource!, id: 'csapp-cap7-linking', title: 'Computer Systems: A Programmer\'s Perspective — Chapter 7: Linking',
    author: 'Randal E. Bryant e David R. O\'Hallaron', format: 'book' as const, access: 'paid' as const, section: '7 Linking',
  }
  const free = { ...book, id: 'free-book', title: 'Livro aberto', access: 'free' as const, section: undefined }

  it('lista os livros com capítulo e tipo de acesso', async () => {
    setup({}, { ...topicPage, books: [book, free] })
    renderApp('/topicos/compilation-pipeline')
    const section = await screen.findByRole('region', { name: 'Livros de referência' })
    const item = within(section).getByText(/Chapter 7: Linking/).closest('li')!
    expect(within(item).getByText(/7 Linking/)).toBeInTheDocument()
    expect(within(item).getByText('Pago')).toBeInTheDocument()
    expect(within(section).getByText('Livro aberto').closest('li')!).toHaveTextContent('Gratuito')
    expect(within(section).getByText(/biblioteca/i)).toBeInTheDocument()
  })

  it('não mostra a seção quando não há livros', async () => {
    setup()
    renderApp('/topicos/compilation-pipeline')
    await screen.findByRole('heading', { level: 1 })
    expect(screen.queryByRole('region', { name: 'Livros de referência' })).not.toBeInTheDocument()
  })
})

describe('página de tópico — vídeos', () => {
  const video = {
    ...topicPage.startResource!, id: 'cs61c-call', title: 'Lecture 12: Compilation, Assembly, Linking',
    author: 'UC Berkeley CS61C', url: 'https://www.youtube.com/watch?v=abc123XYZ_0', format: 'video' as const,
  }
  const playlist = { ...video, id: 'cs162-playlist', title: 'CS162 Lectures', url: 'https://www.youtube.com/playlist?list=PLxyz' }

  it('lista os vídeos com título e autor e só carrega o player ao clicar', async () => {
    setup({}, { ...topicPage, videos: [video, playlist] })
    const { user } = renderApp('/topicos/compilation-pipeline')
    const section = await screen.findByRole('region', { name: 'Assista' })
    expect(within(section).getByText('Lecture 12: Compilation, Assembly, Linking')).toBeInTheDocument()
    expect(within(section).getAllByText('UC Berkeley CS61C').length).toBeGreaterThan(0)
    expect(section.querySelector('iframe')).toBeNull()
    await user.click(within(section).getByRole('button', { name: 'Assistir: Lecture 12: Compilation, Assembly, Linking' }))
    const frame = section.querySelector('iframe')!
    expect(frame.getAttribute('src')).toBe('https://www.youtube-nocookie.com/embed/abc123XYZ_0?autoplay=1')
    expect(frame).toHaveAttribute('title', 'Lecture 12: Compilation, Assembly, Linking')
    expect(within(section).getByRole('link', { name: /CS162 Lectures/ })).toHaveAttribute('href', 'https://www.youtube.com/playlist?list=PLxyz')
  })

  it('abre o player no minuto do trecho indicado', async () => {
    const segment = { ...video, id: 'seg', title: 'Aula — 23:10 Linking', url: 'https://www.youtube.com/watch?v=abc123XYZ_0&t=1390s', section: '23:10 Linking' }
    setup({}, { ...topicPage, videos: [segment] })
    const { user } = renderApp('/topicos/compilation-pipeline')
    const section = await screen.findByRole('region', { name: 'Assista' })
    expect(within(section).getByText(/a partir de 23:10/)).toBeInTheDocument()
    await user.click(within(section).getByRole('button', { name: /Assistir/ }))
    expect(section.querySelector('iframe')!.getAttribute('src')).toBe('https://www.youtube-nocookie.com/embed/abc123XYZ_0?start=1390&autoplay=1')
  })

  it('não mostra a seção quando o tópico não tem vídeos', async () => {
    setup({}, { ...topicPage, videos: [] })
    renderApp('/topicos/compilation-pipeline')
    await screen.findByRole('heading', { level: 1 })
    expect(screen.queryByRole('region', { name: 'Assista' })).not.toBeInTheDocument()
  })
})

describe('página de tópico — registros', () => {
  it('registra que abriu o recurso, deixando claro que isso não é domínio', async () => {
    let body: unknown
    setup()
    server.use(
      http.post('/api/me/resource-events', async ({ request }) => {
        body = await request.json()
        return HttpResponse.json({ id: 're1' }, { status: 201 })
      }),
    )
    const { user } = renderApp('/topicos/compilation-pipeline')
    const res = await screen.findByRole('region', { name: 'Comece por aqui' })
    expect(within(res).getByText(/não conta como domínio/i)).toBeInTheDocument()
    await user.click(within(res).getByRole('button', { name: 'Marcar como lido' }))
    expect(body).toEqual({ resourceId: 'gcc-overall-options', topicId: 'compilation-pipeline', kind: 'finished' })
  })

  it('começa o exercício registrando a previsão', async () => {
    let body: unknown
    setup()
    server.use(
      http.post('/api/me/attempts', async ({ request }) => {
        body = await request.json()
        workspace = {
          ...workspace,
          attempts: [{ id: 'a1', topicId: 'compilation-pipeline', exerciseId: 'ex-pipeline-stages', prediction: '-c gera .o', status: 'in_progress', startedAt: '', updatedAt: '' }],
        }
        return HttpResponse.json({ id: 'a1' }, { status: 201 })
      }),
    )
    const { user } = renderApp('/topicos/compilation-pipeline')
    await user.type(await screen.findByLabelText('Sua previsão'), '-c gera .o')
    await user.click(screen.getByRole('button', { name: 'Começar exercício' }))
    expect(body).toEqual({ topicId: 'compilation-pipeline', prediction: '-c gera .o' })
    expect(await screen.findByRole('heading', { name: 'Tentativa em andamento' })).toBeInTheDocument()
  })

  it('salva evidência ligada à tentativa, com assistência de IA', async () => {
    let body: unknown
    setup({
      attempts: [{ id: 'a1', topicId: 'compilation-pipeline', exerciseId: 'ex-pipeline-stages', status: 'in_progress', startedAt: '', updatedAt: '' }],
    })
    server.use(
      http.post('/api/evidence', async ({ request }) => {
        body = await request.json()
        workspace = { ...workspace, evidence: [evidence] }
        return HttpResponse.json(evidence, { status: 201 })
      }),
    )
    const { user } = renderApp('/topicos/compilation-pipeline')
    const form = await screen.findByRole('form', { name: 'Registrar evidência' })
    await user.type(within(form).getByLabelText('Título'), 'Etapas do pipeline')
    await user.selectOptions(within(form).getByLabelText('Tipo'), 'repository')
    await user.type(within(form).getByLabelText('Link'), 'https://example.test/repo')
    await user.type(within(form).getByLabelText(/O que a evidência mostra/), 'Saídas de file e nm')
    await user.type(within(form).getByLabelText(/Assistência de IA/), 'Pedi explicação do erro')
    await user.click(within(form).getByRole('button', { name: 'Salvar evidência' }))
    expect(body).toEqual({
      topicId: 'compilation-pipeline', attemptId: 'a1', kind: 'repository', title: 'Etapas do pipeline',
      url: 'https://example.test/repo', body: 'Saídas de file e nm', aiAssistance: 'Pedi explicação do erro', visibility: 'private',
    })
    expect(await screen.findByText('Etapas do pipeline', { selector: 'strong' })).toBeInTheDocument()
  })

  it('pede revisão de uma evidência ao grupo', async () => {
    let body: unknown
    setup({ evidence: [evidence] })
    server.use(
      http.post('/api/evidence/e1/review-requests', async ({ request }) => {
        body = await request.json()
        return HttpResponse.json({ request: { id: 'r1' } }, { status: 201 })
      }),
    )
    const { user } = renderApp('/topicos/compilation-pipeline')
    await user.click(await screen.findByRole('button', { name: 'Pedir revisão' }))
    await user.type(screen.getByLabelText('O que você quer que revisem?'), 'Minha explicação do linking está certa?')
    await user.click(screen.getByRole('button', { name: 'Enviar pedido' }))
    expect(body).toEqual({ groupId: 'g1', question: 'Minha explicação do linking está certa?' })
    expect(await screen.findByRole('link', { name: 'Ver pedido de revisão' })).toHaveAttribute('href', '/revisoes/r1')
  })

  it('registra autoavaliação', async () => {
    let body: unknown
    setup()
    server.use(
      http.post('/api/me/self-assessments', async ({ request }) => {
        body = await request.json()
        return HttpResponse.json({ id: 'sa1' }, { status: 201 })
      }),
    )
    const { user } = renderApp('/topicos/compilation-pipeline')
    await user.click(await screen.findByLabelText(/Explico/))
    await user.click(screen.getByRole('button', { name: 'Salvar autoavaliação' }))
    expect(body).toEqual({ topicId: 'compilation-pipeline', level: 2 })
  })
})
