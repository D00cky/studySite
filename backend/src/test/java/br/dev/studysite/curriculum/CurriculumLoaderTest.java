package br.dev.studysite.curriculum;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

/** Recursos e projetos podem ser divididos em vários arquivos (resources/*.yaml, projects/*.yaml). */
class CurriculumLoaderTest {

    @TempDir
    Path dir;

    @Test
    void loadsResourcesAndProjectsFromExtraFiles() throws IOException {
        Path real = Path.of("../content").toAbsolutePath().normalize();
        for (String f : new String[] {"stages.yaml", "resources.yaml", "projects.yaml", "policies.yaml"}) {
            Files.copy(real.resolve(f), dir.resolve(f));
        }
        Files.createDirectories(dir.resolve("topics"));
        try (var files = Files.list(real.resolve("topics"))) {
            for (Path f : files.toList()) {
                Files.copy(f, dir.resolve("topics").resolve(f.getFileName()));
            }
        }
        Files.createDirectories(dir.resolve("resources"));
        Files.writeString(dir.resolve("resources/extra.yaml"), """
                - id: extra-resource
                  title: Recurso extra
                  author: Autor
                  url: https://example.org/extra
                  language: en
                  format: article
                  difficulty: intro
                  topics: [terminal-shell]
                  why: Teste de arquivo adicional.
                  access: free
                  priority: optional
                  verification: { status: pending }
                """);
        Files.createDirectories(dir.resolve("projects"));
        Files.writeString(dir.resolve("projects/extra.yaml"), """
                - id: extra-project
                  title: Projeto extra
                  status: planned
                  topics: [terminal-shell]
                  question: Funciona?
                  minimalVersion: Sim.
                  milestones:
                    - id: m1
                      title: Primeiro
                """);

        Curriculum c = CurriculumLoader.load(dir);

        assertThat(c.resource("extra-resource")).isPresent();
        assertThat(c.project("extra-project")).isPresent();
        assertThat(c.resource("missing-semester")).as("arquivo principal continua sendo lido").isPresent();
    }
}
