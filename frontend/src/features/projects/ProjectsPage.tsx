import { Link } from 'react-router'
import { useProjects } from '../../api/queries'
import type { ProjectSummary } from '../../api/types'
import { InlineMarkdown } from '../../components/Markdown'
import { ErrorMessage, Loading } from '../../components/Status'
import { formatMinutes, plural } from '../../lib/format'
import { useTopicTitles } from '../../lib/useTopicTitles'

const GROUPS = [
  {
    id: 'construa',
    title: 'Construa o seu',
    file: 'build-your-own/',
    intro:
      'Recriar do zero ferramentas que você usa todo dia — compilador, banco de dados, Git, malloc, emulador, Raft. É o jeito mais direto de entender o mecanismo por dentro.',
    match: (p: ProjectSummary) => p.track === 'build',
  },
  {
    id: 'laboratorios',
    title: 'Laboratórios por etapa',
    file: 'labs/',
    intro: 'Projetos menores, presos a uma etapa do roadmap, que expõem um mecanismo de cada vez.',
    match: (p: ProjectSummary) => p.track === 'lab' && !p.cumulative,
  },
  {
    id: 'cumulativo',
    title: 'Projeto cumulativo',
    file: 'platform/',
    intro: 'A CLI de tarefas que cresce até virar uma plataforma, juntando o que as etapas ensinam.',
    match: (p: ProjectSummary) => p.cumulative,
  },
]

export function ProjectsPage() {
  const { data, error, isPending } = useProjects()
  const topicTitle = useTopicTitles()
  return (
    <>
      <header className="page-hero prose">
        <p className="eyebrow">projetos</p>
        <h1>Projetos</h1>
        <p>
          Projetos que expõem mecanismos: investigar como o software funciona, implementar o essencial, provocar falhas e
          explicar as decisões. Todos começam redigitando uma referência e usam o mesmo domínio — tarefas.
        </p>
      </header>
      {isPending && <Loading variant="cards" count={6} />}
      <ErrorMessage error={error} />
      {data &&
        GROUPS.map((group) => {
          const projects = data.filter(group.match)
          if (projects.length === 0) return null
          return (
            <section key={group.id} className="project-group" aria-labelledby={`grupo-${group.id}`}>
              <h2 id={`grupo-${group.id}`}>{group.title}</h2>
              <p className="muted prose">{group.intro}</p>
              <ul className="card-grid">
                {projects.map((p) => (
                  <li key={p.id}>
                    <article className={`project-card track-${p.track}`}>
                      <p className="project-card-file" aria-hidden="true">
                        {group.file}
                        {p.id}
                      </p>
                      <h3 className="project-card-title">
                        <Link to={`/projetos/${p.id}`}>{p.title}</Link>
                      </h3>
                      <p className="project-card-question">
                        <InlineMarkdown text={p.question} />
                      </p>
                      {p.topics.length > 0 && (
                        <ul className="chip-list" aria-label="Tópicos">
                          {p.topics.slice(0, 4).map((t) => (
                            <li key={t} className="chip">
                              {topicTitle(t)}
                            </li>
                          ))}
                          {p.topics.length > 4 && <li className="chip chip-more">+{p.topics.length - 4}</li>}
                        </ul>
                      )}
                      <div className="project-card-foot">
                        {p.milestoneCount > 0 && (
                          <span>
                            {plural(p.milestoneCount, 'marco', 'marcos')} · ~{formatMinutes(p.minutes)}
                          </span>
                        )}
                        {p.cumulative && <span className="tag tag-accent">Cumulativo</span>}
                        {p.status === 'planned' && <span className="tag">Detalhes planejados</span>}
                      </div>
                    </article>
                  </li>
                ))}
              </ul>
            </section>
          )
        })}
    </>
  )
}
