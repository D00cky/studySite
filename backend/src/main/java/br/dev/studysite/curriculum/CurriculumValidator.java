package br.dev.studysite.curriculum;

import br.dev.studysite.curriculum.Model.Milestone;
import br.dev.studysite.curriculum.Model.Policies;
import br.dev.studysite.curriculum.Model.Project;
import br.dev.studysite.curriculum.Model.Resource;
import br.dev.studysite.curriculum.Model.Stage;
import br.dev.studysite.curriculum.Model.Topic;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.regex.Pattern;

/** Regras estruturais do conteúdo. Devolve todos os erros de uma vez. */
final class CurriculumValidator {

    private static final Pattern ID = Pattern.compile("[a-z0-9]+(-[a-z0-9]+)*");
    private static final Set<String> STATUS = Set.of("authored", "planned");
    private static final Set<String> STAGE_KINDS = Set.of("core", "branch");
    private static final Set<String> LANGUAGES = Set.of("pt-BR", "en");
    private static final Set<String> FORMATS = Set.of("book", "article", "course", "documentation", "video", "tool", "lab");
    private static final Set<String> DIFFICULTY = Set.of("intro", "intermediate", "advanced");
    private static final Set<String> ACCESS = Set.of("free", "paid", "mixed");
    private static final Set<String> PRIORITY = Set.of("core", "optional");

    private final List<String> errors = new ArrayList<>();

    private CurriculumValidator() {
    }

    static List<String> validate(List<Stage> stages, List<Topic> topics, List<Resource> resources,
            List<Project> projects, Policies policies) {
        CurriculumValidator v = new CurriculumValidator();
        Set<String> stageIds = v.ids("etapa", stages, Stage::id);
        Set<String> topicIds = v.ids("tópico", topics, Topic::id);
        v.ids("recurso", resources, Resource::id);
        Set<String> projectIds = v.ids("projeto", projects, Project::id);

        for (Stage s : stages) {
            String where = "etapa " + s.id();
            v.required(where, "title", s.title());
            v.required(where, "summary", s.summary());
            v.oneOf(where, "kind", s.kind(), STAGE_KINDS);
            v.oneOf(where, "status", s.status(), STATUS);
            v.refs(where, "dependsOn", s.dependsOn(), stageIds);
        }
        v.acyclic("etapas", stages, Stage::id, Stage::dependsOn);

        Map<String, Resource> resourcesById = new HashMap<>();
        resources.forEach(r -> resourcesById.putIfAbsent(r.id(), r));
        for (Topic t : topics) {
            v.topic(t, stageIds, topicIds, resourcesById, projectIds);
        }
        v.acyclic("pré-requisitos de tópicos", topics, Topic::id, Topic::prerequisites);
        for (Stage s : stages) {
            if (topics.stream().noneMatch(t -> s.id().equals(t.stage()))) {
                v.error("etapa " + s.id() + " não tem nenhum tópico");
            }
        }

        for (Resource r : resources) {
            v.resource(r, topicIds);
        }
        for (Project p : projects) {
            v.project(p, topicIds);
        }
        v.policies(policies);
        return v.errors;
    }

