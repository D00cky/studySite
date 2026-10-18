import { NavLink, Outlet, useNavigate } from 'react-router'
import { useLogout, useMe } from '../api/queries'
import { useTheme } from '../lib/theme'

const NAV = [
  { to: '/', label: 'Início', end: true },
  { to: '/roadmap', label: 'Roadmap' },
  { to: '/recursos', label: 'Recursos' },
  { to: '/projetos', label: 'Projetos' },
  { to: '/time', label: 'Time' },
  { to: '/registro', label: 'Meu registro' },
  { to: '/como-estudamos', label: 'Como estudamos' },
]

export function AppShell() {
  const { data: me } = useMe()
  const logout = useLogout()
  const navigate = useNavigate()
  const { theme, toggle } = useTheme()

  return (
    <>
      <a className="skip-link" href="#conteudo">
        Pular para o conteúdo
      </a>
      <header className="site-header">
        <div className="header-inner">
          <NavLink to="/" className="brand" end>
            <span className="brand-mark" aria-hidden="true">
              S
            </span>
            StudySite
          </NavLink>
          <nav aria-label="Principal">
            <ul className="nav-list">
              {NAV.map((item) => (
                <li key={item.to}>
                  <NavLink to={item.to} end={item.end}>
                    {item.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
          <div className="account">
            <button type="button" className="button-quiet theme-toggle" onClick={toggle}>
              {theme === 'dark' ? 'Usar tema claro' : 'Usar tema escuro'}
            </button>
            {me && <span className="muted">{me.displayName}</span>}
            <button
              type="button"
              className="button-quiet"
              onClick={() => logout.mutate(undefined, { onSuccess: () => navigate('/entrar') })}
            >
              Sair
            </button>
          </div>
        </div>
      </header>
      <main id="conteudo" tabIndex={-1} className="page">
        <Outlet />
      </main>
    </>
  )
}
