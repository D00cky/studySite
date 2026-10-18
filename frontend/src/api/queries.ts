import { useMutation, useQuery, useQueryClient, type QueryKey } from '@tanstack/react-query'
import { api } from './client'
import type {
  Attempt,
  ContinueView,
  Evidence,
  GroupDetail,
  GroupProjectDetail,
  HelpSignal,
  Me,
  MemberProgress,
  MyReviews,
  Note,
  Policies,
  Project,
  ProjectSummary,
  Resource,
  ResourceEvent,
  ReviewRequest,
  ReviewThread,
  Roadmap,
  SelfAssessment,
  StudySession,
  Suggestion,
  TeamSession,
  TeamSessionDetail,
  TopicPage,
  TopicProgress,
  TopicWorkspace,
} from './types'

// Chaves de cache. Prefixos permitem invalidar em grupo (ex.: tudo de "me").
export const keys = {
  me: ['me'] as const,
  roadmap: ['curriculum', 'roadmap'] as const,
  policies: ['curriculum', 'policies'] as const,
  topic: (id: string) => ['curriculum', 'topic', id] as const,
  resources: (filters: Record<string, string>) => ['curriculum', 'resources', filters] as const,
  projects: ['curriculum', 'projects'] as const,
  project: (id: string) => ['curriculum', 'project', id] as const,
  continue: ['mine', 'continue'] as const,
  progress: ['mine', 'progress'] as const,
  workspace: (topicId: string) => ['mine', 'workspace', topicId] as const,
  sessions: ['mine', 'sessions'] as const,
  attempts: ['mine', 'attempts'] as const,
  evidence: ['mine', 'evidence'] as const,
  notes: ['mine', 'notes'] as const,
  assessments: ['mine', 'assessments'] as const,
  resourceEvents: ['mine', 'resource-events'] as const,
  myReviews: ['mine', 'reviews'] as const,
  group: (id: string) => ['group', id] as const,
  groupPart: (id: string, part: string) => ['group', id, part] as const,
  review: (id: string) => ['review', id] as const,
  teamSession: (id: string) => ['team-session', id] as const,
  groupProject: (id: string) => ['group-project', id] as const,
}

const MINE: QueryKey = ['mine']

function useInvalidate() {
  const qc = useQueryClient()
  return (...prefixes: QueryKey[]) => Promise.all(prefixes.map((queryKey) => qc.invalidateQueries({ queryKey })))
}

// --- Autenticação ---------------------------------------------------------------

export function useMe() {
  return useQuery({ queryKey: keys.me, queryFn: () => api.get<Me>('/api/auth/me'), retry: false })
}

export function useLogin() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: { email: string; password: string }) => api.post<Me>('/api/auth/login', body),
    onSuccess: (me) => {
      qc.clear()
      qc.setQueryData(keys.me, me)
    },
  })
}

export function useRegister() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: { email: string; displayName: string; password: string }) =>
      api.post<Me>('/api/auth/register', body),
    onSuccess: (me) => {
      qc.clear()
      qc.setQueryData(keys.me, me)
    },
  })
}

export function useLogout() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api.post<void>('/api/auth/logout'),
    onSuccess: () => qc.clear(),
  })
}

export function useUpdateProfile() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: { displayName?: string; weeklyMode?: string }) => api.patch<Me>('/api/auth/me', body),
    onSuccess: (me) => {
      qc.setQueryData(keys.me, me)
      void qc.invalidateQueries({ queryKey: keys.continue })
    },
  })
}

// --- Currículo ---------------------------------------------------------------------

const STATIC = { staleTime: Infinity }

export function useRoadmap() {
  return useQuery({ queryKey: keys.roadmap, queryFn: () => api.get<Roadmap>('/api/curriculum'), ...STATIC })
}

export function usePolicies() {
  return useQuery({ queryKey: keys.policies, queryFn: () => api.get<Policies>('/api/curriculum/policies'), ...STATIC })
}

export function useTopicPage(id: string) {
  return useQuery({
    queryKey: keys.topic(id),
    queryFn: () => api.get<TopicPage>(`/api/curriculum/topics/${encodeURIComponent(id)}`),
    ...STATIC,
  })
}

