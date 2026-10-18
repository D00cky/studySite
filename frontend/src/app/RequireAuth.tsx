import { Navigate, Outlet, useLocation } from 'react-router'
import { ApiError } from '../api/client'
import { useMe } from '../api/queries'
import { ErrorMessage, Loading } from '../components/Status'

/** Rotas internas só para quem entrou; 401 leva ao login guardando o destino. */
export function RequireAuth() {
  const { data, error, isPending } = useMe()
  const location = useLocation()
  if (isPending) return <Loading />
  if (error instanceof ApiError && error.status === 401) {
    return <Navigate to="/entrar" replace state={{ from: location.pathname }} />
  }
  if (error || !data) return <ErrorMessage error={error} />
  return <Outlet />
}
