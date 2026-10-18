package br.dev.studysite.review;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

@Repository
public class ReviewRepository {

    public record ReviewRequest(UUID id, UUID groupId, UUID evidenceId, String evidenceTitle, String topicId,
            String projectId, UUID requesterId, String requesterName, UUID reviewerId, String reviewerName,
            String question, String status, OffsetDateTime createdAt, OffsetDateTime updatedAt) {
    }

    public record Feedback(UUID id, UUID authorId, String authorName, String authorRole, String verdict, String body,
            OffsetDateTime createdAt) {
    }

    private static final String SELECT = """
            SELECT r.id, r.group_id, r.evidence_id, e.title AS evidence_title, e.topic_id, e.project_id,
                   r.requester_id, rq.display_name AS requester_name, r.reviewer_id, rv.display_name AS reviewer_name,
                   r.question, r.status, r.created_at, r.updated_at
            FROM review_request r
            JOIN evidence e ON e.id = r.evidence_id
            JOIN app_user rq ON rq.id = r.requester_id
            LEFT JOIN app_user rv ON rv.id = r.reviewer_id
            """;

    private final JdbcClient jdbc;

    public ReviewRepository(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    public UUID create(UUID groupId, UUID evidenceId, UUID requesterId, UUID reviewerId, String question) {
        return jdbc.sql("""
                INSERT INTO review_request (group_id, evidence_id, requester_id, reviewer_id, question)
                VALUES (?, ?, ?, ?, ?) RETURNING id
                """).params(groupId, evidenceId, requesterId, reviewerId, question == null ? "" : question)
                .query(UUID.class).single();
    }

    public boolean hasActiveRequest(UUID evidenceId) {
        return jdbc.sql("SELECT EXISTS (SELECT 1 FROM review_request WHERE evidence_id = ? "
                        + "AND status IN ('open', 'changes_requested'))")
                .param(evidenceId).query(Boolean.class).single();
    }

    public Optional<ReviewRequest> find(UUID id) {
        return jdbc.sql(SELECT + " WHERE r.id = ?").param(id).query(ReviewRequest.class).optional();
    }

    public List<ReviewRequest> forGroup(UUID groupId, String status) {
        return jdbc.sql(SELECT + " WHERE r.group_id = ? AND (?::text IS NULL OR r.status = ?) ORDER BY r.updated_at DESC LIMIT 200")
                .params(groupId, status, status).query(ReviewRequest.class).list();
    }

    public List<ReviewRequest> requestedBy(UUID userId) {
        return jdbc.sql(SELECT + " WHERE r.requester_id = ? ORDER BY r.updated_at DESC LIMIT 100")
                .param(userId).query(ReviewRequest.class).list();
    }

    /** Pedidos abertos em grupos da pessoa que ela pode revisar (não são dela). */
    public List<ReviewRequest> awaitingReviewBy(UUID userId) {
        return jdbc.sql(SELECT + """
                 WHERE r.status = 'open' AND r.requester_id <> :u
                   AND (r.reviewer_id IS NULL OR r.reviewer_id = :u)
                   AND EXISTS (SELECT 1 FROM group_member m WHERE m.group_id = r.group_id AND m.user_id = :u)
                 ORDER BY r.created_at LIMIT 100
                """).param("u", userId).query(ReviewRequest.class).list();
    }

    public List<Feedback> feedback(UUID requestId) {
        return jdbc.sql("""
                SELECT f.id, f.author_id, u.display_name AS author_name, f.author_role, f.verdict, f.body, f.created_at
                FROM review_feedback f JOIN app_user u ON u.id = f.author_id
                WHERE f.review_request_id = ? ORDER BY f.created_at
                """).param(requestId).query(Feedback.class).list();
    }

    /** Feedback recente que outras pessoas deixaram nos pedidos de alguém. */
    public List<Feedback> recentFeedbackFor(UUID requesterId, int limit) {
        return jdbc.sql("""
                SELECT f.id, f.author_id, u.display_name AS author_name, f.author_role, f.verdict, f.body, f.created_at
                FROM review_feedback f
                JOIN review_request r ON r.id = f.review_request_id
                JOIN app_user u ON u.id = f.author_id
                WHERE r.requester_id = ? AND f.author_id <> r.requester_id
                ORDER BY f.created_at DESC LIMIT ?
                """).params(requesterId, limit).query(Feedback.class).list();
    }

    public void addFeedback(UUID requestId, UUID authorId, String authorRole, String verdict, String body) {
        jdbc.sql("""
                INSERT INTO review_feedback (review_request_id, author_id, author_role, verdict, body)
                VALUES (?, ?, ?, ?, ?)
                """).params(requestId, authorId, authorRole, verdict, body).update();
    }

    public void setStatus(UUID requestId, String status) {
        jdbc.sql("UPDATE review_request SET status = ?, updated_at = now() WHERE id = ?").params(status, requestId).update();
    }

    public void setReviewer(UUID requestId, UUID reviewerId) {
        jdbc.sql("UPDATE review_request SET reviewer_id = ?, updated_at = now() WHERE id = ?")
                .params(reviewerId, requestId).update();
    }

    public void touch(UUID requestId) {
        jdbc.sql("UPDATE review_request SET updated_at = now() WHERE id = ?").param(requestId).update();
    }
}
