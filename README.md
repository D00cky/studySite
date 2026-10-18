# StudySite

Plataforma para Gabriel e o time estudarem ciência da computação e engenharia de software juntos:
roadmap interativo, biblioteca curada, projetos que expõem mecanismos, registros individuais de
aprendizagem e revisões em equipe.

Ciclo de aprendizagem: **pergunta → previsão → estudo focado → implementação manual → experimento →
evidência → explicação → revisão.** Abrir um recurso nunca conta como domínio.

> **Status:** MVP completo — backend, frontend e currículo inteiro escritos.

## O que existe hoje

| Situação | O quê |
|---|---|
| ✅ Currículo completo | 16 etapas + 4 ramos com dependências explícitas; **84 tópicos, todos escritos** (explicação, equívocos comuns, exercício, experimento, reflexão, critérios de conclusão, evidências, kit mínimo e aprofundamento). Inclui a lição de *detecção e correção de erros* (paridade, checksum da internet, CRC, Hamming). |
| ✅ Biblioteca curada | **2.561 recursos**: 1.228 vídeos (Akitando, Ben Eater, Computerphile, 3Blue1Brown, aulas de Berkeley/MIT/CMU/Stanford recomendadas pelo Teach Yourself CS), 611 capítulos e livros clássicos (Tanenbaum, CLRS, Kurose, OSTEP, CS:APP… só links e capítulos, sem arquivos piratas), 508 em português. 1.541 apontam para o capítulo ou episódio exato e 331 vídeos abrem no minuto do assunto. Só 2 seguem `pending`. |
| ✅ Projetos | **14 projetos completos**, todos começando por *redigitar uma referência* (o "sentar e copiar código" do Akita): 7 laboratórios por etapa (CLI de tarefas em C, tabela hash, mini shell, processador de jobs, TCP/HTTP, PostgreSQL, interpretador), o projeto cumulativo e **6 "construa o seu"**: compilador, banco de dados com B-tree, Git, alocador de memória (malloc), emulador CHIP-8 e key-value distribuído com Raft. |
| ✅ Backend | API REST em Spring Boot com sessão, grupos com papéis mentor/aprendiz, registros individuais separados (consumo de recurso, tentativas, evidências, autoavaliação, revisão), revisões com feedback, notas, sessões de estudo com nota de retomada, painel "continue de onde parou", progresso individual e do grupo, sessões do time com papéis, projetos do grupo com marcos, sinais de ajuda e sugestões de recursos. |
| ✅ Frontend | SPA em React com visual de editor/terminal (escuro por padrão, tema claro opcional): roadmap em trilha no estilo roadmap.sh, lista e grafo; página de tópico com abas, kit mínimo, vídeos embutidos no minuto certo, capítulos de livros e "mais para aprofundar"; editor markdown nas evidências e notas; projetos em cards; painel com progresso por etapa; menu compacto no celular. |
| 🧪 Demonstração | Perfil `demo` cria `mentora@demo.local` e `aprendiz@demo.local` (senha `demo-senha-123`) num grupo. Só para uso local. |
| ⏳ Planejado | Tutor de IA opcional e notificações. Nenhum código enviado é executado no servidor. |

## Como uma lição é organizada

- **Kit mínimo (80/20):** de 3 a 7 comandos ou conceitos que resolvem a maior parte dos casos do dia a dia — no espírito do "com `git status`, `add`, `commit`, `pull` e `push` você já resolve 80%". Cada item diz para que serve.
- **Explicação, equívocos e exercício:** o mecanismo explicado com texto original, um exercício com previsão antes de rodar e um experimento que provoca falhas e observa com ferramentas (`strace`, `gdb`, `tcpdump`, `EXPLAIN`…).
- **Assista e leia:** vídeos que abrem no minuto do assunto e capítulos específicos de livros, em vez do livro inteiro.
- **Aprofundamento:** os outros 80% para depois, cada ponto com o motivo de estudá-lo e um recurso.
- **Mais para aprofundar:** o restante da biblioteca ligado ao tópico, montado automaticamente (essenciais primeiro, português primeiro).

## Stack e por quê

- **Java 25 + Spring Boot 4.1** — o time tem uma trilha de backend em Java; o próprio site vira exemplo do ramo *backend com Java e PostgreSQL*.
- **PostgreSQL 17** com **Flyway** (migrações SQL versionadas) e **JdbcClient** (SQL explícito, sem ORM) — as consultas ficam visíveis e servem de material para as etapas 10–11.
- **Spring Security + Spring Session JDBC** — sessões em cookie HttpOnly persistidas no banco (sobrevivem a reinícios), senhas com BCrypt, CSRF no padrão SPA.
- **Conteúdo em YAML** (`content/`) validado na inicialização — currículo separado da atividade das pessoas, com IDs estáveis.
- **Testcontainers** — testes de integração contra um PostgreSQL real.
- **mise** gerencia as versões de Java e Node (`mise.toml`).
- **Frontend: Vite + React 19 + TypeScript**, React Router e TanStack Query. SPA separada do backend (sem SSR); no dev, o Vite faz proxy de `/api` para o Spring, então a sessão e o CSRF funcionam na mesma origem. CSS próprio com tokens (tema escuro de editor por padrão e tema claro), foco visível e `prefers-reduced-motion`; markdown com `react-markdown` (sem HTML cru) e vídeos do YouTube via `youtube-nocookie`. Páginas carregam sob demanda e as bibliotecas ficam em chunks próprios.
- **Testes do frontend: Vitest + Testing Library + MSW** — consultas por papel e nome acessível, API simulada.

