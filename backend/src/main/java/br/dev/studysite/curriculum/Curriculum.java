package br.dev.studysite.curriculum;

import br.dev.studysite.common.ApiException;
import br.dev.studysite.curriculum.Model.Policies;
import br.dev.studysite.curriculum.Model.Project;
import br.dev.studysite.curriculum.Model.Resource;
import br.dev.studysite.curriculum.Model.Stage;
import br.dev.studysite.curriculum.Model.Topic;
import java.util.Collection;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.function.Function;
import java.util.stream.Collectors;

/** Índice em memória do currículo já validado. Imutável depois de carregado. */
public final class Curriculum {

    private final Map<String, Stage> stages;
    private final Map<String, Topic> topics;
    private final Map<String, Resource> resources;
    private final Map<String, Project> projects;
    private final Policies policies;

    public Curriculum(List<Stage> stages, List<Topic> topics, List<Resource> resources,
            List<Project> projects, Policies policies) {
        this.stages = index(stages.stream().sorted(Comparator.comparingInt(Stage::order)).toList(), Stage::id);
        this.topics = index(topics, Topic::id);
        this.resources = index(resources, Resource::id);
        this.projects = index(projects, Project::id);
        this.policies = policies;
    }

    private static <T> Map<String, T> index(List<T> items, Function<T, String> id) {
        return items.stream().collect(Collectors.toMap(id, t -> t, (a, b) -> a, LinkedHashMap::new));
    }

    public Collection<Stage> stages() {
        return stages.values();
    }

    public Collection<Topic> topics() {
        return topics.values();
    }

    public Collection<Resource> resources() {
        return resources.values();
    }

    public Collection<Project> projects() {
        return projects.values();
    }

    public Policies policies() {
        return policies;
    }

    public Optional<Topic> topic(String id) {
        return Optional.ofNullable(topics.get(id));
    }

    public Optional<Resource> resource(String id) {
        return Optional.ofNullable(resources.get(id));
    }

    public Optional<Project> project(String id) {
        return Optional.ofNullable(projects.get(id));
    }

    public Optional<Stage> stage(String id) {
        return Optional.ofNullable(stages.get(id));
    }

    /** Valida um topic_id vindo de uma requisição (null é permitido). */
    public void checkTopic(String id) {
        if (id != null && !topics.containsKey(id)) {
            throw ApiException.badRequest("Tópico desconhecido: " + id);
        }
    }

    public void checkResource(String id) {
        if (id != null && !resources.containsKey(id)) {
            throw ApiException.badRequest("Recurso desconhecido: " + id);
        }
    }

    public Project requireProject(String id) {
        return project(id).orElseThrow(() -> ApiException.badRequest("Projeto desconhecido: " + id));
    }

    public void checkMilestone(String projectId, String milestoneId) {
        if (milestoneId == null) {
            return;
        }
        if (projectId == null || requireProject(projectId).milestones().stream()
                .noneMatch(m -> m.id().equals(milestoneId))) {
            throw ApiException.badRequest("Marco desconhecido para este projeto: " + milestoneId);
        }
    }
}
