package br.dev.studysite.team;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

@Repository
public class TeamRepository {

    public record TeamSession(UUID id, UUID groupId, String title, OffsetDateTime scheduledFor, String topicId,
            String agenda, String findings, String nextSteps, UUID createdBy, OffsetDateTime createdAt,
            OffsetDateTime updatedAt) {
    }

    public record RoleAssignment(UUID userId, String displayName, String role, String contribution) {
    }

    public record GroupProject(UUID id, UUID groupId, String projectId, UUID startedBy, OffsetDateTime createdAt) {
    }

    public record MilestoneStatus(String milestoneId, String status, UUID updatedBy, String updatedByName,
            OffsetDateTime updatedAt) {
    }

    public record HelpSignal(UUID id, UUID groupId, UUID userId, String displayName, String topicId, String kind,
            String body, OffsetDateTime resolvedAt, OffsetDateTime createdAt) {
    }

    private static final String SESSION_COLS = "id, group_id, title, scheduled_for, topic_id, agenda, findings, "
            + "next_steps, created_by, created_at, updated_at";

    private final JdbcClient jdbc;

    public TeamRepository(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    // --- sessões do time ---------------------------------------------------------

    public UUID createSession(UUID groupId, UUID createdBy, String title, OffsetDateTime scheduledFor,
            String topicId, String agenda) {
        return jdbc.sql("""
                INSERT INTO team_session (group_id, created_by, title, scheduled_for, topic_id, agenda)
                VALUES (?, ?, ?, ?, ?, ?) RETURNING id
                """).params(groupId, createdBy, title, scheduledFor, topicId, agenda == null ? "" : agenda)
                .query(UUID.class).single();
    }

    public Optional<TeamSession> findSession(UUID id) {
        return jdbc.sql("SELECT " + SESSION_COLS + " FROM team_session WHERE id = ?")
                .param(id).query(TeamSession.class).optional();
    }

    public List<TeamSession> sessions(UUID groupId) {
        return jdbc.sql("SELECT " + SESSION_COLS + " FROM team_session WHERE group_id = ? "
                        + "ORDER BY coalesce(scheduled_for, created_at) DESC LIMIT 100")
                .param(groupId).query(TeamSession.class).list();
    }

    public long sessionCount(UUID groupId) {
        return jdbc.sql("SELECT count(*) FROM team_session WHERE group_id = ?").param(groupId).query(Long.class).single();
    }

    public void updateSession(UUID id, String title, OffsetDateTime scheduledFor, String topicId, String agenda,
            String findings, String nextSteps) {
        jdbc.sql("""
                UPDATE team_session SET title = coalesce(?, title), scheduled_for = coalesce(?, scheduled_for),
                       topic_id = coalesce(?, topic_id), agenda = coalesce(?, agenda),
                       findings = coalesce(?, findings), next_steps = coalesce(?, next_steps), updated_at = now()
                WHERE id = ?
                """).params(title, scheduledFor, topicId, agenda, findings, nextSteps, id).update();
    }

    public List<RoleAssignment> roles(UUID sessionId) {
        return jdbc.sql("""
                SELECT r.user_id, u.display_name, r.role, r.contribution
                FROM team_session_role r JOIN app_user u ON u.id = r.user_id
                WHERE r.team_session_id = ?
                ORDER BY array_position(ARRAY['author','challenger','reviewer','synthesizer'], r.role), u.display_name
                """).param(sessionId).query(RoleAssignment.class).list();
    }

    public boolean holdsRole(UUID sessionId, UUID userId) {
        return jdbc.sql("SELECT EXISTS (SELECT 1 FROM team_session_role WHERE team_session_id = ? AND user_id = ?)")
                .params(sessionId, userId).query(Boolean.class).single();
    }

    /** Substitui as atribuições, preservando contribuições já escritas por quem continua no mesmo papel. */
    public void replaceRoles(UUID sessionId, List<UUID> userIds, List<String> roles) {
        jdbc.sql("""
                DELETE FROM team_session_role r WHERE r.team_session_id = ?
                  AND NOT EXISTS (SELECT 1 FROM unnest(?::uuid[], ?::text[]) AS n(user_id, role)
                                  WHERE n.user_id = r.user_id AND n.role = r.role)
                """).params(sessionId, userIds.toArray(UUID[]::new), roles.toArray(String[]::new)).update();
        for (int i = 0; i < userIds.size(); i++) {
            jdbc.sql("INSERT INTO team_session_role (team_session_id, user_id, role) VALUES (?, ?, ?) ON CONFLICT DO NOTHING")
                    .params(sessionId, userIds.get(i), roles.get(i)).update();
        }
    }

    public boolean setContribution(UUID sessionId, UUID userId, String role, String contribution) {
        return jdbc.sql("UPDATE team_session_role SET contribution = ? WHERE team_session_id = ? AND user_id = ? AND role = ?")
                .params(contribution, sessionId, userId, role).update() == 1;
    }

    // --- projetos do grupo ---------------------------------------------------------

    public UUID startProject(UUID groupId, String projectId, UUID startedBy) {
        return jdbc.sql("INSERT INTO group_project (group_id, project_id, started_by) VALUES (?, ?, ?) RETURNING id")
                .params(groupId, projectId, startedBy).query(UUID.class).single();
    }

    public Optional<GroupProject> findProject(UUID id) {
        return jdbc.sql("SELECT id, group_id, project_id, started_by, created_at FROM group_project WHERE id = ?")
                .param(id).query(GroupProject.class).optional();
    }

    public List<GroupProject> projects(UUID groupId) {
        return jdbc.sql("SELECT id, group_id, project_id, started_by, created_at FROM group_project WHERE group_id = ? ORDER BY created_at")
                .param(groupId).query(GroupProject.class).list();
    }

    public List<MilestoneStatus> milestones(UUID groupProjectId) {
        return jdbc.sql("""
                SELECT m.milestone_id, m.status, m.updated_by, u.display_name AS updated_by_name, m.updated_at
                FROM group_project_milestone m JOIN app_user u ON u.id = m.updated_by
                WHERE m.group_project_id = ?
                """).param(groupProjectId).query(MilestoneStatus.class).list();
    }

    public void setMilestone(UUID groupProjectId, String milestoneId, String status, UUID userId) {
        jdbc.sql("""
                INSERT INTO group_project_milestone (group_project_id, milestone_id, status, updated_by)
                VALUES (?, ?, ?, ?)
                ON CONFLICT (group_project_id, milestone_id)
                DO UPDATE SET status = excluded.status, updated_by = excluded.updated_by, updated_at = now()
                """).params(groupProjectId, milestoneId, status, userId).update();
    }

    // --- sinais de ajuda ---------------------------------------------------------

    private static final String SIGNAL_SELECT = """
            SELECT s.id, s.group_id, s.user_id, u.display_name, s.topic_id, s.kind, s.body, s.resolved_at, s.created_at
            FROM help_signal s JOIN app_user u ON u.id = s.user_id
            """;

    public UUID addSignal(UUID groupId, UUID userId, String topicId, String kind, String body) {
        return jdbc.sql("INSERT INTO help_signal (group_id, user_id, topic_id, kind, body) VALUES (?, ?, ?, ?, ?) RETURNING id")
                .params(groupId, userId, topicId, kind, body).query(UUID.class).single();
    }

    public Optional<HelpSignal> findSignal(UUID id) {
        return jdbc.sql(SIGNAL_SELECT + " WHERE s.id = ?").param(id).query(HelpSignal.class).optional();
    }

    public List<HelpSignal> signals(UUID groupId, boolean openOnly) {
        return jdbc.sql(SIGNAL_SELECT + " WHERE s.group_id = ? AND (NOT ? OR s.resolved_at IS NULL) ORDER BY s.created_at DESC LIMIT 200")
                .params(groupId, openOnly).query(HelpSignal.class).list();
    }

    public void resolveSignal(UUID id) {
        jdbc.sql("UPDATE help_signal SET resolved_at = now() WHERE id = ? AND resolved_at IS NULL").param(id).update();
    }
}
