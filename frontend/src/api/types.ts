// Tipos espelhando as respostas da API Spring (records em backend/src/main/java).

export type Uuid = string
export type Visibility = 'private' | 'group'
export type Role = 'mentor' | 'learner'
export type WeeklyModeId = 'survival' | 'compact' | 'standard' | 'expansion'
export type SessionMode = WeeklyModeId | 'rescue'
export type ProgressStatus = 'not_started' | 'exploring' | 'practicing' | 'evidence' | 'demonstrated'

// --- Autenticação ---------------------------------------------------------------

export interface Membership {
  id: Uuid
  name: string
  role: Role
}

export interface Me {
  id: Uuid
  email: string
  displayName: string
  weeklyMode: WeeklyModeId
  groups: Membership[]
}

// --- Currículo --------------------------------------------------------------------

export interface Stage {
  id: string
  order: number
  kind: 'core' | 'branch'
  title: string
  summary: string
  status: 'authored' | 'planned'
  dependsOn: string[]
  mathThreads: string[]
  crossCutting: string[]
}

export interface TopicSummary {
  id: string
  stage: string
  title: string
  status: 'authored' | 'planned'
  objective: string
  prerequisites: string[]
  related: string[]
}

export interface Roadmap {
  stages: Stage[]
  topics: TopicSummary[]
}

export interface Misconception {
  claim: string
  correction: string
}

export interface Exercise {
  id: string
  title: string
  prediction: string
  steps: string[]
  checks: string[]
}

export interface Experiment {
  title: string
  project?: string
  steps: string[]
  observe: string[]
}

export interface Topic extends TopicSummary {
  whyItMatters: string
  mathThreads: string[]
  explanation?: string
  misconceptions: Misconception[]
  resources?: { start?: string; deeper: string[]; videos: string[] }
  exercise?: Exercise
  experiment?: Experiment
  reflectionQuestions: string[]
  completionCriteria: string[]
  evidencePrompts: string[]
  firstAction?: string
  /** Drill-down 80/20: o essencial e o aprofundamento para depois. */
  deepDive: DeepDivePoint[]
  /** Kit mínimo 80/20: comando/conceito -> para que serve no dia a dia. */
  kit: KitItem[]
}

export interface KitItem {
  term: string
  use: string
}

export interface DeepDivePoint {
  title: string
  why: string
  resource?: string
}

export interface Verification {
  status: 'verified' | 'pending'
  checkedOn?: string
  note?: string
}

export interface Resource {
  id: string
  title: string
  author: string
  url: string
  language: 'pt-BR' | 'en'
  format: 'book' | 'article' | 'course' | 'documentation' | 'video' | 'tool' | 'lab'
  difficulty: 'intro' | 'intermediate' | 'advanced'
  topics: string[]
  prerequisites: string[]
  why: string
  section?: string
  access: 'free' | 'paid' | 'mixed'
  priority: 'core' | 'optional'
  verification: Verification
}

interface ProjectBase {
  id: string
  title: string
  status: 'authored' | 'planned'
  cumulative: boolean
  /** lab = laboratório de uma etapa; build = "construa o seu" (compilador, banco, Git...). */
  track: 'lab' | 'build'
  question: string
  topics: string[]
}

export interface ProjectSummary extends ProjectBase {
  milestoneCount: number
  minutes: number
}

export interface Milestone {
  id: string
  title: string
  description?: string
  minutes?: number
}

export interface Project extends ProjectBase {
  prerequisites: string[]
  minimalVersion: string
  extensions: string[]
  constraints: string[]
  milestones: Milestone[]
  edgeCases: string[]
  failureExperiments: string[]
  tools: string[]
  acceptanceCriteria: string[]
  evidence: string[]
  reviewQuestions: string[]
  practice?: Practice
}

export interface PracticeReference {
  title: string
  author: string
  url: string
  language?: string
  license?: string
}

export interface Practice {
  guidance: string
  references: PracticeReference[]
}

