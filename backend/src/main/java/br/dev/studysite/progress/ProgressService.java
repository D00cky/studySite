package br.dev.studysite.progress;

import br.dev.studysite.curriculum.Curriculum;
import br.dev.studysite.curriculum.Model.Topic;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;

/**
 * Deriva o estado de cada tópico a partir dos registros separados.
 *
 * <ul>
 *   <li>not_started — nenhum registro</li>
 *   <li>exploring — abriu recursos ou se autoavaliou</li>
 *   <li>practicing — iniciou tentativa de exercício</li>
 *   <li>evidence — registrou evidência</li>
 *   <li>demonstrated — evidência própria aceita em revisão</li>
 * </ul>
 * Ler ou assistir nunca leva além de "exploring".
 */
@Service
public class ProgressService {

    public record TopicProgress(String topicId, String status, long resourcesOpened, long resourcesFinished,
            long attempts, long submittedAttempts, long evidence, long sharedEvidence, long acceptedReviews,
            Integer selfLevel) {

        static TopicProgress empty(String topicId) {
            return new TopicProgress(topicId, "not_started", 0, 0, 0, 0, 0, 0, 0, null);
        }

        public boolean demonstrated() {
            return acceptedReviews > 0;
        }

        /** Base suficiente para seguir adiante (orientação, nunca bloqueio). */
        public boolean foundationReady() {
            return demonstrated() || evidence > 0 || (selfLevel != null && selfLevel >= 2);
        }
    }

    public record PrerequisiteGuidance(String topicId, String title, String status, String objective,
            String firstAction) {
    }

    private final ProgressRepository repo;
    private final Curriculum curriculum;

    ProgressService(ProgressRepository repo, Curriculum curriculum) {
        this.repo = repo;
        this.curriculum = curriculum;
    }

    public Map<String, TopicProgress> forUser(UUID userId) {
        return toMap(repo.topicCounts(userId));
    }

    public Map<String, TopicProgress> sharedForMember(UUID memberId, UUID groupId) {
        return toMap(repo.sharedTopicCounts(memberId, groupId));
    }

    public TopicProgress topic(Map<String, TopicProgress> progress, String topicId) {
        return progress.getOrDefault(topicId, TopicProgress.empty(topicId));
    }

    /** Pré-requisitos sem base suficiente, com uma sugestão de por onde começar. */
    public List<PrerequisiteGuidance> missingPrerequisites(Topic topic, Map<String, TopicProgress> progress) {
        return topic.prerequisites().stream()
                .filter(id -> !topic(progress, id).foundationReady())
                .map(id -> curriculum.topic(id).orElseThrow())
                .map(p -> new PrerequisiteGuidance(p.id(), p.title(), topic(progress, p.id()).status(),
                        p.objective(), p.firstAction()))
                .toList();
    }

    private Map<String, TopicProgress> toMap(List<ProgressRepository.TopicCounts> rows) {
        return rows.stream().map(ProgressService::derive)
                .collect(Collectors.toMap(TopicProgress::topicId, Function.identity()));
    }

    private static TopicProgress derive(ProgressRepository.TopicCounts c) {
        String status;
        if (c.acceptedReviews() > 0) {
            status = "demonstrated";
        } else if (c.evidence() > 0) {
            status = "evidence";
        } else if (c.attempts() > 0) {
            status = "practicing";
        } else if (c.resourcesOpened() + c.resourcesFinished() > 0 || c.selfLevel() != null) {
            status = "exploring";
        } else {
            status = "not_started";
        }
        return new TopicProgress(c.topicId(), status, c.resourcesOpened(), c.resourcesFinished(), c.attempts(),
                c.submittedAttempts(), c.evidence(), c.sharedEvidence(), c.acceptedReviews(), c.selfLevel());
    }
}
