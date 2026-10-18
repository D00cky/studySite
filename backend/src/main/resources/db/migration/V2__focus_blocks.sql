-- Blocos de foco (pomodoro). Medem tempo estudado; pausas ficam registradas mas não contam.
-- O tempo contado de um bloco é limitado ao planejado: quem esquece o timer ligado não infla a métrica.
CREATE TABLE focus_block (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         uuid        NOT NULL REFERENCES app_user (id) ON DELETE CASCADE,
    kind            text        NOT NULL CHECK (kind IN ('focus', 'break')),
    topic_id        text,
    planned_minutes int         NOT NULL CHECK (planned_minutes BETWEEN 1 AND 180),
    started_at      timestamptz NOT NULL DEFAULT now(),
    ended_at        timestamptz,
    CHECK (ended_at IS NULL OR ended_at >= started_at)
);
CREATE INDEX focus_block_user_idx ON focus_block (user_id, started_at DESC);
-- No máximo um bloco aberto por pessoa.
CREATE UNIQUE INDEX focus_block_one_open ON focus_block (user_id) WHERE ended_at IS NULL;
