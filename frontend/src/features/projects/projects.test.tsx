import { screen, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import type { GroupProjectDetail, Project } from '../../api/types'
import { signedIn } from '../../test/handlers'
import { renderApp } from '../../test/render'
import { server } from '../../test/server'

const project: Project = {
  id: 'c-task-cli', title: 'CLI de tarefas em C', status: 'authored', cumulative: false,
  topics: ['compilation-pipeline'], question: 'Como um programa recebe argumentos e comunica falhas?',
  prerequisites: ['terminal-shell'], minimalVersion: '`tasks add`, `tasks list` e `tasks done`.',
  extensions: ['Escrita atômica.'], constraints: ['Sem bibliotecas além da libc.'],
  milestones: [
    { id: 'm1-args', title: 'Argumentos e exit codes', description: 'Interpretar `argv`.', minutes: 25 },
    { id: 'm2-add-list', title: 'Adicionar e listar', minutes: 50 },
  ],
  edgeCases: ['Texto vazio.'], failureExperiments: ['Remover permissão de escrita.'], tools: ['gcc', 'strace'],
  acceptanceCriteria: ['Os dados persistem.'], evidence: ['Link do repositório.'], reviewQuestions: ['Por que stderr?'],
  practice: {
    guidance: 'Redigite o programa de referência à mão antes do marco 1.',
    references: [{ title: 'Write a Shell in C', author: 'Stephen Brennan', url: 'https://brennan.io/2015/01/16/write-a-shell-in-c/', language: 'C', license: 'MIT' }],
  },
}

const summaries = [
  { id: 'c-task-cli', title: 'CLI de tarefas em C', status: 'authored', cumulative: false, question: project.question, topics: [] },
  { id: 'task-platform', title: 'Projeto cumulativo: plataforma', status: 'planned', cumulative: true, question: 'Como evolui?', topics: [] },
]

const groupProject: GroupProjectDetail = {
  groupProject: { id: 'gp1', groupId: 'g1', projectId: 'c-task-cli', startedBy: 'u-gabriel', createdAt: '' },
  project,
  milestones: [{ milestoneId: 'm1-args', status: 'done', updatedBy: 'u-gabriel', updatedByName: 'Gabriel', updatedAt: '' }],
  contributions: [
    { id: 'e9', userId: 'u-gabriel', authorName: 'Gabriel', groupId: 'g1', projectId: 'c-task-cli', milestoneId: 'm1-args', kind: 'repository', title: 'Parser de argv', body: '', url: 'https://example.test/pr/1', visibility: 'group', createdAt: '', updatedAt: '' },
  ],
}

describe('projetos', () => {
  it('lista projetos sinalizando o cumulativo e os planejados', async () => {
    server.use(...signedIn())
    server.use(http.get('/api/curriculum/projects', () => HttpResponse.json(summaries)))
    renderApp('/projetos')
    const platform = (await screen.findByRole('link', { name: 'Projeto cumulativo: plataforma' })).closest('li')!
    expect(within(platform).getByText('Cumulativo')).toBeInTheDocument()
    expect(within(platform).getByText('Detalhes planejados')).toBeInTheDocument()
  })

  it('mostra a pergunta, a versão mínima e os marcos do projeto', async () => {
    server.use(...signedIn())
    server.use(http.get('/api/curriculum/projects/c-task-cli', () => HttpResponse.json(project)))
    renderApp('/projetos/c-task-cli')
    expect(await screen.findByRole('heading', { level: 1, name: 'CLI de tarefas em C' })).toBeInTheDocument()
    expect(screen.getByText(project.question)).toBeInTheDocument()
    expect(screen.getByText('tasks add', { selector: 'code' })).toBeInTheDocument()
    const milestones = screen.getByRole('region', { name: 'Marcos' })
    expect(within(milestones).getByText('Argumentos e exit codes')).toBeInTheDocument()
    expect(within(milestones).getByText(/25 min/)).toBeInTheDocument()
    expect(within(milestones).getByText('argv', { selector: 'code' })).toBeInTheDocument()
    expect(screen.getByText('Experimentos de falha', { selector: 'summary' })).toBeInTheDocument()
  })
})

describe('projeto — prática antes de construir', () => {
  it('mostra a referência para redigitar e os passos do método', async () => {
    server.use(...signedIn())
    server.use(http.get('/api/curriculum/projects/c-task-cli', () => HttpResponse.json(project)))
    renderApp('/projetos/c-task-cli')
    const region = await screen.findByRole('region', { name: 'Prática antes de construir' })
    expect(within(region).getByText(/Redigite o programa de referência/)).toBeInTheDocument()
    const ref = within(region).getByRole('link', { name: /Write a Shell in C/ })
    expect(ref).toHaveAttribute('href', 'https://brennan.io/2015/01/16/write-a-shell-in-c/')
    expect(within(region).getByText(/MIT/)).toBeInTheDocument()
    expect(await within(region).findByText('Redigitar à mão')).toBeInTheDocument()
    expect(within(region).getByRole('link', { name: /método completo/i })).toHaveAttribute('href', '/como-estudamos#pratica')
  })
})

describe('projeto do grupo', () => {
  function setup() {
    server.use(...signedIn())
    server.use(http.get('/api/group-projects/gp1', () => HttpResponse.json(groupProject)))
  }

  it('mostra marcos compartilhados e contribuições individuais, sem conceder proficiência', async () => {
    setup()
    renderApp('/projetos-do-grupo/gp1')
    expect(await screen.findByRole('heading', { level: 1, name: 'CLI de tarefas em C' })).toBeInTheDocument()
    expect(screen.getByText(/não marca ninguém como proficiente/i)).toBeInTheDocument()
    expect(screen.getByLabelText('Status de Argumentos e exit codes')).toHaveValue('done')
    expect(screen.getByLabelText('Status de Adicionar e listar')).toHaveValue('todo')
    const contributions = screen.getByRole('region', { name: 'Contribuições' })
    expect(within(contributions).getByText('Parser de argv')).toBeInTheDocument()
    expect(within(contributions).getByText(/Gabriel/)).toBeInTheDocument()
  })

  it('atualiza o status de um marco', async () => {
    let body: unknown
    setup()
    server.use(
      http.put('/api/group-projects/gp1/milestones/m2-add-list', async ({ request }) => {
        body = await request.json()
        return HttpResponse.json(groupProject)
      }),
    )
    const { user } = renderApp('/projetos-do-grupo/gp1')
    await user.selectOptions(await screen.findByLabelText('Status de Adicionar e listar'), 'in_progress')
    expect(body).toEqual({ status: 'in_progress' })
  })

  it('registra uma contribuição individual ligada ao marco', async () => {
    let body: unknown
    setup()
    server.use(
      http.post('/api/evidence', async ({ request }) => {
        body = await request.json()
        return HttpResponse.json({ id: 'e10' }, { status: 201 })
      }),
    )
    const { user } = renderApp('/projetos-do-grupo/gp1')
    const form = await screen.findByRole('form', { name: 'Registrar minha contribuição' })
    await user.selectOptions(within(form).getByLabelText('Marco'), 'm2-add-list')
    await user.type(within(form).getByLabelText('Título'), 'Listagem com ids')
    await user.selectOptions(within(form).getByLabelText('Tipo'), 'repository')
    await user.type(within(form).getByLabelText('Link'), 'https://example.test/pr/2')
    await user.type(within(form).getByLabelText(/O que você fez/), 'Implementei list')
    await user.click(within(form).getByRole('button', { name: 'Registrar contribuição' }))
    expect(body).toEqual({
      projectId: 'c-task-cli', milestoneId: 'm2-add-list', groupId: 'g1', visibility: 'group',
      kind: 'repository', title: 'Listagem com ids', url: 'https://example.test/pr/2', body: 'Implementei list',
    })
  })
})
