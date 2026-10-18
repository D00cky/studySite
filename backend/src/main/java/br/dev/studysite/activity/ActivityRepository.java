package br.dev.studysite.activity;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

/**
 * Registros individuais. Toda consulta filtra por user_id: estes dados pertencem
 * a uma pessoa e não são lidos por outras.
 */
@Repository
public class ActivityRepository {

    public record ResourceEvent(UUID id, String resourceId, String topicId, String kind, String note,
            OffsetDateTime createdAt) {
    }

    public record Attempt(UUID id, String topicId, String exerciseId, String prediction, String notes,
            String aiAssistance, String status, OffsetDateTime startedAt, OffsetDateTime updatedAt) {
    }

    public record SelfAssessment(UUID id, String topicId, int level, String note, OffsetDateTime createdAt) {
    }

    public record StudySession(UUID id, String mode, String topicId, OffsetDateTime startedAt,
            OffsetDateTime endedAt, String summary, String restartNote, String nextAction) {
    }

    private final JdbcClient jdbc;

    public ActivityRepository(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    // --- consumo de recursos ---------------------------------------------------------

    public ResourceEvent addResourceEvent(UUID userId, String resourceId, String topicId, String kind, String note) {
        return jdbc.sql("""
                INSERT INTO resource_event (user_id, resource_id, topic_id, kind, note) VALUES (?, ?, ?, ?, ?)
                RETURNING id, resource_id, topic_id, kind, note, created_at
                """).params(userId, resourceId, topicId, kind, note).query(ResourceEvent.class).single();
    }

    public List<ResourceEvent> resourceEvents(UUID userId, String topicId) {
        return jdbc.sql("""
                SELECT id, resource_id, topic_id, kind, note, created_at FROM resource_event
                WHERE user_id = ? AND (?::text IS NULL OR topic_id = ?) ORDER BY created_at DESC LIMIT 200
                """).params(userId, topicId, topicId).query(ResourceEvent.class).list();
    }

    // --- tentativas de exercício ---------------------------------------------------------

    private static final String ATTEMPT_COLS =
            "id, topic_id, exercise_id, prediction, notes, ai_assistance, status, started_at, updated_at";

    public Attempt startAttempt(UUID userId, String topicId, String exerciseId, String prediction) {
        return jdbc.sql("INSERT INTO exercise_attempt (user_id, topic_id, exercise_id, prediction) VALUES (?, ?, ?, ?) "
                + "RETURNING " + ATTEMPT_COLS)
                .params(userId, topicId, exerciseId, prediction).query(Attempt.class).single();
    }

    public Optional<Attempt> updateAttempt(UUID userId, UUID id, String prediction, String notes,
            String aiAssistance, String status) {
        return jdbc.sql("""
                UPDATE exercise_attempt SET
                  prediction = coalesce(?, prediction), notes = coalesce(?, notes),
                  ai_assistance = coalesce(?, ai_assistance), status = coalesce(?, status), updated_at = now()
                WHERE id = ? AND user_id = ?
                RETURNING """ + " " + ATTEMPT_COLS)
                .params(prediction, notes, aiAssistance, status, id, userId).query(Attempt.class).optional();
    }

    public Optional<Attempt> findAttempt(UUID userId, UUID id) {
        return jdbc.sql("SELECT " + ATTEMPT_COLS + " FROM exercise_attempt WHERE id = ? AND user_id = ?")
                .params(id, userId).query(Attempt.class).optional();
    }

    public List<Attempt> attempts(UUID userId, String topicId) {
        return jdbc.sql("SELECT " + ATTEMPT_COLS + " FROM exercise_attempt "
                + "WHERE user_id = ? AND (?::text IS NULL OR topic_id = ?) ORDER BY updated_at DESC LIMIT 200")
                .params(userId, topicId, topicId).query(Attempt.class).list();
    }

    // --- autoavaliação ---------------------------------------------------------

    public SelfAssessment addSelfAssessment(UUID userId, String topicId, int level, String note) {
        return jdbc.sql("""
                INSERT INTO self_assessment (user_id, topic_id, level, note) VALUES (?, ?, ?, ?)
                RETURNING id, topic_id, level, note, created_at
                """).params(userId, topicId, level, note).query(SelfAssessment.class).single();
    }

    public List<SelfAssessment> selfAssessments(UUID userId, String topicId) {
        return jdbc.sql("""
                SELECT id, topic_id, level, note, created_at FROM self_assessment
                WHERE user_id = ? AND (?::text IS NULL OR topic_id = ?) ORDER BY created_at DESC LIMIT 200
                """).params(userId, topicId, topicId).query(SelfAssessment.class).list();
    }

    // --- sessões de estudo ---------------------------------------------------------

    private static final String SESSION_COLS =
            "id, mode, topic_id, started_at, ended_at, summary, restart_note, next_action";

    public StudySession startSession(UUID userId, String mode, String topicId) {
        return jdbc.sql("INSERT INTO study_session (user_id, mode, topic_id) VALUES (?, ?, ?) RETURNING " + SESSION_COLS)
                .params(userId, mode, topicId).query(StudySession.class).single();
    }

    public Optional<StudySession> updateSession(UUID userId, UUID id, String topicId, String summary,
            String restartNote, String nextAction, boolean end) {
        return jdbc.sql("""
                UPDATE study_session SET
                  topic_id = coalesce(?, topic_id), summary = coalesce(?, summary),
                  restart_note = coalesce(?, restart_note), next_action = coalesce(?, next_action),
                  ended_at = CASE WHEN ? AND ended_at IS NULL THEN now() ELSE ended_at END
                WHERE id = ? AND user_id = ?
                RETURNING """ + " " + SESSION_COLS)
                .params(topicId, summary, restartNote, nextAction, end, id, userId)
                .query(StudySession.class).optional();
    }

    public List<StudySession> sessions(UUID userId, int limit) {
        return jdbc.sql("SELECT " + SESSION_COLS + " FROM study_session WHERE user_id = ? ORDER BY started_at DESC LIMIT ?")
                .params(userId, limit).query(StudySession.class).list();
    }

    /** Última sessão que deixou nota de retomada ou próxima ação. */
    public Optional<StudySession> lastRestartPoint(UUID userId) {
        return jdbc.sql("SELECT " + SESSION_COLS + " FROM study_session WHERE user_id = ? "
                + "AND (restart_note IS NOT NULL OR next_action IS NOT NULL) ORDER BY started_at DESC LIMIT 1")
                .param(userId).query(StudySession.class).optional();
    }
}
