package br.dev.studysite.suggestions;

import java.sql.Array;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.OffsetDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

@Repository
public class SuggestionRepository {

    public record Suggestion(UUID id, UUID groupId, UUID suggestedBy, String suggestedByName, String title, String url,
            List<String> topicIds, String rationale, String status, UUID reviewedBy, String reviewNote,
            OffsetDateTime createdAt, OffsetDateTime reviewedAt) {
    }

    private static final String SELECT = """
            SELECT s.id, s.group_id, s.suggested_by, u.display_name, s.title, s.url, s.topic_ids, s.rationale,
                   s.status, s.reviewed_by, s.review_note, s.created_at, s.reviewed_at
            FROM resource_suggestion s JOIN app_user u ON u.id = s.suggested_by
            """;

    private final JdbcClient jdbc;

    public SuggestionRepository(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    private static Suggestion map(ResultSet rs, int n) throws SQLException {
        Array topics = rs.getArray("topic_ids");
        return new Suggestion(rs.getObject("id", UUID.class), rs.getObject("group_id", UUID.class),
                rs.getObject("suggested_by", UUID.class), rs.getString("display_name"), rs.getString("title"),
                rs.getString("url"), Arrays.asList((String[]) topics.getArray()), rs.getString("rationale"),
                rs.getString("status"), rs.getObject("reviewed_by", UUID.class), rs.getString("review_note"),
                rs.getObject("created_at", OffsetDateTime.class), rs.getObject("reviewed_at", OffsetDateTime.class));
    }

    public UUID create(UUID groupId, UUID userId, String title, String url, List<String> topicIds, String rationale) {
        return jdbc.sql("""
                INSERT INTO resource_suggestion (group_id, suggested_by, title, url, topic_ids, rationale)
                VALUES (?, ?, ?, ?, ?, ?) RETURNING id
                """).params(groupId, userId, title, url, topicIds.toArray(String[]::new), rationale == null ? "" : rationale)
                .query(UUID.class).single();
    }

    public Optional<Suggestion> find(UUID id) {
        return jdbc.sql(SELECT + " WHERE s.id = ?").param(id).query(SuggestionRepository::map).optional();
    }

    public List<Suggestion> forGroup(UUID groupId, String status) {
        return jdbc.sql(SELECT + " WHERE s.group_id = ? AND (?::text IS NULL OR s.status = ?) ORDER BY s.created_at DESC")
                .params(groupId, status, status).query(SuggestionRepository::map).list();
    }

    public void review(UUID id, UUID reviewerId, String status, String note) {
        jdbc.sql("UPDATE resource_suggestion SET status = ?, review_note = ?, reviewed_by = ?, reviewed_at = now() WHERE id = ?")
                .params(status, note, reviewerId, id).update();
    }
}