export function useResources(filters: Record<string, string>) {
  const params = new URLSearchParams(Object.entries(filters).filter(([, v]) => v))
  return useQuery({
    queryKey: keys.resources(Object.fromEntries(params)),
    queryFn: () => api.get<Resource[]>(`/api/curriculum/resources?${params}`),
    ...STATIC,
  })
}

export function useProjects() {
  return useQuery({ queryKey: keys.projects, queryFn: () => api.get<ProjectSummary[]>('/api/curriculum/projects'), ...STATIC })
}

export function useProject(id: string) {
  return useQuery({
    queryKey: keys.project(id),
    queryFn: () => api.get<Project>(`/api/curriculum/projects/${encodeURIComponent(id)}`),
    ...STATIC,
  })
}

// --- Registros pessoais -------------------------------------------------------------

export function useContinue() {
  return useQuery({ queryKey: keys.continue, queryFn: () => api.get<ContinueView>('/api/me/continue') })
}

export function useMyProgress() {
  return useQuery({ queryKey: keys.progress, queryFn: () => api.get<Record<string, TopicProgress>>('/api/me/progress') })
}

export function useTopicWorkspace(topicId: string) {
  return useQuery({
    queryKey: keys.workspace(topicId),
    queryFn: () => api.get<TopicWorkspace>(`/api/me/topics/${encodeURIComponent(topicId)}`),
  })
}

export function useSessions() {
  return useQuery({ queryKey: keys.sessions, queryFn: () => api.get<StudySession[]>('/api/me/study-sessions') })
}

export function useAttempts() {
  return useQuery({ queryKey: keys.attempts, queryFn: () => api.get<Attempt[]>('/api/me/attempts') })
}

export function useMyEvidence() {
  return useQuery({ queryKey: keys.evidence, queryFn: () => api.get<Evidence[]>('/api/me/evidence') })
}

export function useMyNotes() {
  return useQuery({ queryKey: keys.notes, queryFn: () => api.get<Note[]>('/api/me/notes') })
}

export function useMyAssessments() {
  return useQuery({ queryKey: keys.assessments, queryFn: () => api.get<SelfAssessment[]>('/api/me/self-assessments') })
}

export function useMyResourceEvents() {
  return useQuery({ queryKey: keys.resourceEvents, queryFn: () => api.get<ResourceEvent[]>('/api/me/resource-events') })
}

/** Qualquer registro pessoal novo pode mudar progresso, painel e área do tópico. */
function useMineMutation<TBody, TResult>(fn: (body: TBody) => Promise<TResult>, extra: QueryKey[] = []) {
  const invalidate = useInvalidate()
  return useMutation({ mutationFn: fn, onSuccess: () => invalidate(MINE, ...extra) })
}

export function useRecordResourceEvent() {
  return useMineMutation((body: { resourceId: string; topicId?: string; kind: 'opened' | 'finished'; note?: string }) =>
    api.post<ResourceEvent>('/api/me/resource-events', body),
  )
}

export function useStartAttempt() {
  return useMineMutation((body: { topicId: string; exerciseId?: string; prediction?: string }) =>
    api.post<Attempt>('/api/me/attempts', body),
  )
}

export function useUpdateAttempt() {
  return useMineMutation(({ id, ...body }: { id: string; notes?: string; status?: string; aiAssistance?: string; prediction?: string }) =>
    api.patch<Attempt>(`/api/me/attempts/${id}`, body),
  )
}

export function useAddSelfAssessment() {
  return useMineMutation((body: { topicId: string; level: number; note?: string }) =>
    api.post<SelfAssessment>('/api/me/self-assessments', body),
  )
}

export function useStartSession() {
  return useMineMutation((body: { mode: string; topicId?: string }) => api.post<StudySession>('/api/me/study-sessions', body))
}

export function useUpdateSession() {
  return useMineMutation(
    ({ id, ...body }: { id: string; topicId?: string; summary?: string; restartNote?: string; nextAction?: string; end?: boolean }) =>
      api.patch<StudySession>(`/api/me/study-sessions/${id}`, body),
  )
}

