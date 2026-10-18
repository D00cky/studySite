package br.dev.studysite.curriculum;

import br.dev.studysite.curriculum.Model.Policies;
import br.dev.studysite.curriculum.Model.Project;
import br.dev.studysite.curriculum.Model.Resource;
import br.dev.studysite.curriculum.Model.Stage;
import br.dev.studysite.curriculum.Model.Topic;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Stream;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.DeserializationFeature;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.dataformat.yaml.YAMLMapper;

/**
 * Lê content/ do disco e valida tudo antes de o servidor aceitar requisições.
 *
 * <pre>
 * content/
 *   stages.yaml       etapas e ramos
 *   topics/*.yaml     tópicos (um arquivo por etapa)
 *   resources.yaml    biblioteca curada (+ resources/*.yaml, opcional)
 *   projects.yaml     projetos (+ projects/*.yaml, opcional)
 *   policies.yaml     ciclo de aprendizagem, política de IA, rotina, papéis
 * </pre>
 */
public final class CurriculumLoader {

    private static final ObjectMapper YAML = YAMLMapper.builder()
            .enable(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES)
            .enable(DeserializationFeature.FAIL_ON_NULL_FOR_PRIMITIVES)
            .build();

    private CurriculumLoader() {
    }

    public static Curriculum load(Path dir) {
        List<Stage> stages = read(dir.resolve("stages.yaml"), new TypeReference<>() { });
        List<Resource> resources = new ArrayList<>(read(dir.resolve("resources.yaml"), new TypeReference<List<Resource>>() { }));
        resources.addAll(readAll(dir.resolve("resources"), new TypeReference<List<Resource>>() { }));
        List<Project> projects = new ArrayList<>(read(dir.resolve("projects.yaml"), new TypeReference<List<Project>>() { }));
        projects.addAll(readAll(dir.resolve("projects"), new TypeReference<List<Project>>() { }));
        Policies policies = read(dir.resolve("policies.yaml"), new TypeReference<>() { });
        List<Topic> topics = readAll(dir.resolve("topics"), new TypeReference<List<Topic>>() { });

        List<String> errors = CurriculumValidator.validate(stages, topics, resources, projects, policies);
        if (!errors.isEmpty()) {
            throw new InvalidCurriculumException(errors);
        }
        return new Curriculum(stages, topics, resources, projects, policies);
    }

    /** Lê todos os .yaml de um diretório (em ordem de nome); diretório ausente = lista vazia. */
    private static <T> List<T> readAll(Path folder, TypeReference<List<T>> type) {
        if (!Files.isDirectory(folder)) {
            return List.of();
        }
        List<T> all = new ArrayList<>();
        try (Stream<Path> files = Files.list(folder)) {
            for (Path file : files.filter(f -> f.toString().endsWith(".yaml")).sorted().toList()) {
                List<T> fromFile = read(file, type);
                if (fromFile != null) {
                    all.addAll(fromFile);
                }
            }
        } catch (IOException e) {
            throw new UncheckedIOException("Não foi possível listar " + folder, e);
        }
        return all;
    }

    private static <T> T read(Path file, TypeReference<T> type) {
        try {
            return YAML.readValue(file.toFile(), type);
        } catch (RuntimeException e) {
            throw new InvalidCurriculumException(List.of(file.getFileName() + ": " + e.getMessage()));
        }
    }

    public static final class InvalidCurriculumException extends RuntimeException {
        private final List<String> errors;

        InvalidCurriculumException(List<String> errors) {
            super("Conteúdo curricular inválido:\n - " + String.join("\n - ", errors));
            this.errors = List.copyOf(errors);
        }

        public List<String> errors() {
            return errors;
        }
    }
}