## Rodando localmente

Pré-requisitos: [mise](https://mise.jdx.dev/), Docker.

```fish
mise install                       # instala o Java 25 (temurin) definido em mise.toml
cp .env.example .env               # ajuste se necessário; .env não vai para o git
docker compose up -d db            # PostgreSQL em 127.0.0.1:5433

cd backend
mise exec -- ./mvnw spring-boot:run -Dspring-boot.run.profiles=demo   # com dados de demonstração
# ou, sem dados de demo:
mise exec -- ./mvnw spring-boot:run
```

A API sobe em `http://localhost:8080`. Migrações rodam automaticamente. Saúde: `GET /actuator/health`.

Em outro terminal, o frontend:

```fish
cd frontend
mise exec -- npm install
mise exec -- npm run dev          # http://localhost:5173 (proxy de /api para :8080)
```

Dica: com `mise activate fish | source` no `~/.config/fish/config.fish`, dá para omitir o `mise exec --`.

### Testes

```fish
cd backend
mise exec -- ./mvnw test           # precisa do Docker (Testcontainers sobe um PostgreSQL próprio)
```

Frontend (sem Docker, inclui verificações de acessibilidade por papel e nome):

```fish
cd frontend
mise exec -- npm test             # Vitest
mise exec -- npm run typecheck && mise exec -- npm run lint && mise exec -- npm run build
```

Todo recurso novo segue **TDD** (teste falhando primeiro; ver `CLAUDE.md`). Os testes do backend cobrem: validação do conteúdo (tópicos completos com kit e aprofundamento, projetos com prática deliberada, todo tópico com vídeo), fluxo completo de aprendizagem com duas pessoas no mesmo grupo,
retomada em outro navegador, limites de autorização (registros privados, outro grupo, papéis),
CSRF, rate limit de login e marcos de grupo que não concedem proficiência individual.

## Estrutura

```
content/                 currículo (YAML) — editável sem mexer em código
  stages.yaml            etapas e ramos, com dependências
  topics/*.yaml          tópicos, um arquivo por etapa (s01…s16) e por ramo (z1…z4)
  resources.yaml         biblioteca base
  resources/*.yaml       biblioteca por frente de curadoria (vídeos, livros, canais, cursos, pt-BR…)
  projects.yaml          projetos iniciais
  projects/*.yaml        demais projetos (laboratórios e "construa o seu")
  policies.yaml          ciclo de aprendizagem, política de IA, modos semanais, papéis, níveis e método de prática
frontend/src/
  api/                   cliente HTTP (CSRF), tipos espelhando a API, hooks do TanStack Query
  app/                   rotas, layout, guarda de autenticação
  features/<área>/       páginas e testes por área (home, roadmap, topic, review, team, projects, resources, log, policies)
  components/ lib/       componentes compartilhados (campos, markdown leve, recursos) e utilitários
  test/                  MSW, fixtures e renderApp()
backend/
  src/main/java/br/dev/studysite/
    auth/ security/      cadastro, login, sessão, CSRF, rate limit
    curriculum/          modelo, carregamento e validação do conteúdo; API somente leitura
    group/               grupos, convites, papéis e a classe Access (regras de autorização)
    activity/            consumo de recurso, tentativas, autoavaliação, sessões de estudo
    evidence/ review/    evidências e revisões
    notes/ team/         notas; sessões do time, projetos do grupo, sinais de ajuda
    suggestions/         sugestões de recurso
    progress/            progresso derivado e o painel "continue de onde parou"
    demo/                dados de demonstração (perfil demo)
  src/main/resources/db/migration/   migrações Flyway
```

## Editando o currículo

1. Edite os YAML em `content/`. IDs são kebab-case e **estáveis** — a atividade no banco aponta para eles.
2. Rode `mise exec -- ./mvnw test -Dtest='Curriculum*'` (não precisa de banco). O validador acusa
   referências quebradas, ciclos de pré-requisitos, campos faltando em tópicos `authored` e
   datas de verificação inventadas.
3. Para recursos: só marque `verified` com a data em que você abriu o link; caso contrário use
   `pending` sem data. Preencha `section` apenas com capítulos vistos no índice da fonte.
4. Tópicos `authored` precisam da página completa, incluindo `kit` (3–7 itens `term`/`use`) e `deepDive` (pelo menos 2 pontos). O validador e o `CurriculumContentTest` listam o que falta.
5. Para vídeos, aponte o minuto com `?t=` na URL e o nome do episódio ou aula em `section`; para livros, prefira o capítulo (mesma URL com `section`) ao livro inteiro — a página do tópico troca o livro pelos capítulos automaticamente.
6. Projetos `authored` começam pelo marco `m0-redigitar` e têm `practice` com referências verificadas (com licença quando declarada). Use `track: build` para projetos "construa o seu"; o padrão é `track: lab`.

## API (resumo)

Todas as rotas exigem login, exceto `POST /api/auth/{register,login}`, `GET /api/auth/csrf` e `/actuator/health`.
Requisições que alteram dados exigem o cabeçalho `X-XSRF-TOKEN` com o valor do cookie `XSRF-TOKEN`.

| Área | Rotas |
|---|---|
| Autenticação | `GET /api/auth/csrf` · `POST /api/auth/register` · `POST /api/auth/login` · `POST /api/auth/logout` · `GET/PATCH /api/auth/me` |
| Currículo | `GET /api/curriculum` · `/topics?q=&stage=&status=` · `/topics/{id}` · `/resources?q=&topic=&language=&format=&difficulty=&priority=` · `/projects` · `/projects/{id}` · `/policies` |
| Meus registros | `POST/GET /api/me/resource-events` · `POST/GET /api/me/attempts` · `PATCH /api/me/attempts/{id}` · `POST/GET /api/me/self-assessments` · `POST/GET /api/me/study-sessions` · `PATCH /api/me/study-sessions/{id}` |
| Progresso | `GET /api/me/continue` · `GET /api/me/progress` · `GET /api/me/topics/{id}` · `GET /api/groups/{id}/progress` |
| Evidências | `POST /api/evidence` · `GET/PATCH/DELETE /api/evidence/{id}` · `GET /api/me/evidence` · `GET /api/groups/{id}/evidence` |
| Revisões | `POST /api/evidence/{id}/review-requests` · `GET /api/me/review-requests` · `GET /api/groups/{id}/review-requests` · `GET /api/review-requests/{id}` · `POST .../claim` · `POST .../feedback` · `POST .../close` |
| Notas | `POST /api/notes` · `GET/PATCH/DELETE /api/notes/{id}` · `GET /api/me/notes` · `GET /api/groups/{id}/notes` |
| Grupos | `POST /api/groups` · `POST /api/groups/join` · `GET /api/groups/{id}` · `PATCH/DELETE /api/groups/{id}/members/{userId}` · `POST /api/groups/{id}/invite-code` |
| Time | `GET/POST /api/groups/{id}/team-sessions` · `GET .../suggested-roles` · `GET/PATCH /api/team-sessions/{id}` · `PUT .../roles` · `PATCH .../roles/{role}/contribution` |
| Projetos do grupo | `GET/POST /api/groups/{id}/projects` · `GET /api/group-projects/{id}` · `PUT /api/group-projects/{id}/milestones/{milestoneId}` |
| Sinais e sugestões | `GET/POST /api/groups/{id}/signals` · `POST /api/signals/{id}/resolve` · `GET/POST /api/groups/{id}/resource-suggestions` · `POST /api/resource-suggestions/{id}/review` |

Erros seguem o formato Problem Details (`{"status", "title", "detail"}`) com mensagens em português.

## Regras de privacidade e autorização

- **Privado da pessoa:** consumo de recursos, tentativas, autoavaliações detalhadas, sessões de estudo, notas e evidências privadas. Ninguém mais lê ou altera — nem mentores.
- **Visível ao grupo:** evidências e notas que a autora compartilhou, pedidos de revisão e feedback, sessões do time, projetos e sinais. Só a autora altera o que é dela.
- **Progresso do grupo** mostra apenas evidência compartilhada, revisões aceitas e o nível de autoavaliação mais recente.
- **Pedir revisão** compartilha a evidência com o grupo escolhido.
- **Quem pede revisão não aprova o próprio trabalho**; aprovação vem de colega ou mentor.
- **Marcos de projeto do grupo não marcam ninguém como proficiente** — "demonstrado" exige evidência própria aceita em revisão.
- Quem não é membro recebe **404** (não 403), para não revelar a existência de grupos ou registros.

## Política de IA

Está em `content/policies.yaml` e é servida em `GET /api/curriculum/policies`: nas etapas de
fundamentos, tente manualmente antes de pedir solução completa; IA pode explicar, dar dicas graduais
e revisar tentativas; registre ajuda significativa no campo `aiAssistance` das evidências e
tentativas. O site funciona sem APIs pagas de IA.

## Segurança operacional

- Segredos só via variáveis de ambiente (`.env`, fora do git). Em produção use `COOKIE_SECURE=true` atrás de HTTPS e `REGISTRATION_ENABLED=false` depois de criar as contas do time.
- O rate limit de login é em memória (uma instância). Com várias réplicas, mova para o banco.
- O perfil `demo` cria contas com senha conhecida — nunca o ative fora da máquina local.