export interface NewEvidence {
  topicId?: string
  projectId?: string
  milestoneId?: string
  attemptId?: string
  groupId?: string
  kind: Evidence['kind']
  title: string
  body?: string
  url?: string
  aiAssistance?: string
  visibility?: Evidence['visibility']
}

export function useCreateEvidence() {
  return useMineMutation((body: NewEvidence) => api.post<Evidence>('/api/evidence', body), [['group']])
}

export function useCreateNote() {
  return useMineMutation(
    (body: { title: string; body?: string; topicId?: string; groupId?: string; visibility?: string }) =>
      api.post<Note>('/api/notes', body),
    [['group']],
  )
}

export function useUpdateNote() {
  return useMineMutation(
    ({ id, ...body }: { id: string; title?: string; body?: string; visibility?: string; groupId?: string }) =>
      api.patch<Note>(`/api/notes/${id}`, body),
    [['group']],
  )
}

// --- Revisões ---------------------------------------------------------------------

export function useMyReviews() {
  return useQuery({ queryKey: keys.myReviews, queryFn: () => api.get<MyReviews>('/api/me/review-requests') })
}

export function useReviewThread(id: string) {
  return useQuery({ queryKey: keys.review(id), queryFn: () => api.get<ReviewThread>(`/api/review-requests/${id}`) })
}

export function useRequestReview() {
  return useMineMutation(
    ({ evidenceId, ...body }: { evidenceId: string; groupId: string; question?: string; reviewerId?: string }) =>
      api.post<ReviewThread>(`/api/evidence/${evidenceId}/review-requests`, body),
    [['group']],
  )
}

function useReviewAction<TBody>(fn: (id: string, body: TBody) => Promise<ReviewThread>) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: TBody }) => fn(id, body),
    onSuccess: (thread) => {
      qc.setQueryData(keys.review(thread.request.id), thread)
      void qc.invalidateQueries({ queryKey: MINE })
      void qc.invalidateQueries({ queryKey: ['group'] })
    },
  })
}

export function useGiveFeedback() {
  return useReviewAction((id, body: { verdict: string; body: string }) =>
    api.post<ReviewThread>(`/api/review-requests/${id}/feedback`, body),
  )
}

export function useClaimReview() {
  return useReviewAction((id, _body: void) => api.post<ReviewThread>(`/api/review-requests/${id}/claim`))
}

export function useCloseReview() {
  return useReviewAction((id, _body: void) => api.post<ReviewThread>(`/api/review-requests/${id}/close`))
}

// --- Grupo e time -------------------------------------------------------------------

export function useGroup(id: string | undefined) {
  return useQuery({
    queryKey: keys.group(id ?? ''),
    queryFn: () => api.get<GroupDetail>(`/api/groups/${id}`),
    enabled: Boolean(id),
  })
}

function useGroupList<T>(groupId: string | undefined, part: string, path: string) {
  return useQuery({
    queryKey: keys.groupPart(groupId ?? '', part),
    queryFn: () => api.get<T>(`/api/groups/${groupId}/${path}`),
    enabled: Boolean(groupId),
  })
}

export const useGroupReviews = (groupId?: string) => useGroupList<ReviewRequest[]>(groupId, 'reviews', 'review-requests')
export const useGroupSignals = (groupId?: string) => useGroupList<HelpSignal[]>(groupId, 'signals', 'signals')
export const useGroupSessions = (groupId?: string) => useGroupList<TeamSession[]>(groupId, 'sessions', 'team-sessions')
export const useGroupProjects = (groupId?: string) => useGroupList<GroupProjectDetail[]>(groupId, 'projects', 'projects')
export const useGroupProgress = (groupId?: string) => useGroupList<MemberProgress[]>(groupId, 'progress', 'progress')
export const useGroupNotes = (groupId?: string) => useGroupList<Note[]>(groupId, 'notes', 'notes')
export const useGroupEvidence = (groupId?: string) => useGroupList<Evidence[]>(groupId, 'evidence', 'evidence')
export const useGroupSuggestions = (groupId?: string) =>
  useGroupList<Suggestion[]>(groupId, 'suggestions', 'resource-suggestions')

