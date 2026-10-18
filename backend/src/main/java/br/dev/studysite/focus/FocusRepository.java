package br.dev.studysite.focus;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

/** Blocos de foco de uma pessoa. Privados: toda consulta filtra por user_id. */
@Repository
public class FocusRepository {

    public record FocusBlock(UUID id, String kind, String topicId, int plannedMinutes, OffsetDateTime startedAt,
            OffsetDateTime endedAt) {
    }

    public record WeekMinutes(LocalDate weekStart, int minutes, int blocks) {
    }

    public record TopicMinutes(String topicId, int minutes) {
    }

    public record DayMinutes(LocalDate date, int minutes) {
    }

    record Totals(int totalMinutes, int focusBlocks, int medianBlockMinutes, OffsetDateTime firstFocusAt) {
    }

    record Bucket(int bucket, int minutes) {
    }

    private static final String COLS = "id, kind, topic_id, planned_minutes, started_at, ended_at";

    /** Minutos contados de um bloco terminado: o tempo real, limitado ao planejado. */
    private static final String COUNTED = """
            greatest(0, extract(epoch FROM least(ended_at, started_at + make_interval(mins => planned_minutes))
                                         - started_at) / 60)""";

    private final JdbcClient jdbc;

    public FocusRepository(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    /** Fecha no fim planejado os blocos que ficaram abertos (aba fechada, timer esquecido). */
    public void closeStale(UUID userId) {
        jdbc.sql("""
                UPDATE focus_block SET ended_at = started_at + make_interval(mins => planned_minutes)
                WHERE user_id = ? AND ended_at IS NULL AND started_at + make_interval(mins => planned_minutes) < now()
                """).params(userId).update();
    }

    public Optional<FocusBlock> current(UUID userId) {
        closeStale(userId);
        return jdbc.sql("SELECT " + COLS + " FROM focus_block WHERE user_id = ? AND ended_at IS NULL")
                .params(userId).query(FocusBlock.class).optional();
    }

    public FocusBlock start(UUID userId, String kind, int plannedMinutes, String topicId) {
        closeStale(userId);
        return jdbc.sql("INSERT INTO focus_block (user_id, kind, planned_minutes, topic_id) VALUES (?, ?, ?, ?) RETURNING "
                        + COLS)
                .params(userId, kind, plannedMinutes, topicId).query(FocusBlock.class).single();
    }

    /** Estende o planejado e/ou encerra o bloco (agora, mas nunca depois do fim planejado). */
    public Optional<FocusBlock> update(UUID userId, UUID id, Integer plannedMinutes, boolean end) {
        return jdbc.sql("""
                UPDATE focus_block SET
                  planned_minutes = coalesce(?, planned_minutes),
                  ended_at = CASE WHEN ? AND ended_at IS NULL
                                  THEN least(now(), started_at + make_interval(mins => coalesce(?, planned_minutes)))
                                  ELSE ended_at END
                WHERE id = ? AND user_id = ?
                RETURNING """ + " " + COLS)
                .params(plannedMinutes, end, plannedMinutes, id, userId).query(FocusBlock.class).optional();
    }

    // --- métricas (só blocos de foco terminados; menos de 1 minuto não conta como bloco) ----

    Totals totals(UUID userId) {
        return jdbc.sql("""
                SELECT coalesce(round(sum(m)), 0)::int AS total_minutes,
                       (count(*) FILTER (WHERE m >= 1))::int AS focus_blocks,
                       coalesce(round(percentile_cont(0.5) WITHIN GROUP (ORDER BY m) FILTER (WHERE m >= 1)), 0)::int
                         AS median_block_minutes,
                       min(started_at) AS first_focus_at
                FROM (SELECT started_at, %s AS m FROM focus_block
                      WHERE user_id = ? AND kind = 'focus' AND ended_at IS NOT NULL) b
                """.formatted(COUNTED)).params(userId).query(Totals.class).single();
    }

    /** As últimas {@code weeks} semanas (segunda a domingo, no fuso dado), incluindo as vazias. */
    List<WeekMinutes> weeks(UUID userId, String zone, int weeks) {
        return jdbc.sql("""
                WITH series AS (
                  SELECT generate_series(date_trunc('week', now() AT TIME ZONE :zone) - make_interval(weeks => :weeks - 1),
                                         date_trunc('week', now() AT TIME ZONE :zone), interval '1 week')::date AS week_start
                ), b AS (
                  SELECT date_trunc('week', started_at AT TIME ZONE :zone)::date AS week_start, %s AS m
                  FROM focus_block WHERE user_id = :user AND kind = 'focus' AND ended_at IS NOT NULL
                )
                SELECT s.week_start, coalesce(round(sum(b.m)), 0)::int AS minutes, (count(*) FILTER (WHERE b.m >= 1))::int AS blocks
                FROM series s LEFT JOIN b ON b.week_start = s.week_start
                GROUP BY s.week_start ORDER BY s.week_start
                """.formatted(COUNTED))
                .param("zone", zone).param("weeks", weeks).param("user", userId)
                .query(WeekMinutes.class).list();
    }

    /** Minutos por hora do dia (0–23) ou dia da semana ISO (1 = segunda … 7 = domingo), no fuso dado. */
    List<Bucket> buckets(UUID userId, String zone, String field) {
        return jdbc.sql("""
                SELECT extract(%s FROM started_at AT TIME ZONE :zone)::int AS bucket, round(sum(%s))::int AS minutes
                FROM focus_block WHERE user_id = :user AND kind = 'focus' AND ended_at IS NOT NULL
                GROUP BY 1
                """.formatted(field, COUNTED))
                .param("zone", zone).param("user", userId).query(Bucket.class).list();
    }

    List<TopicMinutes> topics(UUID userId, int limit) {
        return jdbc.sql("""
                SELECT topic_id, round(sum(%s))::int AS minutes
                FROM focus_block WHERE user_id = ? AND kind = 'focus' AND ended_at IS NOT NULL AND topic_id IS NOT NULL
                GROUP BY topic_id ORDER BY minutes DESC, topic_id LIMIT ?
                """.formatted(COUNTED)).params(userId, limit).query(TopicMinutes.class).list();
    }

    /** Minutos de foco por dia local (só dias com estudo), entre {@code from} e {@code to} inclusive. */
    List<DayMinutes> days(UUID userId, String zone, LocalDate from, LocalDate to) {
        return jdbc.sql("""
                SELECT (started_at AT TIME ZONE :zone)::date AS date, round(sum(%s))::int AS minutes
                FROM focus_block
                WHERE user_id = :user AND kind = 'focus' AND ended_at IS NOT NULL
                  AND (started_at AT TIME ZONE :zone)::date BETWEEN :from AND :to
                GROUP BY 1 HAVING round(sum(%s)) >= 1 ORDER BY 1
                """.formatted(COUNTED, COUNTED))
                .param("zone", zone).param("user", userId).param("from", from).param("to", to)
                .query(DayMinutes.class).list();
    }

    /** Anos (no fuso dado) em que houve algum bloco de foco. */
    List<Integer> years(UUID userId, String zone) {
        return jdbc.sql("""
                SELECT DISTINCT extract(year FROM started_at AT TIME ZONE :zone)::int AS year
                FROM focus_block WHERE user_id = :user AND kind = 'focus' AND ended_at IS NOT NULL ORDER BY 1
                """).param("zone", zone).param("user", userId).query(Integer.class).list();
    }
}
