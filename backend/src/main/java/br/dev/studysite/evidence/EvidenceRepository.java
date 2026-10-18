package br.dev.studysite.evidence;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

@Repository
public class EvidenceRepository {

    public record Evidence(UUID id, UUID userId, String authorName, UUID groupId, String topicId, String projectId,
            String milestoneId, UUID attemptId, String kind, String title, String body, String url,
            String aiAssistance, String visibility, OffsetDateTime createdAt, OffsetDateTime updatedAt) {
    }

    public record NewEvidence(UUID groupId, String topicId, String projectId, String milestoneId, UUID attemptId,
            String kind, String title, String body, String url, String aiAssistance, String visibility) {
    }

    private static final String SELECT = """
            SELECT e.id, e.user_id, u.display_name AS author_name, e.group_id, e.topic_id, e.project_id,
                   e.milestone_id, e.attempt_id, e.kind, e.title, e.body, e.url, e.ai_assistance,
                   e.visibility, e.created_at, e.updated_at
            FROM evidence e JOIN app_user u ON u.id = e.user_id
            """;

    private final JdbcClient jdbc;

    public EvidenceRepository(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    public UUID create(UUID userId, NewEvidence e) {
        return jdbc.sql("""
                INSERT INTO evidence (user_id, group_id, topic_id, project_id, milestone_id, attempt_id, kind,
                                      title, body, url, ai_assistance, visibility)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id
                """).params(userId, e.groupId(), e.topicId(), e.projectId(), e.milestoneId(), e.attemptId(),
                        e.kind(), e.title(), e.body() == null ? "" : e.body(), e.url(), e.aiAssistance(),
                        e.visibility())
                .query(UUID.class).single();
    }

    public Optional<Evidence> find(UUID id) {
        return jdbc.sql(SELECT + " WHERE e.id = ?").param(id).query(Evidence.class).optional();
    }

    /** Atualiza só se a pessoa for dona do registro. */
    public boolean update(UUID userId, UUID id, String title, String body, String url, String aiAssistance,
            String visibility, UUID groupId) {
        return jdbc.sql("""
                UPDATE evidence SET title = coalesce(?, title), body = coalesce(?, body), url = coalesce(?, url),
                       ai_assistance = coalesce(?, ai_assistance), visibility = coalesce(?, visibility),
                       group_id = coalesce(?, group_id), updated_at = now()
                WHERE id = ? AND user_id = ?
                """).params(title, body, url, aiAssistance, visibility, groupId, id, userId).update() == 1;
    }

    public boolean delete(UUID userId, UUID id) {
        return jdbc.sql("DELETE FROM evidence WHERE id = ? AND user_id = ?").params(id, userId).update() == 1;
    }

    public void shareWithGroup(UUID id, UUID groupId) {
        jdbc.sql("UPDATE evidence SET group_id = ?, visibility = 'group', updated_at = now() WHERE id = ?")
                .params(groupId, id).update();
    }

    public List<Evidence> mine(UUID userId, String topicId, String projectId) {
        return jdbc.sql(SELECT + """
                 WHERE e.user_id = ? AND (?::text IS NULL OR e.topic_id = ?) AND (?::text IS NULL OR e.project_id = ?)
                 ORDER BY e.updated_at DESC LIMIT 200
                """).params(userId, topicId, topicId, projectId, projectId).query(Evidence.class).list();
    }

    public List<Evidence> sharedInGroup(UUID groupId, String topicId, String projectId) {
        return jdbc.sql(SELECT + """
                 WHERE e.group_id = ? AND e.visibility = 'group'
                   AND (?::text IS NULL OR e.topic_id = ?) AND (?::text IS NULL OR e.project_id = ?)
                 ORDER BY e.updated_at DESC LIMIT 200
                """).params(groupId, topicId, topicId, projectId, projectId).query(Evidence.class).list();
    }
}
