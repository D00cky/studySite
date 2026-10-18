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
 *   resources.yaml    biblioteca curada
 *   projects.yaml     projetos
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
        List<Resource> resources = read(dir.resolve("resources.yaml"), new TypeReference<>() { });
        List<Project> projects = read(dir.resolve("projects.yaml"), new TypeReference<>() { });
        Policies policies = read(dir.resolve("policies.yaml"), new TypeReference<>() { });

        List<Topic> topics = new ArrayList<>();
        try (Stream<Path> files = Files.list(dir.resolve("topics"))) {
            for (Path file : files.filter(f -> f.toString().endsWith(".yaml")).sorted().toList()) {
                List<Topic> fromFile = read(file, new TypeReference<>() { });
                topics.addAll(fromFile);
            }
        } catch (IOException e) {
            throw new UncheckedIOException("Não foi possível listar " + dir.resolve("topics"), e);
        }

        List<String> errors = CurriculumValidator.validate(stages, topics, resources, projects, policies);
        if (!errors.isEmpty()) {
            throw new InvalidCurriculumException(errors);
        }
        return new Curriculum(stages, topics, resources, projects, policies);
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
