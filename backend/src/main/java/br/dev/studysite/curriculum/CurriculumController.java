package br.dev.studysite.curriculum;

import br.dev.studysite.common.ApiException;
import br.dev.studysite.curriculum.Model.Policies;
import br.dev.studysite.curriculum.Model.Project;
import br.dev.studysite.curriculum.Model.Resource;
import br.dev.studysite.curriculum.Model.Stage;
import br.dev.studysite.curriculum.Model.Topic;
import java.text.Normalizer;
import java.util.Collection;
import java.util.List;
import java.util.Locale;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** Conteúdo curado (somente leitura). Dados pessoais ficam em /api/me/*. */
@RestController
@RequestMapping("/api/curriculum")
class CurriculumController {

    /** Resumo usado no mapa e na lista acessível do roadmap. */
    record TopicSummary(String id, String stage, String title, String status, String objective,
            List<String> prerequisites, List<String> related) {
        static TopicSummary of(Topic t) {
            return new TopicSummary(t.id(), t.stage(), t.title(), t.status(), t.objective(), t.prerequisites(),
                    t.related());
        }
    }

    record Roadmap(Collection<Stage> stages, List<TopicSummary> topics) {
    }

    record TopicPage(Topic topic, Stage stage, Resource startResource, List<Resource> deeperResources, List<Resource> videos,
            List<Resource> deepDiveResources,
            List<TopicSummary> prerequisites, List<TopicSummary> unlocks, List<TopicSummary> related,
            List<ProjectSummary> projects) {
    }

    record ProjectSummary(String id, String title, String status, boolean cumulative, String question,
            List<String> topics) {
        static ProjectSummary of(Project p) {
            return new ProjectSummary(p.id(), p.title(), p.status(), p.cumulative(), p.question(), p.topics());
        }
    }

    private final Curriculum curriculum;

    CurriculumController(Curriculum curriculum) {
        this.curriculum = curriculum;
    }

    @GetMapping
    Roadmap roadmap() {
        return new Roadmap(curriculum.stages(), curriculum.topics().stream().map(TopicSummary::of).toList());
    }

    @GetMapping("/topics")
    List<TopicSummary> topics(@RequestParam(required = false) String q, @RequestParam(required = false) String stage,
            @RequestParam(required = false) String status) {
        return curriculum.topics().stream()
                .filter(t -> stage == null || stage.equals(t.stage()))
                .filter(t -> status == null || status.equals(t.status()))
                .filter(t -> matches(q, t.id(), t.title(), t.objective()))
                .map(TopicSummary::of).toList();
    }

    @GetMapping("/topics/{id}")
    TopicPage topic(@PathVariable String id) {
        Topic t = curriculum.topic(id).orElseThrow(() -> ApiException.notFound("Tópico não encontrado."));
        Resource start = t.resources() == null || t.resources().start() == null ? null
                : curriculum.resource(t.resources().start()).orElseThrow();
        List<Resource> deeper = t.resources() == null ? List.of()
                : t.resources().deeper().stream().map(r -> curriculum.resource(r).orElseThrow()).toList();
        List<Resource> videos = t.resources() == null ? List.of()
                : t.resources().videos().stream().map(r -> curriculum.resource(r).orElseThrow()).toList();
        List<Resource> deepDive = t.deepDive().stream().map(Model.DeepDivePoint::resource).filter(java.util.Objects::nonNull)
                .distinct().map(r -> curriculum.resource(r).orElseThrow()).toList();
        return new TopicPage(t, curriculum.stage(t.stage()).orElseThrow(), start, deeper, videos, deepDive,
                summaries(t.prerequisites()),
                curriculum.topics().stream().filter(o -> o.prerequisites().contains(id)).map(TopicSummary::of).toList(),
                summaries(t.related()),
                curriculum.projects().stream()
                        .filter(p -> p.topics().contains(id) || id.equals(t.experiment() == null ? null : t.experiment().project()))
                        .map(ProjectSummary::of).toList());
    }

    @GetMapping("/resources")
    List<Resource> resources(@RequestParam(required = false) String q, @RequestParam(required = false) String topic,
            @RequestParam(required = false) String language, @RequestParam(required = false) String format,
            @RequestParam(required = false) String difficulty, @RequestParam(required = false) String priority) {
        return curriculum.resources().stream()
                .filter(r -> topic == null || r.topics().contains(topic))
                .filter(r -> language == null || language.equals(r.language()))
                .filter(r -> format == null || format.equals(r.format()))
                .filter(r -> difficulty == null || difficulty.equals(r.difficulty()))
                .filter(r -> priority == null || priority.equals(r.priority()))
                .filter(r -> matches(q, r.title(), r.author(), r.why(), r.section()))
                .toList();
    }

    @GetMapping("/resources/{id}")
    Resource resource(@PathVariable String id) {
        return curriculum.resource(id).orElseThrow(() -> ApiException.notFound("Recurso não encontrado."));
    }

    @GetMapping("/projects")
    List<ProjectSummary> projects() {
        return curriculum.projects().stream().map(ProjectSummary::of).toList();
    }

    @GetMapping("/projects/{id}")
    Project project(@PathVariable String id) {
        return curriculum.project(id).orElseThrow(() -> ApiException.notFound("Projeto não encontrado."));
    }

    @GetMapping("/policies")
    Policies policies() {
        return curriculum.policies();
    }

    private List<TopicSummary> summaries(List<String> ids) {
        return ids.stream().map(i -> TopicSummary.of(curriculum.topic(i).orElseThrow())).toList();
    }

    /** Busca simples sem acento e sem diferenciar maiúsculas. */
    static boolean matches(String q, String... fields) {
        if (q == null || q.isBlank()) {
            return true;
        }
        String needle = fold(q);
        for (String f : fields) {
            if (f != null && fold(f).contains(needle)) {
                return true;
            }
        }
        return false;
    }

    private static String fold(String s) {
        return Normalizer.normalize(s, Normalizer.Form.NFD).replaceAll("\\p{M}", "").toLowerCase(Locale.ROOT).trim();
    }
}
