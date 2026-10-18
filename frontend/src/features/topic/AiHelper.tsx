import { useMemo, useState, type FormEvent } from 'react'
import { usePolicies, useUpdateAttempt } from '../../api/queries'
import type { Attempt, Policies, Stage, Topic } from '../../api/types'
import { CopyButton } from '../../components/CopyButton'
import { Select, TextArea } from '../../components/Field'
import { ErrorMessage } from '../../components/Status'
import { formatDate } from '../../lib/format'

type Mode = 'hint' | 'error' | 'review' | 'quiz'

const MODES: { id: Mode; label: string; description: string; ask: string }[] = [
  {
    id: 'hint',
    label: 'Próxima dica',
    description: 'Só a próxima pista, sem a solução.',
    ask: 'Me dê só a próxima pista, em uma ou duas frases. Se eu precisar de mais, eu peço a seguinte.',
  },
  {
    id: 'error',
    label: 'Explicar um erro',
    description: 'O que a mensagem significa e onde olhar.',
    ask: 'Explique o que essa mensagem significa, qual etapa ou mecanismo a produz e onde eu devo olhar, sem corrigir o código por mim.',
  },
  {
    id: 'review',
    label: 'Revisar minha tentativa',
    description: 'Lacunas na previsão e no que tentei.',
    ask: 'Revise minha previsão e o que já tentei. Aponte o que está errado ou faltando e por quê, sem reescrever tudo por mim.',
  },
  {
    id: 'quiz',
    label: 'Me fazer perguntas',
    description: 'Treino socrático antes da revisão.',
    ask: 'Me faça 3 perguntas sobre este tópico, uma por vez, esperando minha resposta antes da próxima. Corrija cada resposta explicando o porquê.',
  },
]

const TOOLS = ['ChatGPT', 'Gemini', 'Claude', 'Copilot', 'DeepSeek', 'Outra']

const today = () => formatDate(new Date().toISOString())

// Etapas 1–8 são fundamentos (política "foundations"); o resto, inclusive os ramos, é aplicação.
const isFoundations = (stage: Stage) => stage.kind === 'core' && stage.order <= 8

function checklist(foundations: boolean) {
  return [
    'Rodei ou testei e o resultado confere',
    'Conferi numa fonte da lição ou na documentação oficial',
    'Consigo explicar sem olhar a resposta',
    foundations ? 'A resposta não entregou a solução pronta do exercício' : 'Li e entendi cada linha que vou usar',
  ]
}

function buildPrompt({
  topic,
  stage,
  attempt,
  mode,
  output,
  policies,
}: {
  topic: Topic
  stage: Stage
  attempt: Attempt
  mode: Mode
  output: string
  policies?: Policies
}) {
  const foundations = isFoundations(stage)
  const policy = policies?.aiPolicy.find((p) => p.id === (foundations ? 'foundations' : 'applied'))
  const lines = [
    'Estou estudando ciência da computação e quero ajuda com método, não a resposta pronta.',
    '',
    '## Contexto',
    `- Tópico: ${topic.title} (etapa ${stage.order}: ${stage.title})`,
    `- Objetivo do tópico: ${topic.objective}`,
    ...(topic.exercise ? [`- Exercício: ${topic.exercise.title}`] : []),
    ...(attempt.prediction ? [`- Minha previsão: ${attempt.prediction}`] : []),
    ...(attempt.notes ? [`- O que já tentei: ${attempt.notes}`] : []),
    ...(output.trim() ? ['', '## Saída ou erro', '```', output.trim(), '```'] : []),
    '',
    '## O que eu quero',
    MODES.find((m) => m.id === mode)!.ask,
    '',
    '## Regras',
    foundations
      ? '- Não me dê a solução completa nem o código pronto do exercício: estou praticando essa habilidade.'
      : '- Pode sugerir código, mas explique cada parte; eu vou revisar e testar antes de usar.',
    ...(policy?.expectations ?? []).map((e) => `- ${e}`),
    '- Responda em português do Brasil, mantendo os termos técnicos em inglês.',
    '- Se não tiver certeza de algo, diga.',
    '',
    '## No final da resposta',
    '1. Como eu posso verificar o que você disse por conta própria (um comando para rodar, um teste ou a seção da documentação oficial).',
    '2. O que na sua resposta é menos seguro ou pode variar (versão, sistema, compilador).',
  ]
  return lines.join('\n')
}

/** Antes da tentativa: a seção aparece, mas só explica como liberar (a política pede tentar antes). */
export function AiHelperLocked() {
  return (
    <section className="ai-helper ai-helper-locked" aria-labelledby="ai-helper-title">
      <h3 id="ai-helper-title">Pedir ajuda a uma IA</h3>
      <p className="small muted">
        Disponível depois de começar o exercício: escreva sua previsão e clique em “Começar exercício”. Aí o site monta
        um pedido com o contexto certo para você colar no ChatGPT, Gemini, Claude ou outra IA, e ajuda a verificar a
        resposta.
      </p>
    </section>
  )
}

/**
 * Ajuda de IA sem integração: o site monta o prompt com contexto e regras da etapa,
 * a pessoa usa a IA que quiser e volta para verificar e registrar o que aproveitou.
 */
