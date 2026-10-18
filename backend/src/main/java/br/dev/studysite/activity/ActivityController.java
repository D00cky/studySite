package br.dev.studysite.activity;

import br.dev.studysite.common.ApiException;
import br.dev.studysite.curriculum.Curriculum;
import br.dev.studysite.curriculum.Model.Topic;
import br.dev.studysite.security.AppUser;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
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

/** Registros pessoais da pessoa autenticada: tudo aqui é privado. */
@RestController
@RequestMapping("/api/me")
class ActivityController {

    record NewResourceEvent(@NotBlank String resourceId, String topicId,
            @NotBlank @Pattern(regexp = "opened|finished") String kind, @Size(max = 4000) String note) {
    }

    record NewAttempt(@NotBlank String topicId, String exerciseId, @Size(max = 4000) String prediction) {
    }

    record AttemptUpdate(@Size(max = 4000) String prediction, @Size(max = 20000) String notes,
            @Size(max = 4000) String aiAssistance, @Pattern(regexp = "in_progress|submitted|abandoned") String status) {
    }

    record NewSelfAssessment(@NotBlank String topicId, @NotNull @Min(0) @Max(4) Integer level,
            @Size(max = 4000) String note) {
    }

    record NewStudySession(@NotBlank @Pattern(regexp = "survival|compact|standard|expansion|rescue") String mode,
            String topicId) {
    }

    record StudySessionUpdate(String topicId, @Size(max = 4000) String summary, @Size(max = 4000) String restartNote,
            @Size(max = 1000) String nextAction, Boolean end) {
    }

    private final ActivityRepository activity;
    private final Curriculum curriculum;

    ActivityController(ActivityRepository activity, Curriculum curriculum) {
        this.activity = activity;
        this.curriculum = curriculum;
    }

    @PostMapping("/resource-events")
    @ResponseStatus(HttpStatus.CREATED)
    ActivityRepository.ResourceEvent addResourceEvent(@AuthenticationPrincipal AppUser user,
            @Valid @RequestBody NewResourceEvent body) {
        curriculum.checkResource(body.resourceId());
        curriculum.checkTopic(body.topicId());
        return activity.addResourceEvent(user.id(), body.resourceId(), body.topicId(), body.kind(), body.note());
    }

    @GetMapping("/resource-events")
    List<ActivityRepository.ResourceEvent> resourceEvents(@AuthenticationPrincipal AppUser user,
            @RequestParam(required = false) String topicId) {
        return activity.resourceEvents(user.id(), topicId);
    }

    @PostMapping("/attempts")
    @ResponseStatus(HttpStatus.CREATED)
    ActivityRepository.Attempt startAttempt(@AuthenticationPrincipal AppUser user, @Valid @RequestBody NewAttempt body) {
        Topic topic = curriculum.topic(body.topicId())
                .orElseThrow(() -> ApiException.badRequest("Tópico desconhecido: " + body.topicId()));
        String exerciseId = body.exerciseId();
        if (topic.exercise() != null) {
            if (exerciseId == null) {
                exerciseId = topic.exercise().id();
            } else if (!exerciseId.equals(topic.exercise().id())) {
                throw ApiException.badRequest("Exercício não pertence a este tópico.");
            }
        } else if (exerciseId == null || !exerciseId.matches("[a-z0-9]+(-[a-z0-9]+)*")) {
            // Tópicos ainda planejados não têm exercício oficial: a pessoa nomeia a prática livre.
            throw ApiException.badRequest("Informe exerciseId (kebab-case) para tópicos sem exercício definido.");
        }
        return activity.startAttempt(user.id(), topic.id(), exerciseId, body.prediction());
    }

    @PatchMapping("/attempts/{id}")
    ActivityRepository.Attempt updateAttempt(@AuthenticationPrincipal AppUser user, @PathVariable UUID id,
            @Valid @RequestBody AttemptUpdate body) {
        return activity.updateAttempt(user.id(), id, body.prediction(), body.notes(), body.aiAssistance(), body.status())
                .orElseThrow(() -> ApiException.notFound("Tentativa não encontrada."));
    }

    @GetMapping("/attempts")
    List<ActivityRepository.Attempt> attempts(@AuthenticationPrincipal AppUser user,
            @RequestParam(required = false) String topicId) {
        return activity.attempts(user.id(), topicId);
    }

    @PostMapping("/self-assessments")
    @ResponseStatus(HttpStatus.CREATED)
    ActivityRepository.SelfAssessment addSelfAssessment(@AuthenticationPrincipal AppUser user,
            @Valid @RequestBody NewSelfAssessment body) {
        curriculum.checkTopic(body.topicId());
        return activity.addSelfAssessment(user.id(), body.topicId(), body.level(), body.note());
    }

    @GetMapping("/self-assessments")
    List<ActivityRepository.SelfAssessment> selfAssessments(@AuthenticationPrincipal AppUser user,
            @RequestParam(required = false) String topicId) {
        return activity.selfAssessments(user.id(), topicId);
    }

    @PostMapping("/study-sessions")
    @ResponseStatus(HttpStatus.CREATED)
    ActivityRepository.StudySession startSession(@AuthenticationPrincipal AppUser user,
            @Valid @RequestBody NewStudySession body) {
        curriculum.checkTopic(body.topicId());
        return activity.startSession(user.id(), body.mode(), body.topicId());
    }

    @PatchMapping("/study-sessions/{id}")
    ActivityRepository.StudySession updateSession(@AuthenticationPrincipal AppUser user, @PathVariable UUID id,
            @Valid @RequestBody StudySessionUpdate body) {
        curriculum.checkTopic(body.topicId());
        return activity.updateSession(user.id(), id, body.topicId(), body.summary(), body.restartNote(),
                        body.nextAction(), Boolean.TRUE.equals(body.end()))
                .orElseThrow(() -> ApiException.notFound("Sessão não encontrada."));
    }

    @GetMapping("/study-sessions")
    List<ActivityRepository.StudySession> sessions(@AuthenticationPrincipal AppUser user,
            @RequestParam(defaultValue = "20") int limit) {
        return activity.sessions(user.id(), Math.clamp(limit, 1, 100));
    }
}
