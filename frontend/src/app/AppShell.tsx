import { useEffect, useRef, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router'
import { useLogout, useMe } from '../api/queries'
import { useTheme } from '../lib/theme'
import { CommandPalette } from './CommandPalette'

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
  const { pathname } = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const returnFocus = useRef<HTMLElement | null>(null)

  function openPalette() {
    returnFocus.current = document.activeElement as HTMLElement | null
    setPaletteOpen(true)
  }

  function closePalette() {
    setPaletteOpen(false)
    returnFocus.current?.focus()
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        returnFocus.current = document.activeElement as HTMLElement | null
        setPaletteOpen(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

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
          <button type="button" className="button-quiet search-trigger" onClick={openPalette}>
            <span>Buscar</span>
            <kbd aria-hidden="true">Ctrl K</kbd>
          </button>
          <button
            type="button"
            className="button-quiet menu-toggle"
            aria-expanded={menuOpen}
            aria-controls="menu-principal"
            onClick={() => setMenuOpen((open) => !open)}
          >
            Menu
          </button>
          <nav aria-label="Principal" id="menu-principal" className={menuOpen ? 'site-nav open' : 'site-nav'}>
            <ul className="nav-list">
              {NAV.map((item) => (
                <li key={item.to}>
                  <NavLink to={item.to} end={item.end} onClick={() => setMenuOpen(false)}>
                    {item.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
          <div className="account">
            <button
              type="button"
              className="button-quiet theme-toggle"
              onClick={toggle}
              aria-label={theme === 'dark' ? 'Usar tema claro' : 'Usar tema escuro'}
              title={theme === 'dark' ? 'Usar tema claro' : 'Usar tema escuro'}
            >
              <span aria-hidden="true">{theme === 'dark' ? '☀' : '☾'}</span>
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
      {paletteOpen && <CommandPalette onClose={closePalette} />}
      <footer className="status-bar">
        <div className="status-bar-inner">
          <span className="status-branch">main</span>
          <span>~{decodeURI(pathname)}</span>
          <span className="status-right">UTF-8 · pt-BR · {theme === 'dark' ? 'escuro' : 'claro'}</span>
        </div>
      </footer>
    </>
  )
}
