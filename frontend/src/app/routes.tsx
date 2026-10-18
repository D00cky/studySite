import type { RouteObject } from 'react-router'
import { LoginPage } from '../features/auth/LoginPage'
import { RegisterPage } from '../features/auth/RegisterPage'
import { HomePage } from '../features/home/HomePage'
import { LogPage } from '../features/log/LogPage'
import { PoliciesPage } from '../features/policies/PoliciesPage'
import { GroupProjectPage } from '../features/projects/GroupProjectPage'
import { ProjectPage } from '../features/projects/ProjectPage'
import { ProjectsPage } from '../features/projects/ProjectsPage'
import { ResourcesPage } from '../features/resources/ResourcesPage'
import { ReviewPage } from '../features/review/ReviewPage'
import { RoadmapPage } from '../features/roadmap/RoadmapPage'
import { TeamPage } from '../features/team/TeamPage'
import { TeamSessionPage } from '../features/team/TeamSessionPage'
import { TopicPage } from '../features/topic/TopicPage'
import { AppShell } from './AppShell'
import { NotFoundPage } from './NotFoundPage'
import { RequireAuth } from './RequireAuth'

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
          { path: 'roadmap', element: <RoadmapPage /> },
          { path: 'topicos/:topicId', element: <TopicPage /> },
          { path: 'revisoes/:reviewId', element: <ReviewPage /> },
          { path: 'time', element: <TeamPage /> },
          { path: 'recursos', element: <ResourcesPage /> },
          { path: 'projetos', element: <ProjectsPage /> },
          { path: 'projetos/:projectId', element: <ProjectPage /> },
          { path: 'projetos-do-grupo/:groupProjectId', element: <GroupProjectPage /> },
          { path: 'registro', element: <LogPage /> },
          { path: 'como-estudamos', element: <PoliciesPage /> },
          { path: 'sessoes/:sessionId', element: <TeamSessionPage /> },
          { path: '*', element: <NotFoundPage /> },
        ],
      },
    ],
  },
]