    private void topic(Topic t, Set<String> stageIds, Set<String> topicIds, Map<String, Resource> resources,
            Set<String> projectIds) {
        Set<String> resourceIds = resources.keySet();
        String where = "tópico " + t.id();
        required(where, "title", t.title());
        required(where, "objective", t.objective());
        required(where, "whyItMatters", t.whyItMatters());
        oneOf(where, "status", t.status(), STATUS);
        if (!stageIds.contains(t.stage())) {
            error(where + ": etapa inexistente '" + t.stage() + "'");
        }
        refs(where, "prerequisites", t.prerequisites(), topicIds);
        refs(where, "related", t.related(), topicIds);
        if (t.prerequisites().contains(t.id())) {
            error(where + ": não pode ser pré-requisito de si mesmo");
        }
        if (t.resources() != null) {
            if (t.resources().start() != null && !resourceIds.contains(t.resources().start())) {
                error(where + ": recurso inicial inexistente '" + t.resources().start() + "'");
            }
            refs(where, "resources.deeper", t.resources().deeper(), resourceIds);
            for (String v : t.resources().videos()) {
                Resource r = resources.get(v);
                if (r == null) {
                    error(where + ": resources.videos aponta para id inexistente '" + v + "'");
                } else if (!"video".equals(r.format())) {
                    error(where + ": resources.videos '" + v + "' precisa ter format video");
                }
            }
        }
        if (t.experiment() != null && t.experiment().project() != null
                && !projectIds.contains(t.experiment().project())) {
            error(where + ": projeto inexistente '" + t.experiment().project() + "'");
        }
        if (!"authored".equals(t.status())) {
            return;
        }
        // Tópicos "authored" precisam da página completa.
        required(where, "explanation", t.explanation());
        required(where, "firstAction", t.firstAction());
        nonEmpty(where, "misconceptions", t.misconceptions());
        nonEmpty(where, "reflectionQuestions", t.reflectionQuestions());
        nonEmpty(where, "completionCriteria", t.completionCriteria());
        nonEmpty(where, "evidencePrompts", t.evidencePrompts());
        if (t.resources() == null || t.resources().start() == null) {
            error(where + ": falta resources.start");
        }
        if (t.exercise() == null) {
            error(where + ": falta exercise");
        } else {
            required(where, "exercise.id", t.exercise().id());
            required(where, "exercise.title", t.exercise().title());
            required(where, "exercise.prediction", t.exercise().prediction());
            nonEmpty(where, "exercise.steps", t.exercise().steps());
            nonEmpty(where, "exercise.checks", t.exercise().checks());
        }
        if (t.experiment() == null) {
            error(where + ": falta experiment");
        } else {
            required(where, "experiment.title", t.experiment().title());
            nonEmpty(where, "experiment.steps", t.experiment().steps());
            nonEmpty(where, "experiment.observe", t.experiment().observe());
        }
    }

    private void resource(Resource r, Set<String> topicIds) {
        String where = "recurso " + r.id();
        required(where, "title", r.title());
        required(where, "author", r.author());
        required(where, "why", r.why());
        if (r.url() == null || !r.url().startsWith("https://")) {
            error(where + ": url deve começar com https://");
        }
        oneOf(where, "language", r.language(), LANGUAGES);
        oneOf(where, "format", r.format(), FORMATS);
        oneOf(where, "difficulty", r.difficulty(), DIFFICULTY);
        oneOf(where, "access", r.access(), ACCESS);
        oneOf(where, "priority", r.priority(), PRIORITY);
        nonEmpty(where, "topics", r.topics());
        refs(where, "topics", r.topics(), topicIds);
        refs(where, "prerequisites", r.prerequisites(), topicIds);
        if (r.verification() == null) {
            error(where + ": falta verification");
            return;
        }
        String status = r.verification().status();
        if ("verified".equals(status)) {
            try {
                LocalDate.parse(String.valueOf(r.verification().checkedOn()));
            } catch (DateTimeParseException e) {
                error(where + ": verificação 'verified' exige checkedOn no formato AAAA-MM-DD");
            }
        } else if ("pending".equals(status)) {
            if (r.verification().checkedOn() != null) {
                error(where + ": verificação 'pending' não pode ter checkedOn");
            }
        } else {
            error(where + ": verification.status deve ser 'verified' ou 'pending'");
        }
    }

