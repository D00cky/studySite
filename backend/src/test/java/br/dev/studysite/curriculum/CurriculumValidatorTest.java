package br.dev.studysite.curriculum;

import static org.assertj.core.api.Assertions.assertThat;

import br.dev.studysite.curriculum.Model.Policies;
import br.dev.studysite.curriculum.Model.Resource;
import br.dev.studysite.curriculum.Model.Stage;
import br.dev.studysite.curriculum.Model.Topic;
import br.dev.studysite.curriculum.Model.Verification;
import java.util.List;
import org.junit.jupiter.api.Test;

class CurriculumValidatorTest {

    static final Policies NO_POLICIES = new Policies(List.of(), List.of(), List.of(), List.of(), List.of(), List.of(), List.of());

    static Stage stage(String id) {
        return new Stage(id, 1, "core", "Etapa", "Resumo", "planned", List.of(), List.of(), List.of());
    }

    static Topic planned(String id, List<String> prereqs) {
        return new Topic(id, "s1", "Título", "planned", "Objetivo", "Importância", prereqs, List.of(), List.of(),
                null, List.of(), null, null, null, List.of(), List.of(), List.of(), null, List.of(), List.of());
    }

    static Resource resource(Verification v) {
        return new Resource("r1", "T", "A", "https://example.org", "en", "article", "intro", List.of("a"),
                List.of(), "Por quê", null, "free", "core", v);
    }

    @Test
    void detectsPrerequisiteCycle() {
        List<String> errors = CurriculumValidator.validate(List.of(stage("s1")),
                List.of(planned("a", List.of("b")), planned("b", List.of("a"))), List.of(), List.of(), NO_POLICIES);
        assertThat(errors).anyMatch(e -> e.contains("ciclo"));
    }

    @Test
    void detectsUnknownReferences() {
        List<String> errors = CurriculumValidator.validate(List.of(stage("s1")),
                List.of(planned("a", List.of("nao-existe"))), List.of(), List.of(), NO_POLICIES);
        assertThat(errors).anyMatch(e -> e.contains("nao-existe"));
    }

    @Test
    void rejectsInventedVerificationDates() {
        List<String> errors = CurriculumValidator.validate(List.of(stage("s1")), List.of(planned("a", List.of())),
                List.of(resource(new Verification("pending", "2026-01-01", null))), List.of(), NO_POLICIES);
        assertThat(errors).anyMatch(e -> e.contains("pending") && e.contains("checkedOn"));
    }

    @Test
    void verifiedResourceNeedsADate() {
        List<String> errors = CurriculumValidator.validate(List.of(stage("s1")), List.of(planned("a", List.of())),
                List.of(resource(new Verification("verified", null, null))), List.of(), NO_POLICIES);
        assertThat(errors).anyMatch(e -> e.contains("AAAA-MM-DD"));
    }

    @Test
    void topicVideosMustPointToVideoResources() {
        Resource article = resource(new Verification("verified", "2026-10-18", null));
        Topic withVideo = new Topic("a", "s1", "T", "planned", "Obj", "Por quê", List.of(), List.of(), List.of(),
                null, List.of(), new Model.TopicResources(null, List.of(), List.of("r1", "nao-existe")), null, null,
                List.of(), List.of(), List.of(), null, List.of(), List.of());
        List<String> errors = CurriculumValidator.validate(List.of(stage("s1")), List.of(withVideo), List.of(article),
                List.of(), NO_POLICIES);
        assertThat(errors).anyMatch(e -> e.contains("r1") && e.contains("video"))
                .anyMatch(e -> e.contains("nao-existe"));
    }

    @Test
    void essentialsAndDeepDiveAreValidated() {
        Resource article = resource(new Verification("verified", "2026-10-18", null));
        Topic topic = new Topic("a", "s1", "T", "planned", "Obj", "Por quê", List.of(), List.of(), List.of(),
                null, List.of(), null, null, null, List.of(), List.of(), List.of(), null,
                List.of("um só ponto"),
                List.of(new Model.DeepDivePoint("Kahan summation", "Quando somar milhões de floats.", "nao-existe"),
                        new Model.DeepDivePoint("", "sem título", "r1")));
        List<String> errors = CurriculumValidator.validate(List.of(stage("s1")), List.of(topic), List.of(article),
                List.of(), NO_POLICIES);
        assertThat(errors).anyMatch(e -> e.contains("essentials") && e.contains("3"))
                .anyMatch(e -> e.contains("deepDive") && e.contains("nao-existe"))
                .anyMatch(e -> e.contains("deepDive") && e.contains("title"));
    }

    @Test
    void authoredTopicNeedsFullPage() {
        Topic incomplete = new Topic("a", "s1", "T", "authored", "Obj", "Por quê", List.of(), List.of(), List.of(),
                null, List.of(), null, null, null, List.of(), List.of(), List.of(), null, List.of(), List.of());
        List<String> errors = CurriculumValidator.validate(List.of(stage("s1")), List.of(incomplete), List.of(),
                List.of(), NO_POLICIES);
        assertThat(errors).anyMatch(e -> e.contains("explanation"))
                .anyMatch(e -> e.contains("exercise"))
                .anyMatch(e -> e.contains("completionCriteria"));
    }
}
