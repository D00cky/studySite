package br.dev.studysite.group;

import br.dev.studysite.common.ApiException;
import java.util.Optional;
import java.util.UUID;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Component;

/**
 * Regras de autorização baseadas em participação em grupo.
 *
 * <p>Quem não é membro recebe 404 em vez de 403, para não revelar que o grupo
 * (ou um registro dele) existe.
 */
@Component
public class Access {

    public static final String MENTOR = "mentor";
    public static final String LEARNER = "learner";

    private final JdbcClient jdbc;

    public Access(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    public Optional<String> role(UUID groupId, UUID userId) {
        return jdbc.sql("SELECT role FROM group_member WHERE group_id = ? AND user_id = ?")
                .params(groupId, userId)
                .query(String.class)
                .optional();
    }

    /** Garante que a pessoa participa do grupo e devolve o papel dela. */
    public String requireMember(UUID groupId, UUID userId) {
        return role(groupId, userId).orElseThrow(() -> ApiException.notFound("Grupo não encontrado."));
    }

    public void requireMentor(UUID groupId, UUID userId) {
        if (!MENTOR.equals(requireMember(groupId, userId))) {
            throw ApiException.forbidden("Apenas mentores podem fazer isso.");
        }
    }

    public boolean shareAGroup(UUID userA, UUID userB) {
        return jdbc.sql("""
                SELECT EXISTS (
                  SELECT 1 FROM group_member a JOIN group_member b ON a.group_id = b.group_id
                  WHERE a.user_id = ? AND b.user_id = ?)
                """).params(userA, userB).query(Boolean.class).single();
    }
}
