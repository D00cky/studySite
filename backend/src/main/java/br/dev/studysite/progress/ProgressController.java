package br.dev.studysite.progress;

import br.dev.studysite.activity.ActivityRepository;
import br.dev.studysite.auth.UserRepository;
import br.dev.studysite.common.ApiException;
import br.dev.studysite.curriculum.Curriculum;
import br.dev.studysite.curriculum.Model.Stage;
import br.dev.studysite.curriculum.Model.Topic;
import br.dev.studysite.curriculum.Model.WeeklyMode;
import br.dev.studysite.evidence.EvidenceRepository;
import br.dev.studysite.group.Access;
import br.dev.studysite.group.GroupRepository;
import br.dev.studysite.notes.NoteRepository;
import br.dev.studysite.review.ReviewRepository;
import br.dev.studysite.security.AppUser;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
class ProgressController {

    /** Tudo o que a pessoa já registrou num tópico, para a área de trabalho da página. */
    record TopicWorkspace(ProgressService.TopicProgress progress,
            List<ProgressService.PrerequisiteGuidance> missingPrerequisites,
            List<ActivityRepository.ResourceEvent> resourceEvents, List<ActivityRepository.Attempt> attempts,
            List<EvidenceRepository.Evidence> evidence, List<ActivityRepository.SelfAssessment> selfAssessments,
            List<NoteRepository.Note> notes) {
    }

    record NextAction(String kind, String text, String topicId, UUID refId) {
    }

    record SuggestedTopic(String topicId, String title, String reason) {
    }

    /** Painel "Continue de onde parou": retomada, uma próxima ação e pendências. */
    record ContinueView(NextAction nextAction, ActivityRepository.StudySession restartPoint,
            ProgressRepository.Demonstrated lastDemonstrated, ProgressRepository.ActiveAttempt activeAttempt,
            List<ProgressRepository.ChangesRequested> changesRequested, SuggestedTopic suggestedTopic,
            List<ReviewRepository.Feedback> recentFeedback, int reviewsToGive, WeeklyMode weeklyMode) {
    }

    record MemberProgress(UUID userId, String displayName, String role,
            Map<String, ProgressService.TopicProgress> topics) {
    }

    private final ProgressService progress;
    private final ProgressRepository progressRepo;
    private final ActivityRepository activity;
    private final EvidenceRepository evidence;
    private final NoteRepository notes;
    private final ReviewRepository reviews;
    private final UserRepository users;
    private final GroupRepository groups;
    private final Access access;
    private final Curriculum curriculum;

    ProgressController(ProgressService progress, ProgressRepository progressRepo, ActivityRepository activity,
            EvidenceRepository evidence, NoteRepository notes, ReviewRepository reviews, UserRepository users,
            GroupRepository groups, Access access, Curriculum curriculum) {
        this.progress = progress;
        this.progressRepo = progressRepo;
        this.activity = activity;
        this.evidence = evidence;
        this.notes = notes;
        this.reviews = reviews;
        this.users = users;
        this.groups = groups;
        this.access = access;
        this.curriculum = curriculum;
    }

    @GetMapping("/me/progress")
    Map<String, ProgressService.TopicProgress> myProgress(@AuthenticationPrincipal AppUser user) {
        return progress.forUser(user.id());
    }

    @GetMapping("/me/topics/{topicId}")
    TopicWorkspace topicWorkspace(@AuthenticationPrincipal AppUser user, @PathVariable String topicId) {
        Topic topic = curriculum.topic(topicId).orElseThrow(() -> ApiException.notFound("Tópico não encontrado."));
        Map<String, ProgressService.TopicProgress> mine = progress.forUser(user.id());
        UUID u = user.id();
        return new TopicWorkspace(progress.topic(mine, topicId), progress.missingPrerequisites(topic, mine),
                activity.resourceEvents(u, topicId), activity.attempts(u, topicId), evidence.mine(u, topicId, null),
                activity.selfAssessments(u, topicId), notes.mine(u, topicId));
    }

