import type {
  ContinueView,
  GroupDetail,
  Me,
  Policies,
  Resource,
  Roadmap,
  TopicPage,
  TopicWorkspace,
} from '../api/types'

export const me: Me = {
  id: 'u-lia',
  email: 'lia@example.test',
  displayName: 'Lia',
  weeklyMode: 'compact',
  groups: [{ id: 'g1', name: 'Fundamentos', role: 'learner' }],
}

export const roadmap: Roadmap = {
  stages: [
    { id: 's01-tools', order: 1, kind: 'core', title: 'Ferramentas e execução', summary: 'Terminal e Git.', status: 'authored', dependsOn: [], mathThreads: [], crossCutting: [] },
    { id: 's03-c-compilation', order: 3, kind: 'core', title: 'C e compilação', summary: 'Do fonte ao executável.', status: 'authored', dependsOn: ['s01-tools'], mathThreads: [], crossCutting: [] },
    { id: 's07-operating-systems', order: 7, kind: 'core', title: 'Sistemas operacionais', summary: 'Processos e syscalls.', status: 'planned', dependsOn: ['s03-c-compilation'], mathThreads: [], crossCutting: [] },
    { id: 'b-frontend', order: 101, kind: 'branch', title: 'Ramo: fundamentos de frontend', summary: 'HTML, CSS, JS.', status: 'planned', dependsOn: ['s01-tools'], mathThreads: [], crossCutting: [] },
  ],
  topics: [
    { id: 'terminal-shell', stage: 's01-tools', title: 'Terminal e shell', status: 'authored', objective: 'Usar o shell.', prerequisites: [], related: [] },
    { id: 'compilation-pipeline', stage: 's03-c-compilation', title: 'O pipeline de compilação', status: 'authored', objective: 'Separar cada etapa.', prerequisites: ['terminal-shell'], related: [] },
    { id: 'processes-syscalls', stage: 's07-operating-systems', title: 'Processos e syscalls', status: 'planned', objective: 'fork, exec e wait.', prerequisites: ['compilation-pipeline'], related: [] },
    { id: 'semantic-html-accessibility', stage: 'b-frontend', title: 'HTML semântico e acessibilidade', status: 'planned', objective: 'Estruturar páginas.', prerequisites: ['terminal-shell'], related: [] },
  ],
}

export const resource: Resource = {
  id: 'gcc-overall-options',
  title: 'Overall Options (Using the GNU Compiler Collection)',
  author: 'GNU Project',
  url: 'https://gcc.gnu.org/onlinedocs/gcc/Overall-Options.html',
  language: 'en',
  format: 'documentation',
  difficulty: 'intermediate',
  topics: ['compilation-pipeline'],
  prerequisites: [],
  why: 'Documentação oficial das opções -E, -S, -c e -o.',
  section: '-E · -S · -c · -o',
  access: 'free',
  priority: 'core',
  verification: { status: 'verified', checkedOn: '2026-10-18' },
}

export const pendingResource: Resource = {
  ...resource,
  id: 'teach-yourself-cs-pt',
  title: 'TeachYourselfCS-PT (tradução comunitária)',
  author: 'Clemens Schrage (tradução)',
  url: 'https://github.com/Clemensss/TeachYourselfCS-PT/blob/master/TeachYourselfCS-PT.md',
  language: 'pt-BR',
  format: 'article',
  difficulty: 'intro',
  topics: ['terminal-shell'],
  section: undefined,
  priority: 'optional',
  verification: { status: 'pending', note: 'Conteúdo ainda não aberto.' },
}

