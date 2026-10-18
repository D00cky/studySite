package br.dev.studysite;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.time.temporal.TemporalAdjusters;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.simple.JdbcClient;
import tools.jackson.databind.JsonNode;

/** Blocos de foco (pomodoro) e as métricas de tempo estudado. */
class FocusIntegrationTest extends IntegrationTest {

    @Autowired
    JdbcClient jdbc;

    private UUID idOf(ApiClient client) {
        return UUID.fromString(client.get("/api/auth/me").expect(200).text("id"));
    }

    /** Bloco já terminado: começou há {@code startedAgo} e durou {@code lasted} minutos (planejados {@code planned}). */
    private void pastBlock(UUID user, String kind, String topic, String startedAgo, int planned, int lasted) {
        jdbc.sql("""
                INSERT INTO focus_block (user_id, kind, topic_id, planned_minutes, started_at, ended_at)
                VALUES (?, ?, ?, ?, now() - ?::interval, now() - ?::interval + make_interval(mins => ?))
                """).params(user, kind, topic, planned, startedAgo, startedAgo, lasted).update();
    }

    @Test
    void startExtendAndStopAFocusBlock() {
        ApiClient lia = register("Lia");
        JsonNode block = lia.post("/api/me/focus-blocks", """
                {"kind": "focus", "plannedMinutes": 25, "topicId": "pointers"}
                """).expect(201).json();
        String id = block.get("id").asString();
        assertThat(block.get("plannedMinutes").asInt()).isEqualTo(25);
        assertThat(block.get("topicId").asString()).isEqualTo("pointers");
        assertThat(block.hasNonNull("endedAt")).isFalse();

        assertThat(lia.get("/api/me/focus-blocks/current").expect(200).text("id")).isEqualTo(id);
        lia.post("/api/me/focus-blocks", """
                {"kind": "focus", "plannedMinutes": 25}
                """).expect(409);

        assertThat(lia.patch("/api/me/focus-blocks/" + id, """
                {"plannedMinutes": 30}
                """).expect(200).json().get("plannedMinutes").asInt()).isEqualTo(30);
        JsonNode ended = lia.patch("/api/me/focus-blocks/" + id, """
                {"end": true}
                """).expect(200).json();
        assertThat(ended.hasNonNull("endedAt")).isTrue();
        lia.get("/api/me/focus-blocks/current").expect(204);
    }

    @Test
    void focusBlocksAreValidatedAndPrivate() {
        ApiClient lia = register("Lia");
        ApiClient caio = register("Caio");
        lia.post("/api/me/focus-blocks", """
                {"kind": "focus", "plannedMinutes": 0}
                """).expect(400);
        lia.post("/api/me/focus-blocks", """
                {"kind": "nap", "plannedMinutes": 25}
                """).expect(400);
        lia.post("/api/me/focus-blocks", """
                {"kind": "focus", "plannedMinutes": 25, "topicId": "nao-existe"}
                """).expect(400);
        String id = lia.post("/api/me/focus-blocks", """
                {"kind": "focus", "plannedMinutes": 25}
                """).expect(201).text("id");
        caio.patch("/api/me/focus-blocks/" + id, """
                {"end": true}
                """).expect(404);
        caio.get("/api/me/focus-blocks/current").expect(204);
    }

    @Test
    void forgottenBlockClosesAtItsPlannedEndAndCountsOnlyThePlannedTime() {
        ApiClient lia = register("Lia");
        UUID user = idOf(lia);
        jdbc.sql("""
                INSERT INTO focus_block (user_id, kind, planned_minutes, started_at)
                VALUES (?, 'focus', 25, now() - interval '3 hours')
                """).params(user).update();

        lia.get("/api/me/focus-blocks/current").expect(204);
        JsonNode metrics = lia.get("/api/me/metrics?tz=UTC").expect(200).json();
        assertThat(metrics.get("totalMinutes").asInt()).isEqualTo(25);
        assertThat(metrics.get("focusBlocks").asInt()).isEqualTo(1);
    }

    @Test
    void metricsSumFocusTimeByWeekHourWeekdayAndTopic() {
        ApiClient lia = register("Lia");
        UUID user = idOf(lia);
        pastBlock(user, "focus", "pointers", "2 days", 25, 25);
        pastBlock(user, "focus", "pointers", "3 days", 40, 20);   // parou cedo: conta 20
        pastBlock(user, "focus", "c-strings", "4 days", 25, 90);  // esqueceu de parar: conta 25
        pastBlock(user, "break", null, "2 days", 5, 5);           // pausa não é estudo
        pastBlock(user, "focus", "pointers", "20 weeks", 50, 50); // fora da janela semanal, mas no total
        pastBlock(user, "focus", "pointers", "5 days", 25, 0);    // encerrado logo depois de começar: não é um bloco

        ApiClient caio = register("Caio");
        pastBlock(idOf(caio), "focus", "pointers", "1 day", 25, 25);

        JsonNode m = lia.get("/api/me/metrics?tz=UTC&weeks=8").expect(200).json();
        assertThat(m.get("totalMinutes").asInt()).isEqualTo(25 + 20 + 25 + 50);
        assertThat(m.get("focusBlocks").asInt()).isEqualTo(4);
        assertThat(m.get("medianBlockMinutes").asInt()).isEqualTo(25);
        assertThat(m.hasNonNull("firstFocusAt")).isTrue();

        JsonNode weeks = m.get("weeks");
        assertThat(weeks.size()).isEqualTo(8);
        LocalDate monday = LocalDate.now(ZoneOffset.UTC).with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
        assertThat(weeks.get(7).get("weekStart").asString()).isEqualTo(monday.toString());
        int inWindow = 0;
        for (JsonNode w : weeks) inWindow += w.get("minutes").asInt();
        assertThat(inWindow).isEqualTo(25 + 20 + 25);

        int byHour = 0;
        for (JsonNode h : m.get("byHour")) byHour += h.asInt();
        assertThat(m.get("byHour").size()).isEqualTo(24);
        assertThat(byHour).isEqualTo(120);
        assertThat(m.get("byWeekday").size()).isEqualTo(7);

        JsonNode topics = m.get("topics");
        assertThat(topics.get(0).get("topicId").asString()).isEqualTo("pointers");
        assertThat(topics.get(0).get("minutes").asInt()).isEqualTo(25 + 20 + 50);
        assertThat(topics.get(1).get("topicId").asString()).isEqualTo("c-strings");
    }

    @Test
    void metricsRejectAnUnknownTimeZone() {
        register("Lia").get("/api/me/metrics?tz=Lua/Base").expect(400);
    }
}
