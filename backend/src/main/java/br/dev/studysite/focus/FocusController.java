package br.dev.studysite.focus;

import br.dev.studysite.common.ApiException;
import br.dev.studysite.curriculum.Curriculum;
import br.dev.studysite.focus.FocusRepository.DayMinutes;
import br.dev.studysite.focus.FocusRepository.FocusBlock;
import br.dev.studysite.focus.FocusRepository.TopicMinutes;
import br.dev.studysite.focus.FocusRepository.WeekMinutes;
import br.dev.studysite.security.AppUser;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.temporal.TemporalAdjusters;
import java.util.List;
import java.util.TreeSet;
import java.util.UUID;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/**
 * Pomodoro e métricas de tempo estudado da pessoa autenticada. Sem sequências nem metas
 * diárias: as métricas mostram quanto e quando, nunca "dias seguidos".
 */
@RestController
@RequestMapping("/api/me")
class FocusController {

    record NewFocusBlock(@NotNull @Pattern(regexp = "focus|break") String kind,
            @NotNull @Min(1) @Max(180) Integer plannedMinutes, String topicId) {
    }

    record FocusBlockUpdate(@Min(1) @Max(180) Integer plannedMinutes, Boolean end) {
    }

    record Metrics(int totalMinutes, int focusBlocks, int medianBlockMinutes, OffsetDateTime firstFocusAt,
            int thisWeekMinutes, List<WeekMinutes> weeks, int[] byHour, int[] byWeekday, List<TopicMinutes> topics) {
    }

    record Calendar(Integer year, LocalDate from, LocalDate to, List<DayMinutes> days, List<Integer> years) {
    }

    private final FocusRepository focus;
    private final Curriculum curriculum;

    FocusController(FocusRepository focus, Curriculum curriculum) {
        this.focus = focus;
        this.curriculum = curriculum;
    }

    @PostMapping("/focus-blocks")
    @ResponseStatus(HttpStatus.CREATED)
    FocusBlock start(@AuthenticationPrincipal AppUser user, @Valid @RequestBody NewFocusBlock body) {
        curriculum.checkTopic(body.topicId());
        try {
            return focus.start(user.id(), body.kind(), body.plannedMinutes(), body.topicId());
        } catch (DuplicateKeyException e) {
            throw ApiException.conflict("Já existe um bloco em andamento. Encerre-o antes de começar outro.");
        }
    }

    @GetMapping("/focus-blocks/current")
    ResponseEntity<FocusBlock> current(@AuthenticationPrincipal AppUser user) {
        return focus.current(user.id()).map(ResponseEntity::ok).orElseGet(() -> ResponseEntity.noContent().build());
    }

    @PatchMapping("/focus-blocks/{id}")
    FocusBlock update(@AuthenticationPrincipal AppUser user, @PathVariable UUID id,
            @Valid @RequestBody FocusBlockUpdate body) {
        return focus.update(user.id(), id, body.plannedMinutes(), Boolean.TRUE.equals(body.end()))
                .orElseThrow(() -> ApiException.notFound("Bloco não encontrado."));
    }

    /** Só nomes IANA: offsets como "+03:00" têm o sinal invertido no PostgreSQL. */
    private static void checkZone(String tz) {
        if (!"UTC".equals(tz) && !ZoneId.getAvailableZoneIds().contains(tz)) {
            throw ApiException.badRequest("Fuso horário desconhecido: " + tz);
        }
    }

    /**
     * Calendário de estudo no estilo do GitHub: minutos por dia de um ano, ou das últimas
     * 53 semanas (começando numa segunda) quando nenhum ano é pedido.
     */
    @GetMapping("/focus-calendar")
    Calendar calendar(@AuthenticationPrincipal AppUser user, @RequestParam(defaultValue = "UTC") String tz,
            @RequestParam(required = false) Integer year) {
        checkZone(tz);
        if (year != null && (year < 2000 || year > 2100)) {
            throw ApiException.badRequest("Ano fora do intervalo: " + year);
        }
        focus.closeStale(user.id());
        LocalDate today = LocalDate.now(ZoneId.of(tz));
        LocalDate from = year != null ? LocalDate.of(year, 1, 1)
                : today.minusWeeks(52).with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
        LocalDate to = year != null ? LocalDate.of(year, 12, 31) : today;
        TreeSet<Integer> years = new TreeSet<>(focus.years(user.id(), tz));
        years.add(today.getYear());
        return new Calendar(year, from, to, focus.days(user.id(), tz, from, to), List.copyOf(years));
    }

    @GetMapping("/metrics")
    Metrics metrics(@AuthenticationPrincipal AppUser user, @RequestParam(defaultValue = "UTC") String tz,
            @RequestParam(defaultValue = "8") int weeks) {
        checkZone(tz);
        int window = Math.clamp(weeks, 1, 52);
        focus.closeStale(user.id());
        var totals = focus.totals(user.id());
        List<WeekMinutes> byWeek = focus.weeks(user.id(), tz, window);
        int[] byHour = new int[24];
        focus.buckets(user.id(), tz, "hour").forEach(b -> byHour[b.bucket()] = b.minutes());
        int[] byWeekday = new int[7];
        focus.buckets(user.id(), tz, "isodow").forEach(b -> byWeekday[b.bucket() - 1] = b.minutes());
        return new Metrics(totals.totalMinutes(), totals.focusBlocks(), totals.medianBlockMinutes(),
                totals.firstFocusAt(), byWeek.isEmpty() ? 0 : byWeek.getLast().minutes(), byWeek, byHour, byWeekday,
                focus.topics(user.id(), 8));
    }
}
