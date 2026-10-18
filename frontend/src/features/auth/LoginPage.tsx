import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { useLogin } from '../../api/queries'
import { TextField } from '../../components/Field'
import { ErrorMessage } from '../../components/Status'

export function LoginPage() {
  const login = useLogin()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from ?? '/'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  function submit(e: FormEvent) {
    e.preventDefault()
    login.mutate({ email, password }, { onSuccess: () => navigate(from, { replace: true }) })
  }

  return (
    <main id="conteudo" className="auth-page">
      <div className="auth-card">
        <p className="eyebrow">StudySite · estudo em equipe</p>
      <h1>Entrar</h1>
      <p className="muted">Fundamentos de computação, com prática, evidência e revisão.</p>
      <form onSubmit={submit} className="stack">
        <TextField label="E-mail" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        <TextField
          label="Senha"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <ErrorMessage error={login.error} />
        <button type="submit" className="button-block" disabled={login.isPending}>
          Entrar
        </button>
      </form>
      <p>
        Primeira vez? <Link to="/cadastro">Criar conta</Link>
      </p>
      </div>
    </main>
  )
}
