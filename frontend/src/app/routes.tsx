import type { RouteObject } from 'react-router'
import { LoginPage } from '../features/auth/LoginPage'
import { RegisterPage } from '../features/auth/RegisterPage'
import { HomePage } from '../features/home/HomePage'
import { AppShell } from './AppShell'
import { NotFoundPage } from './NotFoundPage'
import { RequireAuth } from './RequireAuth'

// Páginas fora do caminho inicial carregam sob demanda, cada uma no seu chunk.
const page = (load: () => Promise<{ default: React.ComponentType }>) => async () => ({ Component: (await load()).default })

export const routes: RouteObject[] = [
  { path: '/entrar', element: <LoginPage /> },
  { path: '/cadastro', element: <RegisterPage /> },
  {
    element: <RequireAuth />,
    children: [
      {
        element: <AppShell />,
        children: [
          { index: true, element: <HomePage /> },
          { path: 'roadmap', lazy: page(() => import('../features/roadmap/RoadmapPage').then((m) => ({ default: m.RoadmapPage }))) },
          { path: 'topicos/:topicId', lazy: page(() => import('../features/topic/TopicPage').then((m) => ({ default: m.TopicPage }))) },
          { path: 'revisoes/:reviewId', lazy: page(() => import('../features/review/ReviewPage').then((m) => ({ default: m.ReviewPage }))) },
          { path: 'time', lazy: page(() => import('../features/team/TeamPage').then((m) => ({ default: m.TeamPage }))) },
          { path: 'recursos', lazy: page(() => import('../features/resources/ResourcesPage').then((m) => ({ default: m.ResourcesPage }))) },
          { path: 'projetos', lazy: page(() => import('../features/projects/ProjectsPage').then((m) => ({ default: m.ProjectsPage }))) },
          { path: 'projetos/:projectId', lazy: page(() => import('../features/projects/ProjectPage').then((m) => ({ default: m.ProjectPage }))) },
          {
            path: 'projetos-do-grupo/:groupProjectId',
            lazy: page(() => import('../features/projects/GroupProjectPage').then((m) => ({ default: m.GroupProjectPage }))),
          },
          { path: 'progresso', lazy: page(() => import('../features/progress/ProgressPage').then((m) => ({ default: m.ProgressPage }))) },
          { path: 'registro', lazy: page(() => import('../features/log/LogPage').then((m) => ({ default: m.LogPage }))) },
          { path: 'como-estudamos', lazy: page(() => import('../features/policies/PoliciesPage').then((m) => ({ default: m.PoliciesPage }))) },
          { path: 'sessoes/:sessionId', lazy: page(() => import('../features/team/TeamSessionPage').then((m) => ({ default: m.TeamSessionPage }))) },
          { path: '*', element: <NotFoundPage /> },
        ],
      },
    ],
  },
]
