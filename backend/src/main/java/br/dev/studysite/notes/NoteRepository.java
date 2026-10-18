package br.dev.studysite.notes;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

@Repository
public class NoteRepository {

    public record Note(UUID id, UUID userId, String authorName, UUID groupId, String topicId, String title,
            String body, String visibility, OffsetDateTime createdAt, OffsetDateTime updatedAt) {
    }

    private static final String SELECT = """
            SELECT n.id, n.user_id, u.display_name AS author_name, n.group_id, n.topic_id, n.title, n.body,
                   n.visibility, n.created_at, n.updated_at
            FROM note n JOIN app_user u ON u.id = n.user_id
            """;

    private final JdbcClient jdbc;

    public NoteRepository(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    public UUID create(UUID userId, UUID groupId, String topicId, String title, String body, String visibility) {
        return jdbc.sql("INSERT INTO note (user_id, group_id, topic_id, title, body, visibility) "
                        + "VALUES (?, ?, ?, ?, ?, ?) RETURNING id")
                .params(userId, groupId, topicId, title, body == null ? "" : body, visibility)
                .query(UUID.class).single();
    }

    public Optional<Note> find(UUID id) {
        return jdbc.sql(SELECT + " WHERE n.id = ?").param(id).query(Note.class).optional();
    }

    public boolean update(UUID userId, UUID id, String title, String body, String visibility, UUID groupId) {
        return jdbc.sql("""
                UPDATE note SET title = coalesce(?, title), body = coalesce(?, body),
                       visibility = coalesce(?, visibility), group_id = coalesce(?, group_id), updated_at = now()
                WHERE id = ? AND user_id = ?
                """).params(title, body, visibility, groupId, id, userId).update() == 1;
    }

    public boolean delete(UUID userId, UUID id) {
        return jdbc.sql("DELETE FROM note WHERE id = ? AND user_id = ?").params(id, userId).update() == 1;
    }

    public List<Note> mine(UUID userId, String topicId) {
        return jdbc.sql(SELECT + " WHERE n.user_id = ? AND (?::text IS NULL OR n.topic_id = ?) ORDER BY n.updated_at DESC LIMIT 200")
                .params(userId, topicId, topicId).query(Note.class).list();
    }

    public List<Note> sharedInGroup(UUID groupId, String topicId) {
        return jdbc.sql(SELECT + " WHERE n.group_id = ? AND n.visibility = 'group' "
                        + "AND (?::text IS NULL OR n.topic_id = ?) ORDER BY n.updated_at DESC LIMIT 200")
                .params(groupId, topicId, topicId).query(Note.class).list();
    }
}
