package br.dev.studysite.auth;

import br.dev.studysite.security.AppUser;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

@Repository
public class UserRepository {

    public record UserRow(UUID id, String email, String displayName, String weeklyMode) {
    }

    public record Membership(UUID id, String name, String role) {
    }

    private final JdbcClient jdbc;

    public UserRepository(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    public Optional<AppUser> findCredentialsByEmail(String email) {
        return jdbc.sql("SELECT id, email, display_name, password_hash FROM app_user WHERE lower(email) = lower(?)")
                .param(email.trim())
                .query((rs, n) -> new AppUser(rs.getObject("id", UUID.class), rs.getString("email"),
                        rs.getString("display_name"), rs.getString("password_hash")))
                .optional();
    }

    public boolean emailExists(String email) {
        return jdbc.sql("SELECT EXISTS (SELECT 1 FROM app_user WHERE lower(email) = lower(?))")
                .param(email.trim()).query(Boolean.class).single();
    }

    public UUID create(String email, String displayName, String passwordHash) {
        return jdbc.sql("INSERT INTO app_user (email, display_name, password_hash) VALUES (?, ?, ?) RETURNING id")
                .params(email.trim(), displayName.trim(), passwordHash)
                .query(UUID.class).single();
    }

    public UserRow find(UUID id) {
        return jdbc.sql("SELECT id, email, display_name, weekly_mode FROM app_user WHERE id = ?")
                .param(id).query(UserRow.class).single();
    }

    public List<Membership> memberships(UUID userId) {
        return jdbc.sql("""
                SELECT g.id, g.name, m.role FROM group_member m JOIN study_group g ON g.id = m.group_id
                WHERE m.user_id = ? ORDER BY g.name
                """).param(userId).query(Membership.class).list();
    }

    public void updateProfile(UUID id, String displayName, String weeklyMode) {
        jdbc.sql("""
                UPDATE app_user SET display_name = coalesce(?, display_name),
                                    weekly_mode = coalesce(?, weekly_mode)
                WHERE id = ?
                """).params(displayName == null ? null : displayName.trim(), weeklyMode, id).update();
    }
}