export interface TopicPage {
  topic: Topic
  stage: Stage
  startResource?: Resource
  deeperResources: Resource[]
  videos: Resource[]
  deepDiveResources: Resource[]
  books: Resource[]
  moreVideos: Resource[]
  moreResources: Resource[]
  prerequisites: TopicSummary[]
  unlocks: TopicSummary[]
  related: TopicSummary[]
  projects: ProjectSummary[]
}

export interface WeeklyMode {
  id: SessionMode
  title: string
  time: string
  description: string
  completesMilestones: boolean
}

export interface Policies {
  learningLoop: { id: string; title: string; description: string }[]
  aiPolicy: { id: string; title: string; allowed: string[]; expectations: string[] }[]
  weeklyModes: WeeklyMode[]
  sessionTemplate: { title: string; minutes: number; description: string }[]
  sessionRoles: { id: string; title: string; description: string }[]
  selfAssessmentLevels: { level: number; title: string; description: string }[]
  recordKinds: string[]
  practiceMethod?: {
    title: string
    summary: string
    steps: { id: string; title: string; description: string }[]
    sources: { title: string; url: string; quote: string }[]
    caveats: string[]
  }
}

// --- Registros pessoais -------------------------------------------------------------

export interface ResourceEvent {
  id: Uuid
  resourceId: string
  topicId?: string
  kind: 'opened' | 'finished'
  note?: string
  createdAt: string
}

export interface Attempt {
  id: Uuid
  topicId: string
  exerciseId: string
  prediction?: string
  notes?: string
  aiAssistance?: string
  status: 'in_progress' | 'submitted' | 'abandoned'
  startedAt: string
  updatedAt: string
}

export interface SelfAssessment {
  id: Uuid
  topicId: string
  level: number
  note?: string
  createdAt: string
}

export interface StudySession {
  id: Uuid
  mode: SessionMode
  topicId?: string
  startedAt: string
  endedAt?: string
  summary?: string
  restartNote?: string
  nextAction?: string
}

export interface Evidence {
  id: Uuid
  userId: Uuid
  authorName: string
  groupId?: Uuid
  topicId?: string
  projectId?: string
  milestoneId?: string
  attemptId?: Uuid
  kind: 'text' | 'repository' | 'artifact'
  title: string
  body: string
  url?: string
  aiAssistance?: string
  visibility: Visibility
  createdAt: string
  updatedAt: string
}

export interface Note {
  id: Uuid
  userId: Uuid
  authorName: string
  groupId?: Uuid
  topicId?: string
  title: string
  body: string
  visibility: Visibility
  createdAt: string
  updatedAt: string
}

export interface TopicProgress {
  topicId: string
  status: ProgressStatus
  resourcesOpened: number
  resourcesFinished: number
  attempts: number
  submittedAttempts: number
  evidence: number
  sharedEvidence: number
  acceptedReviews: number
  selfLevel?: number
}

export interface PrerequisiteGuidance {
  topicId: string
  title: string
  status: ProgressStatus
  objective: string
  firstAction?: string
}

export interface TopicWorkspace {
  progress: TopicProgress
  missingPrerequisites: PrerequisiteGuidance[]
  resourceEvents: ResourceEvent[]
  attempts: Attempt[]
  evidence: Evidence[]
  selfAssessments: SelfAssessment[]
  notes: Note[]
}

// --- Revisões ---------------------------------------------------------------------

export type ReviewStatus = 'open' | 'changes_requested' | 'accepted' | 'closed'
export type Verdict = 'comment' | 'changes_requested' | 'accepted'

export interface ReviewRequest {
  id: Uuid
  groupId: Uuid
  evidenceId: Uuid
  evidenceTitle: string
  topicId?: string
  projectId?: string
  requesterId: Uuid
  requesterName: string
  reviewerId?: Uuid
  reviewerName?: string
  question: string
  status: ReviewStatus
  createdAt: string
  updatedAt: string
}

export interface Feedback {
  id: Uuid
  authorId: Uuid
  authorName: string
  authorRole: Role
  verdict: Verdict
  body: string
  createdAt: string
}

export interface ReviewThread {
  request: ReviewRequest
  evidence: Evidence
  feedback: Feedback[]
}

export interface MyReviews {
  requested: ReviewRequest[]
  toReview: ReviewRequest[]
}