export const topicPage: TopicPage = {
  topic: {
    id: 'compilation-pipeline',
    stage: 's03-c-compilation',
    title: 'O pipeline de compilação',
    status: 'authored',
    objective: 'Separar e observar cada etapa.',
    whyItMatters: 'Distinguir erro de compilação de erro de linking economiza horas.',
    prerequisites: ['terminal-shell'],
    related: [],
    mathThreads: [],
    explanation: 'Compilar não é executar.',
    misconceptions: [{ claim: 'Compilar também executa.', correction: 'Compilar produz um arquivo.' }],
    resources: { start: 'gcc-overall-options', deeper: [] },
    exercise: {
      id: 'ex-pipeline-stages',
      title: 'Parar em cada etapa',
      prediction: 'Para cada comando (`-E`, `-c`), escreva que arquivo será gerado.',
      steps: ['Escreva soma.c.', 'Gere cada etapa.'],
      checks: ['Você explica o tipo de cada arquivo.'],
    },
    experiment: { title: 'Comparar níveis de otimização', steps: ['Gere assembly com -O0 e -O2.'], observe: ['Quantas instruções.'] },
    reflectionQuestions: ['Como distinguir erro de compilação de linking?'],
    completionCriteria: ['Gera e identifica os arquivos de todas as etapas.'],
    evidencePrompts: ['Comandos de cada etapa com a saída de file e nm.'],
    firstAction: 'Rode `gcc -c hello.c` e `file hello.o`.',
  },
  stage: roadmap.stages[1]!,
  startResource: resource,
  deeperResources: [],
  prerequisites: [roadmap.topics[0]!],
  unlocks: [roadmap.topics[2]!],
  related: [],
  projects: [{ id: 'c-task-cli', title: 'CLI de tarefas em C', status: 'authored', cumulative: false, question: 'Como...', topics: ['compilation-pipeline'] }],
}

export const emptyWorkspace: TopicWorkspace = {
  progress: { topicId: 'compilation-pipeline', status: 'not_started', resourcesOpened: 0, resourcesFinished: 0, attempts: 0, submittedAttempts: 0, evidence: 0, sharedEvidence: 0, acceptedReviews: 0 },
  missingPrerequisites: [{ topicId: 'terminal-shell', title: 'Terminal e shell', status: 'not_started', objective: 'Usar o shell.', firstAction: 'Rode echo $PATH.' }],
  resourceEvents: [],
  attempts: [],
  evidence: [],
  selfAssessments: [],
  notes: [],
}

export const continueView: ContinueView = {
  nextAction: { kind: 'start_topic', text: 'Rode echo $PATH e conte os diretórios.', topicId: 'terminal-shell' },
  suggestedTopic: { topicId: 'terminal-shell', title: 'Terminal e shell', reason: 'Pré-requisitos com base suficiente e ainda não iniciado.' },
  changesRequested: [],
  recentFeedback: [],
  reviewsToGive: 0,
  weeklyMode: { id: 'compact', title: 'Compacto', time: 'Cerca de 90 minutos por semana', description: 'Um ciclo curto.', completesMilestones: true },
}

export const policies: Policies = {
  learningLoop: [
    { id: 'question', title: 'Pergunta', description: 'Formule o que quer entender.' },
    { id: 'prediction', title: 'Previsão', description: 'Escreva o que espera.' },
  ],
  aiPolicy: [{ id: 'foundations', title: 'Fundamentos (etapas 1–8)', allowed: ['Pedir explicação.'], expectations: ['Tente manualmente antes.'] }],
  weeklyModes: [
    { id: 'survival', title: 'Sobrevivência', time: 'Duas sessões de 25 minutos', description: 'Mantém o contato.', completesMilestones: true },
    { id: 'compact', title: 'Compacto', time: 'Cerca de 90 minutos por semana', description: 'Um ciclo curto.', completesMilestones: true },
    { id: 'rescue', title: 'Resgate excepcional', time: '10 minutos', description: 'Rode algo e deixe uma nota.', completesMilestones: false },
  ],
  sessionTemplate: [
    { title: 'Recordar e prever', minutes: 5, description: 'Releia sua nota.' },
    { title: 'Evidência e próxima ação', minutes: 3, description: 'Registre.' },
  ],
  sessionRoles: [{ id: 'author', title: 'Autor(a)', description: 'Explica a implementação.' }],
  selfAssessmentLevels: [
    { level: 0, title: 'Ainda não comecei', description: '' },
    { level: 1, title: 'Reconheço', description: '' },
    { level: 2, title: 'Explico', description: '' },
    { level: 3, title: 'Implemento', description: '' },
    { level: 4, title: 'Depuro e ensino', description: '' },
  ],
  recordKinds: ['Consumo de recurso: não demonstra domínio.'],
}

export const group: GroupDetail = {
  id: 'g1',
  name: 'Fundamentos',
  myRole: 'learner',
  members: [
    { userId: 'u-gabriel', displayName: 'Gabriel', role: 'mentor' },
    { userId: 'u-lia', displayName: 'Lia', role: 'learner' },
  ],
  signals: { openReviews: 1, openBlockers: 1, wantHelp: 0, canHelp: 0 },
}