    @GetMapping("/me/continue")
    ContinueView continueFromHere(@AuthenticationPrincipal AppUser user) {
        UUID u = user.id();
        Map<String, ProgressService.TopicProgress> mine = progress.forUser(u);
        Optional<ActivityRepository.StudySession> restart = activity.lastRestartPoint(u);
        Optional<ProgressRepository.ActiveAttempt> attempt = progressRepo.activeAttempt(u);
        List<ProgressRepository.ChangesRequested> changes = progressRepo.changesRequested(u);
        SuggestedTopic suggested = suggestNextTopic(mine);
        String modeId = users.find(u).weeklyMode();
        WeeklyMode mode = curriculum.policies().weeklyModes().stream()
                .filter(m -> m.id().equals(modeId)).findFirst().orElse(null);

        // Uma única próxima ação, na ordem: o que a própria pessoa deixou anotado,
        // feedback esperando resposta, exercício em andamento, próximo tópico sugerido.
        NextAction next;
        if (restart.isPresent() && restart.get().nextAction() != null) {
            next = new NextAction("restart_note", restart.get().nextAction(), restart.get().topicId(), restart.get().id());
        } else if (!changes.isEmpty()) {
            ProgressRepository.ChangesRequested c = changes.getFirst();
            next = new NextAction("respond_feedback", "Responder ao feedback sobre \"" + c.evidenceTitle() + "\"",
                    c.topicId(), c.reviewRequestId());
        } else if (attempt.isPresent()) {
            String title = curriculum.topic(attempt.get().topicId()).map(Topic::title).orElse(attempt.get().topicId());
            next = new NextAction("continue_attempt", "Continuar o exercício de " + title, attempt.get().topicId(),
                    attempt.get().id());
        } else if (suggested != null) {
            Topic t = curriculum.topic(suggested.topicId()).orElseThrow();
            String text = t.firstAction() != null ? t.firstAction() : "Ler o objetivo de " + t.title();
            next = new NextAction("start_topic", text, t.id(), null);
        } else {
            next = new NextAction("explore", "Escolha um tópico no roadmap.", null, null);
        }

        return new ContinueView(next, restart.orElse(null), progressRepo.lastDemonstrated(u).orElse(null),
                attempt.orElse(null), changes, suggested, reviews.recentFeedbackFor(u, 5),
                reviews.awaitingReviewBy(u).size(), mode);
    }

    @GetMapping("/groups/{groupId}/progress")
    List<MemberProgress> groupProgress(@AuthenticationPrincipal AppUser user, @PathVariable UUID groupId) {
        access.requireMember(groupId, user.id());
        return groups.members(groupId).stream()
                .map(m -> new MemberProgress(m.userId(), m.displayName(), m.role(),
                        progress.sharedForMember(m.userId(), groupId)))
                .toList();
    }

    /**
     * Primeiro tópico já escrito, ainda não demonstrado, cujos pré-requisitos têm base
     * suficiente — seguindo a ordem das etapas do tronco comum.
     */
    private SuggestedTopic suggestNextTopic(Map<String, ProgressService.TopicProgress> mine) {
        List<String> coreOrder = curriculum.stages().stream().filter(s -> "core".equals(s.kind()))
                .sorted(Comparator.comparingInt(Stage::order)).map(Stage::id).toList();
        for (String stageId : coreOrder) {
            for (Topic t : curriculum.topics()) {
                if (!t.stage().equals(stageId) || !"authored".equals(t.status())) {
                    continue;
                }
                ProgressService.TopicProgress p = progress.topic(mine, t.id());
                if (p.demonstrated()) {
                    continue;
                }
                if (progress.missingPrerequisites(t, mine).isEmpty()) {
                    String reason = p.status().equals("not_started")
                            ? "Pré-requisitos com base suficiente e ainda não iniciado."
                            : "Em andamento, ainda sem evidência aceita em revisão.";
                    return new SuggestedTopic(t.id(), t.title(), reason);
                }
            }
        }
        return null;
    }
}
