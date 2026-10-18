-- Esquema inicial do StudySite.
--
-- O conteúdo do currículo (etapas, tópicos, recursos, projetos) vive em content/*.yaml
-- e é referenciado aqui por IDs textuais estáveis (topic_id, resource_id, project_id...).
-- Este banco guarda apenas atividade das pessoas e do grupo.

-- Pessoas e grupos -----------------------------------------------------------

CREATE TABLE app_user (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email         text        NOT NULL,
    display_name  text        NOT NULL CHECK (length(display_name) BETWEEN 1 AND 80),
    password_hash text        NOT NULL,
    weekly_mode   text        NOT NULL DEFAULT 'compact'
                  CHECK (weekly_mode IN ('survival', 'compact', 'standard', 'expansion')),
    created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX app_user_email_uq ON app_user (lower(email));

CREATE TABLE study_group (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name        text        NOT NULL CHECK (length(name) BETWEEN 1 AND 120),
    invite_code text        NOT NULL UNIQUE,
    created_by  uuid        NOT NULL REFERENCES app_user (id),
    created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE group_member (
    group_id  uuid        NOT NULL REFERENCES study_group (id) ON DELETE CASCADE,
    user_id   uuid        NOT NULL REFERENCES app_user (id) ON DELETE CASCADE,
    role      text        NOT NULL CHECK (role IN ('mentor', 'learner')),
    joined_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (group_id, user_id)
);
CREATE INDEX group_member_user_idx ON group_member (user_id);

-- Registros individuais, mantidos separados de propósito ------------------------
-- Abrir um recurso NÃO demonstra domínio: consumo, tentativas, evidências,
-- autoavaliação e revisão são tabelas distintas.

CREATE TABLE resource_event (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     uuid        NOT NULL REFERENCES app_user (id) ON DELETE CASCADE,
    resource_id text        NOT NULL,
    topic_id    text,
    kind        text        NOT NULL CHECK (kind IN ('opened', 'finished')),
    note        text,
    created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX resource_event_user_idx ON resource_event (user_id, created_at DESC);

CREATE TABLE exercise_attempt (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      uuid        NOT NULL REFERENCES app_user (id) ON DELETE CASCADE,
    topic_id     text        NOT NULL,
    exercise_id  text        NOT NULL,
    prediction   text,
    notes        text,
    ai_assistance text,
    status       text        NOT NULL DEFAULT 'in_progress'
                 CHECK (status IN ('in_progress', 'submitted', 'abandoned')),
    started_at   timestamptz NOT NULL DEFAULT now(),
    updated_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX exercise_attempt_user_idx ON exercise_attempt (user_id, updated_at DESC);

CREATE TABLE evidence (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       uuid        NOT NULL REFERENCES app_user (id) ON DELETE CASCADE,
    group_id      uuid        REFERENCES study_group (id) ON DELETE SET NULL,
    topic_id      text,
    project_id    text,
    milestone_id  text,
    attempt_id    uuid        REFERENCES exercise_attempt (id) ON DELETE SET NULL,
    kind          text        NOT NULL CHECK (kind IN ('text', 'repository', 'artifact')),
    title         text        NOT NULL CHECK (length(title) BETWEEN 1 AND 200),
    body          text        NOT NULL DEFAULT '',
    url           text,
    ai_assistance text,
    visibility    text        NOT NULL DEFAULT 'private' CHECK (visibility IN ('private', 'group')),
    created_at    timestamptz NOT NULL DEFAULT now(),
    updated_at    timestamptz NOT NULL DEFAULT now(),
    CHECK (topic_id IS NOT NULL OR project_id IS NOT NULL),
    CHECK (visibility = 'private' OR group_id IS NOT NULL),
    CHECK (kind = 'text' OR url IS NOT NULL)
);
CREATE INDEX evidence_user_idx ON evidence (user_id, updated_at DESC);
CREATE INDEX evidence_group_idx ON evidence (group_id) WHERE visibility = 'group';

CREATE TABLE self_assessment (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    uuid        NOT NULL REFERENCES app_user (id) ON DELETE CASCADE,
    topic_id   text        NOT NULL,
    -- 0 não comecei · 1 reconheço · 2 explico · 3 implemento · 4 depuro/ensino
    level      smallint    NOT NULL CHECK (level BETWEEN 0 AND 4),
    note       text,
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX self_assessment_user_topic_idx ON self_assessment (user_id, topic_id, created_at DESC);

-- Revisão por pares ou mentor -----------------------------------------------------

CREATE TABLE review_request (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id     uuid        NOT NULL REFERENCES study_group (id) ON DELETE CASCADE,
    evidence_id  uuid        NOT NULL REFERENCES evidence (id) ON DELETE CASCADE,
    requester_id uuid        NOT NULL REFERENCES app_user (id) ON DELETE CASCADE,
    reviewer_id  uuid        REFERENCES app_user (id) ON DELETE SET NULL,
    question     text        NOT NULL DEFAULT '',
    status       text        NOT NULL DEFAULT 'open'
                 CHECK (status IN ('open', 'changes_requested', 'accepted', 'closed')),
    created_at   timestamptz NOT NULL DEFAULT now(),
    updated_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX review_request_group_idx ON review_request (group_id, status);

CREATE TABLE review_feedback (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    review_request_id uuid        NOT NULL REFERENCES review_request (id) ON DELETE CASCADE,
    author_id         uuid        NOT NULL REFERENCES app_user (id) ON DELETE CASCADE,
    author_role       text        NOT NULL CHECK (author_role IN ('mentor', 'learner')),
    verdict           text        NOT NULL CHECK (verdict IN ('comment', 'changes_requested', 'accepted')),
    body              text        NOT NULL CHECK (length(body) >= 1),
    created_at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX review_feedback_request_idx ON review_feedback (review_request_id, created_at);

-- Notas, sessões de estudo e retomada ------------------------------------------

CREATE TABLE note (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    uuid        NOT NULL REFERENCES app_user (id) ON DELETE CASCADE,
    group_id   uuid        REFERENCES study_group (id) ON DELETE SET NULL,
    topic_id   text,
    title      text        NOT NULL CHECK (length(title) BETWEEN 1 AND 200),
    body       text        NOT NULL DEFAULT '',
    visibility text        NOT NULL DEFAULT 'private' CHECK (visibility IN ('private', 'group')),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CHECK (visibility = 'private' OR group_id IS NOT NULL)
);
CREATE INDEX note_user_idx ON note (user_id, updated_at DESC);

CREATE TABLE study_session (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      uuid        NOT NULL REFERENCES app_user (id) ON DELETE CASCADE,
    mode         text        NOT NULL CHECK (mode IN ('survival', 'compact', 'standard', 'expansion', 'rescue')),
    topic_id     text,
    started_at   timestamptz NOT NULL DEFAULT now(),
    ended_at     timestamptz,
    summary      text,
    restart_note text,
    next_action  text
);
CREATE INDEX study_session_user_idx ON study_session (user_id, started_at DESC);

-- Trabalho do time ---------------------------------------------------------------

CREATE TABLE team_session (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id      uuid        NOT NULL REFERENCES study_group (id) ON DELETE CASCADE,
    title         text        NOT NULL CHECK (length(title) BETWEEN 1 AND 200),
    scheduled_for timestamptz,
    topic_id      text,
    agenda        text        NOT NULL DEFAULT '',
    findings      text        NOT NULL DEFAULT '',
    next_steps    text        NOT NULL DEFAULT '',
    created_by    uuid        NOT NULL REFERENCES app_user (id),
    created_at    timestamptz NOT NULL DEFAULT now(),
    updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX team_session_group_idx ON team_session (group_id, scheduled_for DESC);

CREATE TABLE team_session_role (
    team_session_id uuid NOT NULL REFERENCES team_session (id) ON DELETE CASCADE,
    user_id         uuid NOT NULL REFERENCES app_user (id) ON DELETE CASCADE,
    role            text NOT NULL CHECK (role IN ('author', 'challenger', 'reviewer', 'synthesizer')),
    contribution    text NOT NULL DEFAULT '',
    PRIMARY KEY (team_session_id, user_id, role)
);

CREATE TABLE group_project (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id   uuid        NOT NULL REFERENCES study_group (id) ON DELETE CASCADE,
    project_id text        NOT NULL,
    started_by uuid        NOT NULL REFERENCES app_user (id),
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (group_id, project_id)
);

-- Status compartilhado de marcos. Concluir um marco do grupo NÃO marca
-- ninguém como proficiente: proficiência vem de evidência individual revisada.
CREATE TABLE group_project_milestone (
    group_project_id uuid        NOT NULL REFERENCES group_project (id) ON DELETE CASCADE,
    milestone_id     text        NOT NULL,
    status           text        NOT NULL CHECK (status IN ('todo', 'in_progress', 'done')),
    updated_by       uuid        NOT NULL REFERENCES app_user (id),
    updated_at       timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (group_project_id, milestone_id)
);

CREATE TABLE help_signal (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id    uuid        NOT NULL REFERENCES study_group (id) ON DELETE CASCADE,
    user_id     uuid        NOT NULL REFERENCES app_user (id) ON DELETE CASCADE,
    topic_id    text,
    kind        text        NOT NULL CHECK (kind IN ('blocker', 'want_help', 'can_help')),
    body        text        NOT NULL CHECK (length(body) >= 1),
    resolved_at timestamptz,
    created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX help_signal_group_open_idx ON help_signal (group_id) WHERE resolved_at IS NULL;

CREATE TABLE resource_suggestion (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id     uuid        NOT NULL REFERENCES study_group (id) ON DELETE CASCADE,
    suggested_by uuid        NOT NULL REFERENCES app_user (id) ON DELETE CASCADE,
    title        text        NOT NULL CHECK (length(title) BETWEEN 1 AND 300),
    url          text        NOT NULL,
    topic_ids    text[]      NOT NULL DEFAULT '{}',
    rationale    text        NOT NULL DEFAULT '',
    status       text        NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
    reviewed_by  uuid        REFERENCES app_user (id) ON DELETE SET NULL,
    review_note  text,
    created_at   timestamptz NOT NULL DEFAULT now(),
    reviewed_at  timestamptz
);

-- Spring Session (sessões de login persistidas no Postgres) -------------------
-- Copiado de org/springframework/session/jdbc/schema-postgresql.sql.

CREATE TABLE SPRING_SESSION (
    PRIMARY_ID CHAR(36) NOT NULL,
    SESSION_ID CHAR(36) NOT NULL,
    CREATION_TIME BIGINT NOT NULL,
    LAST_ACCESS_TIME BIGINT NOT NULL,
    MAX_INACTIVE_INTERVAL INT NOT NULL,
    EXPIRY_TIME BIGINT NOT NULL,
    PRINCIPAL_NAME VARCHAR(100),
    CONSTRAINT SPRING_SESSION_PK PRIMARY KEY (PRIMARY_ID)
);
CREATE UNIQUE INDEX SPRING_SESSION_IX1 ON SPRING_SESSION (SESSION_ID);
CREATE INDEX SPRING_SESSION_IX2 ON SPRING_SESSION (EXPIRY_TIME);
CREATE INDEX SPRING_SESSION_IX3 ON SPRING_SESSION (PRINCIPAL_NAME);

CREATE TABLE SPRING_SESSION_ATTRIBUTES (
    SESSION_PRIMARY_ID CHAR(36) NOT NULL,
    ATTRIBUTE_NAME VARCHAR(200) NOT NULL,
    ATTRIBUTE_BYTES BYTEA NOT NULL,
    CONSTRAINT SPRING_SESSION_ATTRIBUTES_PK PRIMARY KEY (SESSION_PRIMARY_ID, ATTRIBUTE_NAME),
    CONSTRAINT SPRING_SESSION_ATTRIBUTES_FK FOREIGN KEY (SESSION_PRIMARY_ID) REFERENCES SPRING_SESSION (PRIMARY_ID) ON DELETE CASCADE
);
