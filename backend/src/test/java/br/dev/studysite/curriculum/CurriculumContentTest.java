package br.dev.studysite.curriculum;

import static org.assertj.core.api.Assertions.assertThat;

import br.dev.studysite.curriculum.Model.Stage;
import br.dev.studysite.curriculum.Model.Topic;
import java.nio.file.Path;
import java.util.List;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

/** Valida o conteúdo real em content/ — roda sem banco. */
class CurriculumContentTest {

    static Curriculum curriculum;

    @BeforeAll
    static void load() {
        curriculum = CurriculumLoader.load(Path.of("../content").toAbsolutePath().normalize());
    }

    @Test
    void hasSixteenCoreStagesAndFourBranches() {
        assertThat(curriculum.stages().stream().filter(s -> s.kind().equals("core"))).hasSize(16);
        assertThat(curriculum.stages().stream().filter(s -> s.kind().equals("branch"))).hasSize(4);
    }

    @Test
    void firstFourStagesAreFullyAuthored() {
        List<String> authoredStages = List.of("s01-tools", "s02-data-machine", "s03-c-compilation", "s04-memory-runtime");
        for (String stageId : authoredStages) {
            assertThat(curriculum.stage(stageId)).get().extracting(Stage::status).isEqualTo("authored");
            List<Topic> topics = curriculum.topics().stream().filter(t -> t.stage().equals(stageId)).toList();
            assertThat(topics).isNotEmpty().allSatisfy(t -> assertThat(t.status()).isEqualTo("authored"));
        }
    }

    @Test
    void laterStagesAreMarkedPlanned() {
        assertThat(curriculum.stages().stream().filter(s -> s.order() >= 5))
                .allSatisfy(s -> assertThat(s.status()).isEqualTo("planned"));
    }

    @Test
    void requiredDependenciesExist() {
        // Arquitetura sustenta SO e bancos; redes, SO e bancos sustentam distribuídos.
        assertThat(curriculum.stage("s07-operating-systems").orElseThrow().dependsOn()).contains("s02-data-machine");
        assertThat(curriculum.stage("s13-distributed-systems").orElseThrow().dependsOn())
                .contains("s09-networking", "s11-database-internals");
        assertThat(curriculum.stage("s11-database-internals").orElseThrow().dependsOn()).contains("s07-operating-systems");
    }

    @Test
    void pendingResourcesNeverCarryAVerificationDate() {
        assertThat(curriculum.resources()).allSatisfy(r -> {
            if (r.verification().status().equals("pending")) {
                assertThat(r.verification().checkedOn()).isNull();
            }
        });
    }

    @Test
    void cTaskCliProjectIsFullyAuthored() {
        assertThat(curriculum.project("c-task-cli")).get().satisfies(p -> {
            assertThat(p.status()).isEqualTo("authored");
            assertThat(p.milestones()).hasSizeGreaterThanOrEqualTo(3);
            assertThat(p.reviewQuestions()).isNotEmpty();
        });
    }
}