    private void project(Project p, Set<String> topicIds) {
        String where = "projeto " + p.id();
        required(where, "title", p.title());
        required(where, "question", p.question());
        required(where, "minimalVersion", p.minimalVersion());
        oneOf(where, "status", p.status(), STATUS);
        nonEmpty(where, "topics", p.topics());
        refs(where, "topics", p.topics(), topicIds);
        refs(where, "prerequisites", p.prerequisites(), topicIds);
        nonEmpty(where, "milestones", p.milestones());
        Set<String> seen = new HashSet<>();
        for (Milestone m : p.milestones()) {
            if (m.id() == null || !ID.matcher(m.id()).matches()) {
                error(where + ": marco com id inválido '" + m.id() + "'");
            } else if (!seen.add(m.id())) {
                error(where + ": marco duplicado '" + m.id() + "'");
            }
            required(where, "milestone.title", m.title());
        }
        if ("authored".equals(p.status())) {
            nonEmpty(where, "extensions", p.extensions());
            nonEmpty(where, "constraints", p.constraints());
            nonEmpty(where, "edgeCases", p.edgeCases());
            nonEmpty(where, "failureExperiments", p.failureExperiments());
            nonEmpty(where, "tools", p.tools());
            nonEmpty(where, "acceptanceCriteria", p.acceptanceCriteria());
            nonEmpty(where, "evidence", p.evidence());
            nonEmpty(where, "reviewQuestions", p.reviewQuestions());
        }
    }

    private void policies(Policies p) {
        if (p == null) {
            error("policies.yaml vazio");
            return;
        }
        nonEmpty("políticas", "learningLoop", p.learningLoop());
        nonEmpty("políticas", "aiPolicy", p.aiPolicy());
        nonEmpty("políticas", "weeklyModes", p.weeklyModes());
        nonEmpty("políticas", "sessionTemplate", p.sessionTemplate());
        nonEmpty("políticas", "sessionRoles", p.sessionRoles());
        nonEmpty("políticas", "selfAssessmentLevels", p.selfAssessmentLevels());
    }

    // --- utilitários ---------------------------------------------------------------

    private <T> Set<String> ids(String kind, List<T> items, Function<T, String> id) {
        Set<String> ids = new HashSet<>();
        for (T item : items) {
            String value = id.apply(item);
            if (value == null || !ID.matcher(value).matches()) {
                error(kind + " com id inválido '" + value + "' (use kebab-case minúsculo)");
            } else if (!ids.add(value)) {
                error(kind + " duplicado: " + value);
            }
        }
        return ids;
    }

    private <T> void acyclic(String what, List<T> items, Function<T, String> id, Function<T, List<String>> deps) {
        Map<String, List<String>> graph = new HashMap<>();
        items.forEach(i -> graph.put(id.apply(i), deps.apply(i)));
        Map<String, Integer> state = new HashMap<>(); // 1 = visitando, 2 = concluído
        for (String start : graph.keySet()) {
            if (hasCycle(start, graph, state)) {
                error("ciclo em " + what + " envolvendo '" + start + "'");
                return;
            }
        }
    }

    private boolean hasCycle(String node, Map<String, List<String>> graph, Map<String, Integer> state) {
        Integer s = state.get(node);
        if (s != null) {
            return s == 1;
        }
        state.put(node, 1);
        for (String next : graph.getOrDefault(node, List.of())) {
            if (hasCycle(next, graph, state)) {
                return true;
            }
        }
        state.put(node, 2);
        return false;
    }

    private void refs(String where, String field, List<String> refs, Set<String> known) {
        for (String ref : refs) {
            if (!known.contains(ref)) {
                error(where + ": " + field + " aponta para id inexistente '" + ref + "'");
            }
        }
    }

    private void required(String where, String field, String value) {
        if (value == null || value.isBlank()) {
            error(where + ": falta " + field);
        }
    }

    private void nonEmpty(String where, String field, List<?> value) {
        if (value == null || value.isEmpty()) {
            error(where + ": " + field + " não pode ser vazio");
        }
    }

    private void oneOf(String where, String field, String value, Set<String> allowed) {
        if (!allowed.contains(value)) {
            error(where + ": " + field + " = '" + value + "' (permitidos: " + allowed + ")");
        }
    }

    private void error(String message) {
        errors.add(message);
    }
}
