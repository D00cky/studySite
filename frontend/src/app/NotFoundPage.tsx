import { Link, useLocation } from 'react-router'

export function NotFoundPage() {
  const { pathname } = useLocation()
  return (
    <section className="terminal not-found" aria-labelledby="not-found-title">
      <div className="terminal-bar" aria-hidden="true">
        <span className="dot dot-red" />
        <span className="dot dot-yellow" />
        <span className="dot dot-green" />
        <span className="terminal-title">bash</span>
      </div>
      <div className="terminal-body">
        <p className="terminal-line">
          <span aria-hidden="true">$ </span>cd {decodeURI(pathname)}
        </p>
        <p className="terminal-line error-line">bash: cd: {decodeURI(pathname)}: No such file or directory</p>
        <h1 id="not-found-title">Página não encontrada</h1>
        <p className="muted">O endereço não existe ou mudou. Escolha um caminho para continuar:</p>
        <p className="row">
          <Link to="/" className="button">
            Voltar ao início
          </Link>
          <Link to="/roadmap" className="button button-secondary">
            Abrir o roadmap
          </Link>
        </p>
      </div>
    </section>
  )
}
