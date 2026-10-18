package br.dev.studysite.progress;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

/** Consultas agregadas por tópico. Cada fonte de registro é contada separadamente. */
@Repository
class ProgressRepository {

    record TopicCounts(String topicId, long resourcesOpened, long resourcesFinished, long attempts,
            long submittedAttempts, long evidence, long sharedEvidence, long acceptedReviews, Integer selfLevel) {
    }

    record Demonstrated(String topicId, OffsetDateTime acceptedAt) {
    }

    record ActiveAttempt(UUID id, String topicId, String exerciseId, OffsetDateTime updatedAt) {
    }

    record ChangesRequested(UUID reviewRequestId, String evidenceTitle, String topicId, OffsetDateTime updatedAt) {
    }

    private final JdbcClient jdbc;

    ProgressRepository(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    /**
     * Uma linha por tópico com qualquer atividade da pessoa. Revisões aceitas contam
     * apenas evidências da própria pessoa: trabalho de grupo não transfere proficiência.
     */
    List<TopicCounts> topicCounts(UUID userId) {
        return jdbc.sql("""
                WITH topics AS (
                  SELECT topic_id FROM resource_event WHERE user_id = :u AND topic_id IS NOT NULL
                  UNION SELECT topic_id FROM exercise_attempt WHERE user_id = :u
                  UNION SELECT topic_id FROM evidence WHERE user_id = :u AND topic_id IS NOT NULL
                  UNION SELECT topic_id FROM self_assessment WHERE user_id = :u
                )
                SELECT t.topic_id,
                  (SELECT count(DISTINCT resource_id) FROM resource_event r WHERE r.user_id = :u AND r.topic_id = t.topic_id AND r.kind = 'opened') AS resources_opened,
                  (SELECT count(DISTINCT resource_id) FROM resource_event r WHERE r.user_id = :u AND r.topic_id = t.topic_id AND r.kind = 'finished') AS resources_finished,
                  (SELECT count(*) FROM exercise_attempt a WHERE a.user_id = :u AND a.topic_id = t.topic_id) AS attempts,
                  (SELECT count(*) FROM exercise_attempt a WHERE a.user_id = :u AND a.topic_id = t.topic_id AND a.status = 'submitted') AS submitted_attempts,
                  (SELECT count(*) FROM evidence e WHERE e.user_id = :u AND e.topic_id = t.topic_id) AS evidence,
                  (SELECT count(*) FROM evidence e WHERE e.user_id = :u AND e.topic_id = t.topic_id AND e.visibility = 'group') AS shared_evidence,
                  (SELECT count(*) FROM review_request rr JOIN evidence e ON e.id = rr.evidence_id
                     WHERE rr.requester_id = :u AND e.user_id = :u AND e.topic_id = t.topic_id AND rr.status = 'accepted') AS accepted_reviews,
                  (SELECT level FROM self_assessment s WHERE s.user_id = :u AND s.topic_id = t.topic_id ORDER BY created_at DESC LIMIT 1) AS self_level
                FROM topics t
                """).param("u", userId).query(TopicCounts.class).list();
    }

    /** Versão restrita para colegas de grupo: só evidência compartilhada, revisões e autoavaliação. */
    List<TopicCounts> sharedTopicCounts(UUID userId, UUID groupId) {
        return jdbc.sql("""
                WITH topics AS (
                  SELECT topic_id FROM evidence WHERE user_id = :u AND group_id = :g AND visibility = 'group' AND topic_id IS NOT NULL
                  UNION SELECT topic_id FROM self_assessment WHERE user_id = :u
                )
                SELECT t.topic_id, 0 AS resources_opened, 0 AS resources_finished, 0 AS attempts, 0 AS submitted_attempts,
                  (SELECT count(*) FROM evidence e WHERE e.user_id = :u AND e.group_id = :g AND e.visibility = 'group' AND e.topic_id = t.topic_id) AS evidence,
                  (SELECT count(*) FROM evidence e WHERE e.user_id = :u AND e.group_id = :g AND e.visibility = 'group' AND e.topic_id = t.topic_id) AS shared_evidence,
                  (SELECT count(*) FROM review_request rr JOIN evidence e ON e.id = rr.evidence_id
                     WHERE rr.requester_id = :u AND e.user_id = :u AND rr.group_id = :g AND e.topic_id = t.topic_id AND rr.status = 'accepted') AS accepted_reviews,
                  (SELECT level FROM self_assessment s WHERE s.user_id = :u AND s.topic_id = t.topic_id ORDER BY created_at DESC LIMIT 1) AS self_level
                FROM topics t
                """).param("u", userId).param("g", groupId).query(TopicCounts.class).list();
    }

    Optional<Demonstrated> lastDemonstrated(UUID userId) {
        return jdbc.sql("""
                SELECT e.topic_id, rr.updated_at AS accepted_at
                FROM review_request rr JOIN evidence e ON e.id = rr.evidence_id
                WHERE rr.requester_id = ? AND e.user_id = rr.requester_id AND rr.status = 'accepted' AND e.topic_id IS NOT NULL
                ORDER BY rr.updated_at DESC LIMIT 1
                """).param(userId).query(Demonstrated.class).optional();
    }

    Optional<ActiveAttempt> activeAttempt(UUID userId) {
        return jdbc.sql("SELECT id, topic_id, exercise_id, updated_at FROM exercise_attempt "
                        + "WHERE user_id = ? AND status = 'in_progress' ORDER BY updated_at DESC LIMIT 1")
                .param(userId).query(ActiveAttempt.class).optional();
    }

    List<ChangesRequested> changesRequested(UUID userId) {
        return jdbc.sql("""
                SELECT rr.id AS review_request_id, e.title AS evidence_title, e.topic_id, rr.updated_at
                FROM review_request rr JOIN evidence e ON e.id = rr.evidence_id
                WHERE rr.requester_id = ? AND rr.status = 'changes_requested' ORDER BY rr.updated_at DESC
                """).param(userId).query(ChangesRequested.class).list();
    }
}
