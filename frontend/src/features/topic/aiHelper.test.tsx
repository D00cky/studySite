import { screen, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import type { Attempt, TopicWorkspace } from '../../api/types'
import { emptyWorkspace, topicPage } from '../../test/fixtures'
import { signedIn } from '../../test/handlers'
import { renderApp } from '../../test/render'
import { server } from '../../test/server'

const attempt: Attempt = {
  id: 'a1', topicId: 'compilation-pipeline', exerciseId: 'ex-pipeline-stages', prediction: '-c gera um .o',
  notes: 'Rodei gcc -c e veio erro.', status: 'in_progress', startedAt: '', updatedAt: '',
}

function setup(overrides: Partial<TopicWorkspace> = {}) {
  const workspace = { ...emptyWorkspace, ...overrides }
  server.use(...signedIn())
  server.use(
    http.get('/api/curriculum/topics/compilation-pipeline', () => HttpResponse.json(topicPage)),
    http.get('/api/me/topics/compilation-pipeline', () => HttpResponse.json(workspace)),
  )
}

async function openHelper() {
  setup({ attempts: [attempt] })
  const utils = renderApp('/topicos/compilation-pipeline')
  const exercise = await screen.findByRole('region', { name: 'Tentativa em andamento' })
  const helper = within(exercise).getByRole('region', { name: 'Pedir ajuda a uma IA' })
  return { ...utils, helper }
}

describe('pedir ajuda a uma IA externa', () => {
  it('só aparece depois de começar o exercício', async () => {
    setup()
    renderApp('/topicos/compilation-pipeline')
    const exercise = await screen.findByRole('region', { name: 'Exercício' })
    expect(within(exercise).queryByRole('region', { name: 'Pedir ajuda a uma IA' })).not.toBeInTheDocument()
    expect(within(exercise).getByText(/Comece o exercício e escreva sua previsão antes de pedir ajuda a uma IA/)).toBeInTheDocument()
  })

  it('monta um prompt com o contexto do tópico, a política da etapa e o pedido de verificação', async () => {
    const { user, helper } = await openHelper()
    await user.click(within(helper).getByRole('radio', { name: /Explicar um erro/ }))
    await user.type(within(helper).getByLabelText('Saída ou erro (opcional)'), 'undefined reference to main')

    const prompt = within(helper).getByLabelText('Prompt para copiar').textContent ?? ''
    expect(prompt).toContain('O pipeline de compilação')
    expect(prompt).toContain('Parar em cada etapa')
    expect(prompt).toContain('-c gera um .o')
    expect(prompt).toContain('Rodei gcc -c e veio erro.')
    expect(prompt).toContain('undefined reference to main')
    expect(prompt).toContain('Explique o que essa mensagem significa')
    expect(prompt).toContain('Não me dê a solução completa')
    expect(prompt).toContain('Tente manualmente antes.')
    expect(prompt).toContain('Como eu posso verificar')

    await user.click(within(helper).getByRole('button', { name: 'Copiar prompt' }))
    expect(await navigator.clipboard.readText()).toBe(prompt)
  })

  it('registra o uso com ferramenta, pergunta, trecho da resposta e a verificação feita', async () => {
    let body: Record<string, string> = {}
    server.use(
      http.patch('/api/me/attempts/a1', async ({ request }) => {
        body = (await request.json()) as Record<string, string>
        return HttpResponse.json({ ...attempt, aiAssistance: body.aiAssistance })
      }),
    )
    const { user, helper } = await openHelper()
    await user.click(within(helper).getByRole('radio', { name: /Próxima dica/ }))
    await user.selectOptions(within(helper).getByLabelText('Onde você perguntou'), 'Gemini')
    await user.type(within(helper).getByLabelText('Trecho da resposta que você usou'), 'Olhe a etapa de linking.')
    await user.type(within(helper).getByLabelText('Com suas palavras, o que você entendeu'), 'Sem main o linker falha.')
    await user.click(within(helper).getByRole('checkbox', { name: /Rodei ou testei/ }))
    await user.type(within(helper).getByLabelText('Como você verificou'), 'gcc soma.o sem main deu o mesmo erro')
    await user.click(within(helper).getByRole('button', { name: 'Registrar uso da IA' }))

    expect(body.aiAssistance).toContain('Gemini')
    expect(body.aiAssistance).toContain('Próxima dica')
    expect(body.aiAssistance).toContain('Olhe a etapa de linking.')
    expect(body.aiAssistance).toContain('Sem main o linker falha.')
    expect(body.aiAssistance).toContain('[x] Rodei ou testei')
    expect(body.aiAssistance).toContain('[ ] Conferi numa fonte')
    expect(body.aiAssistance).toContain('gcc soma.o sem main deu o mesmo erro')
    expect(await within(helper).findByText('Uso registrado na tentativa.')).toBeInTheDocument()
  })

  it('não registra sem a explicação com suas palavras', async () => {
    const { user, helper } = await openHelper()
    await user.type(within(helper).getByLabelText('Trecho da resposta que você usou'), 'Olhe o linking.')
    await user.click(within(helper).getByRole('button', { name: 'Registrar uso da IA' }))
    expect(within(helper).getByLabelText('Com suas palavras, o que você entendeu')).toBeInvalid()
  })
})