function useGroupMutation<TBody, TResult>(fn: (body: TBody) => Promise<TResult>) {
  const invalidate = useInvalidate()
  return useMutation({ mutationFn: fn, onSuccess: () => invalidate(['group'], keys.me, MINE) })
}

export function useCreateGroup() {
  return useGroupMutation((body: { name: string }) => api.post<GroupDetail>('/api/groups', body))
}

export function useJoinGroup() {
  return useGroupMutation((body: { inviteCode: string }) => api.post<GroupDetail>('/api/groups/join', body))
}

export function useAddSignal(groupId: string) {
  return useGroupMutation((body: { kind: string; topicId?: string; body: string }) =>
    api.post<HelpSignal>(`/api/groups/${groupId}/signals`, body),
  )
}

export function useResolveSignal() {
  return useGroupMutation((id: string) => api.post<HelpSignal>(`/api/signals/${id}/resolve`))
}

export function useCreateTeamSession(groupId: string) {
  return useGroupMutation((body: { title: string; scheduledFor?: string; topicId?: string; agenda?: string }) =>
    api.post<TeamSessionDetail>(`/api/groups/${groupId}/team-sessions`, body),
  )
}

export function useTeamSession(id: string) {
  return useQuery({ queryKey: keys.teamSession(id), queryFn: () => api.get<TeamSessionDetail>(`/api/team-sessions/${id}`) })
}

export function useSuggestedRoles(groupId: string | undefined) {
  return useGroupList<{ userId: string; role: string }[]>(groupId, 'suggested-roles', 'team-sessions/suggested-roles')
}

function useTeamSessionMutation<TBody>(fn: (id: string, body: TBody) => Promise<TeamSessionDetail>) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: TBody }) => fn(id, body),
    onSuccess: (detail) => {
      qc.setQueryData(keys.teamSession(detail.session.id), detail)
      void qc.invalidateQueries({ queryKey: ['group'] })
    },
  })
}

export const useUpdateTeamSession = () =>
  useTeamSessionMutation((id, body: Partial<Pick<TeamSession, 'title' | 'agenda' | 'findings' | 'nextSteps'>>) =>
    api.patch<TeamSessionDetail>(`/api/team-sessions/${id}`, body),
  )

export const useSetTeamRoles = () =>
  useTeamSessionMutation((id, body: { userId: string; role: string }[]) =>
    api.put<TeamSessionDetail>(`/api/team-sessions/${id}/roles`, body),
  )

export const useSetContribution = () =>
  useTeamSessionMutation((id, body: { role: string; contribution: string }) =>
    api.patch<TeamSessionDetail>(`/api/team-sessions/${id}/roles/${body.role}/contribution`, {
      contribution: body.contribution,
    }),
  )

export function useStartGroupProject(groupId: string) {
  return useGroupMutation((body: { projectId: string }) =>
    api.post<GroupProjectDetail>(`/api/groups/${groupId}/projects`, body),
  )
}

export function useGroupProject(id: string) {
  return useQuery({ queryKey: keys.groupProject(id), queryFn: () => api.get<GroupProjectDetail>(`/api/group-projects/${id}`) })
}

export function useSetMilestone() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, milestoneId, status }: { id: string; milestoneId: string; status: string }) =>
      api.put<GroupProjectDetail>(`/api/group-projects/${id}/milestones/${milestoneId}`, { status }),
    onSuccess: (detail) => {
      qc.setQueryData(keys.groupProject(detail.groupProject.id), detail)
      void qc.invalidateQueries({ queryKey: ['group'] })
    },
  })
}

export function useSuggestResource(groupId: string) {
  return useGroupMutation((body: { title: string; url: string; topicIds: string[]; rationale?: string }) =>
    api.post<Suggestion>(`/api/groups/${groupId}/resource-suggestions`, body),
  )
}

export function useReviewSuggestion() {
  return useGroupMutation(({ id, ...body }: { id: string; status: 'accepted' | 'rejected'; note?: string }) =>
    api.post<Suggestion>(`/api/resource-suggestions/${id}/review`, body),
  )
}