export function AiHelper({
  topic,
  stage,
  attempt,
  onRecorded,
}: {
  topic: Topic
  stage: Stage
  attempt: Attempt
  onRecorded: (aiAssistance: string) => void
}) {
  const { data: policies } = usePolicies()
  const update = useUpdateAttempt()
  const foundations = isFoundations(stage)
  const [mode, setMode] = useState<Mode>('hint')
  const [output, setOutput] = useState('')
  const [tool, setTool] = useState(TOOLS[0]!)
  const [excerpt, setExcerpt] = useState('')
  const [understood, setUnderstood] = useState('')
  const [checked, setChecked] = useState<string[]>([])
  const [howVerified, setHowVerified] = useState('')
  const [tooLong, setTooLong] = useState(false)
  const prompt = useMemo(
    () => buildPrompt({ topic, stage, attempt, mode, output, policies }),
    [topic, stage, attempt, mode, output, policies],
  )
  const modeLabel = MODES.find((m) => m.id === mode)!.label

  function record(e: FormEvent) {
    e.preventDefault()
    const entry = [
      `### IA: ${modeLabel} (${tool}, ${today()})`,
      `**Pedido:** ${modeLabel}, com prompt montado pelo site${output.trim() ? `; saída enviada: \`${output.trim().split('\n')[0]}\`` : ''}.`,
      '**Trecho usado:**',
      ...excerpt.trim().split('\n').map((l) => `> ${l}`),
      `**O que entendi:** ${understood.trim()}`,
      '**Verificação:**',
      ...checklist(foundations).map((item) => `- [${checked.includes(item) ? 'x' : ' '}] ${item}`),
      ...(howVerified.trim() ? [`**Como verifiquei:** ${howVerified.trim()}`] : []),
    ].join('\n')
    const aiAssistance = attempt.aiAssistance ? `${attempt.aiAssistance}\n\n${entry}` : entry
    if (aiAssistance.length > 4000) {
      setTooLong(true)
      return
    }
    setTooLong(false)
    update.mutate(
      { id: attempt.id, aiAssistance },
      {
        onSuccess: () => {
          onRecorded(aiAssistance)
          setExcerpt('')
          setUnderstood('')
          setChecked([])
          setHowVerified('')
        },
      },
    )
  }

  return (
    <section className="ai-helper" aria-labelledby="ai-helper-title">
      <h3 id="ai-helper-title">Pedir ajuda a uma IA</h3>
      <p className="small muted">
        Use a IA que quiser (ChatGPT, Gemini, Claude…), gratuita ou paga. O site não envia nada: ele monta o pedido com o
        contexto certo e, na volta, ajuda você a verificar e registrar o que aproveitou.
      </p>
      <details>
        <summary>Montar o pedido, colar a resposta e verificar</summary>
        <div className="details-body stack">
          <fieldset className="ai-modes">
            <legend>1. O que você quer da IA</legend>
            {MODES.map((m) => (
              <label key={m.id} className="choice">
                <input type="radio" name="ai-mode" value={m.id} checked={mode === m.id} onChange={() => setMode(m.id)} />
                <span>
                  <strong>{m.label}</strong> <span className="muted">· {m.description}</span>
                </span>
              </label>
            ))}
          </fieldset>
          <TextArea
            label="Saída ou erro (opcional)"
            placeholder="Cole a mensagem de erro ou a saída do comando"
            rows={2}
            value={output}
            onChange={(e) => setOutput(e.target.value)}
          />
          <div className="ai-prompt">
            <div className="code-bar">
              <span className="code-lang">prompt.md</span>
              <CopyButton text={prompt} label="Copiar prompt" />
            </div>
            <pre role="textbox" aria-readonly="true" aria-multiline="true" aria-label="Prompt para copiar" tabIndex={0}>
              {prompt}
            </pre>
          </div>
          <p className="hint">
            {foundations
              ? 'Etapa de fundamentos: o pedido proíbe solução pronta. Se a IA entregar mesmo assim, não use como evidência.'
              : 'Etapa de aplicação: a IA pode sugerir código, mas você continua dono da validação.'}
          </p>

          <form className="stack" aria-label="Registrar uso da IA" onSubmit={record}>
            <p className="ai-step">2. Traga a resposta</p>
            <Select label="Onde você perguntou" value={tool} onChange={(e) => setTool(e.target.value)}>
              {TOOLS.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </Select>
            <TextArea
              label="Trecho da resposta que você usou"
              placeholder="Cole só a parte que ajudou, não a resposta inteira"
              required
              maxLength={1200}
              rows={3}
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
            />
            <TextArea
              label="Com suas palavras, o que você entendeu"
              placeholder="Explique sem copiar a resposta"
              required
              maxLength={600}
              rows={2}
              value={understood}
              onChange={(e) => setUnderstood(e.target.value)}
            />
            <fieldset>
              <legend>3. Verifique antes de confiar</legend>
              {checklist(foundations).map((item) => (
                <label key={item} className="choice">
                  <input
                    type="checkbox"
                    checked={checked.includes(item)}
                    onChange={(e) => setChecked(e.target.checked ? [...checked, item] : checked.filter((c) => c !== item))}
                  />
                  <span>{item}</span>
                </label>
              ))}
            </fieldset>
            <TextArea
              label="Como você verificou"
              placeholder="Ex.: rodei gcc -c soma.c e o erro sumiu; conferi na seção 3.2 do manual"
              maxLength={400}
              rows={2}
              value={howVerified}
              onChange={(e) => setHowVerified(e.target.value)}
            />
            {tooLong && (
              <p className="error" role="alert">
                O registro de IA desta tentativa está cheio. Registre este uso na evidência ou comece uma nova tentativa.
              </p>
            )}
            <ErrorMessage error={update.error} />
            {update.isSuccess && <p className="success">Uso registrado na tentativa.</p>}
            <button type="submit" className="button-secondary" disabled={update.isPending}>
              Registrar uso da IA
            </button>
          </form>
        </div>
      </details>
    </section>
  )
}
