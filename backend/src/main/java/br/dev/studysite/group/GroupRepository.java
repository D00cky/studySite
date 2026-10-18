package br.dev.studysite.group;

import java.security.SecureRandom;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

@Repository
public class GroupRepository {

    public record GroupRow(UUID id, String name, String inviteCode) {
    }

    public record MemberRow(UUID userId, String displayName, String role) {
    }

    /** Sinais úteis para o time — sem rankings. */
    public record TeamSignals(long openReviews, long openBlockers, long wantHelp, long canHelp) {
    }

    private static final char[] ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789".toCharArray();
    private static final SecureRandom RANDOM = new SecureRandom();

    private final JdbcClient jdbc;

    public GroupRepository(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    static String newInviteCode() {
        char[] code = new char[10];
        for (int i = 0; i < code.length; i++) {
            code[i] = ALPHABET[RANDOM.nextInt(ALPHABET.length)];
        }
        return new String(code);
    }

    public UUID create(String name, UUID creator) {
        UUID id = jdbc.sql("INSERT INTO study_group (name, invite_code, created_by) VALUES (?, ?, ?) RETURNING id")
                .params(name.trim(), newInviteCode(), creator).query(UUID.class).single();
        addMember(id, creator, Access.MENTOR);
        return id;
    }

    public void addMember(UUID groupId, UUID userId, String role) {
        jdbc.sql("INSERT INTO group_member (group_id, user_id, role) VALUES (?, ?, ?) ON CONFLICT DO NOTHING")
                .params(groupId, userId, role).update();
    }

    public Optional<UUID> findByInviteCode(String code) {
        return jdbc.sql("SELECT id FROM study_group WHERE invite_code = ?")
                .param(code.trim().toUpperCase()).query(UUID.class).optional();
    }

    public GroupRow find(UUID id) {
        return jdbc.sql("SELECT id, name, invite_code FROM study_group WHERE id = ?")
                .param(id).query(GroupRow.class).single();
    }

    public List<MemberRow> members(UUID groupId) {
        return jdbc.sql("""
                SELECT u.id AS user_id, u.display_name, m.role
                FROM group_member m JOIN app_user u ON u.id = m.user_id
                WHERE m.group_id = ? ORDER BY m.role, u.display_name
                """).param(groupId).query(MemberRow.class).list();
    }

    public long mentorCount(UUID groupId) {
        return jdbc.sql("SELECT count(*) FROM group_member WHERE group_id = ? AND role = 'mentor'")
                .param(groupId).query(Long.class).single();
    }

    public void setRole(UUID groupId, UUID userId, String role) {
        jdbc.sql("UPDATE group_member SET role = ? WHERE group_id = ? AND user_id = ?")
                .params(role, groupId, userId).update();
    }

    public void removeMember(UUID groupId, UUID userId) {
        jdbc.sql("DELETE FROM group_member WHERE group_id = ? AND user_id = ?").params(groupId, userId).update();
    }

    public String rotateInviteCode(UUID groupId) {
        String code = newInviteCode();
        jdbc.sql("UPDATE study_group SET invite_code = ? WHERE id = ?").params(code, groupId).update();
        return code;
    }

    public TeamSignals signals(UUID groupId) {
        return jdbc.sql("""
                SELECT
                  (SELECT count(*) FROM review_request WHERE group_id = :g AND status = 'open') AS open_reviews,
                  (SELECT count(*) FROM help_signal WHERE group_id = :g AND resolved_at IS NULL AND kind = 'blocker') AS open_blockers,
                  (SELECT count(*) FROM help_signal WHERE group_id = :g AND resolved_at IS NULL AND kind = 'want_help') AS want_help,
                  (SELECT count(*) FROM help_signal WHERE group_id = :g AND resolved_at IS NULL AND kind = 'can_help') AS can_help
                """).param("g", groupId).query(TeamSignals.class).single();
    }
}