// --- Painel "continue de onde parou" ---------------------------------------------------

export interface NextAction {
  kind: 'restart_note' | 'respond_feedback' | 'continue_attempt' | 'start_topic' | 'explore'
  text: string
  topicId?: string
  refId?: Uuid
}

export interface ContinueView {
  nextAction: NextAction
  restartPoint?: StudySession
  lastDemonstrated?: { topicId: string; acceptedAt: string }
  activeAttempt?: { id: Uuid; topicId: string; exerciseId: string; updatedAt: string }
  changesRequested: { reviewRequestId: Uuid; evidenceTitle: string; topicId?: string; updatedAt: string }[]
  suggestedTopic?: { topicId: string; title: string; reason: string }
  recentFeedback: Feedback[]
  reviewsToGive: number
  weeklyMode?: WeeklyMode
}

// --- Grupo e time -------------------------------------------------------------------

export interface Member {
  userId: Uuid
  displayName: string
  role: Role
}

export interface TeamSignals {
  openReviews: number
  openBlockers: number
  wantHelp: number
  canHelp: number
}

export interface GroupDetail {
  id: Uuid
  name: string
  myRole: Role
  inviteCode?: string
  members: Member[]
  signals: TeamSignals
}

export interface MemberProgress {
  userId: Uuid
  displayName: string
  role: Role
  topics: Record<string, TopicProgress>
}

export interface HelpSignal {
  id: Uuid
  groupId: Uuid
  userId: Uuid
  displayName: string
  topicId?: string
  kind: 'blocker' | 'want_help' | 'can_help'
  body: string
  resolvedAt?: string
  createdAt: string
}

export type SessionRoleId = 'author' | 'challenger' | 'reviewer' | 'synthesizer'

export interface TeamSession {
  id: Uuid
  groupId: Uuid
  title: string
  scheduledFor?: string
  topicId?: string
  agenda: string
  findings: string
  nextSteps: string
  createdBy: Uuid
  createdAt: string
  updatedAt: string
}

export interface RoleAssignment {
  userId: Uuid
  displayName: string
  role: SessionRoleId
  contribution: string
}

export interface TeamSessionDetail {
  session: TeamSession
  roles: RoleAssignment[]
}

export interface MilestoneStatus {
  milestoneId: string
  status: 'todo' | 'in_progress' | 'done'
  updatedBy: Uuid
  updatedByName: string
  updatedAt: string
}

export interface GroupProjectDetail {
  groupProject: { id: Uuid; groupId: Uuid; projectId: string; startedBy: Uuid; createdAt: string }
  project: Project
  milestones: MilestoneStatus[]
  contributions: Evidence[]
}

export interface Suggestion {
  id: Uuid
  groupId: Uuid
  suggestedBy: Uuid
  suggestedByName: string
  title: string
  url: string
  topicIds: string[]
  rationale: string
  status: 'pending' | 'accepted' | 'rejected'
  reviewNote?: string
  createdAt: string
}

// --- Foco (pomodoro) e métricas ---------------------------------------------------------

export interface FocusBlock {
  id: Uuid
  kind: 'focus' | 'break'
  topicId?: string
  plannedMinutes: number
  startedAt: string
  endedAt?: string
}

export interface Metrics {
  totalMinutes: number
  focusBlocks: number
  medianBlockMinutes: number
  firstFocusAt?: string
  thisWeekMinutes: number
  /** Últimas semanas, segunda a domingo no fuso de quem pede; a última é a atual. */
  weeks: { weekStart: string; minutes: number; blocks: number }[]
  /** Minutos por hora do dia (0–23). */
  byHour: number[]
  /** Minutos por dia da semana, segunda (0) a domingo (6). */
  byWeekday: number[]
  topics: { topicId: string; minutes: number }[]
}

export interface FocusCalendar {
  /** Ano pedido; null = últimas 53 semanas até hoje. */
  year: number | null
  from: string
  to: string
  /** Só os dias com estudo (minutos de foco no fuso de quem pede). */
  days: { date: string; minutes: number }[]
  years: number[]
}
