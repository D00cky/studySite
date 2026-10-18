import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { useRegister } from '../../api/queries'
import { TextField } from '../../components/Field'
import { ErrorMessage } from '../../components/Status'

export function RegisterPage() {
  const register = useRegister()
  const navigate = useNavigate()
  const [form, setForm] = useState({ displayName: '', email: '', password: '' })

  function submit(e: FormEvent) {
    e.preventDefault()
    register.mutate(form, { onSuccess: () => navigate('/', { replace: true }) })
  }

  return (
    <main id="conteudo" className="auth-page">
      <h1>Criar conta</h1>
      <form onSubmit={submit} className="stack">
        <TextField
          label="Nome"
          autoComplete="name"
          required
          maxLength={80}
          value={form.displayName}
          onChange={(e) => setForm({ ...form, displayName: e.target.value })}
        />
        <TextField
          label="E-mail"
          type="email"
          autoComplete="email"
          required
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />
        <TextField
          label="Senha"
          type="password"
          autoComplete="new-password"
          required
          minLength={10}
          hint="Pelo menos 10 caracteres."
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
        />
        <ErrorMessage error={register.error} />
        <button type="submit" disabled={register.isPending}>
          Criar conta
        </button>
      </form>
      <p>
        Já tem conta? <Link to="/entrar">Entrar</Link>
      </p>
    </main>
  )
}
