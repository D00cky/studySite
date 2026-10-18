import { Link } from 'react-router'
import { useProjects } from '../../api/queries'
import { ErrorMessage, Loading } from '../../components/Status'

export function ProjectsPage() {
  const { data, error, isPending } = useProjects()
  return (
    <div className="prose">
      <h1>Projetos</h1>
      <p className="muted">
        Projetos que expõem mecanismos: investigar como o software funciona, implementar o essencial, provocar falhas e
        explicar as decisões. Todos usam o mesmo domínio — tarefas — e evoluem até a plataforma cumulativa.
      </p>
      {isPending && <Loading />}
      <ErrorMessage error={error} />
      <ul className="list-plain">
        {data?.map((p) => (
          <li key={p.id}>
            <div className="row">
              <Link to={`/projetos/${p.id}`}>{p.title}</Link>
              {p.cumulative && <span className="tag tag-accent">Cumulativo</span>}
              {p.status === 'planned' && <span className="tag">Detalhes planejados</span>}
            </div>
            <p className="muted small" style={{ margin: '0.25rem 0 0' }}>
              {p.question}
            </p>
          </li>
        ))}
      </ul>
    </div>
  )
}
