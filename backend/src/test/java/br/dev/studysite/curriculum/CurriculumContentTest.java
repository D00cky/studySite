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
    void wholeCurriculumIsAuthored() {
        assertThat(curriculum.stages()).allSatisfy(s -> assertThat(s.status()).as(s.id()).isEqualTo("authored"));
        assertThat(curriculum.topics()).allSatisfy(t -> assertThat(t.status()).as(t.id()).isEqualTo("authored"));
        assertThat(curriculum.projects()).allSatisfy(p -> assertThat(p.status()).as(p.id()).isEqualTo("authored"));
    }

    @Test
    void everyTopicHasTheTwoDrillDownLayers() {
        assertThat(curriculum.topics()).allSatisfy(t -> {
            assertThat(t.kit()).as("kit mínimo de %s", t.id()).hasSizeBetween(3, 7);
            assertThat(t.deepDive()).as("aprofundamento de %s", t.id()).hasSizeGreaterThanOrEqualTo(2);
        });
    }

    @Test
    void everyProjectStartsWithDeliberatePractice() {
        assertThat(curriculum.projects()).allSatisfy(p -> {
            assertThat(p.practice()).as("prática de %s", p.id()).isNotNull();
            assertThat(p.practice().references()).as("referências de %s", p.id()).isNotEmpty();
            assertThat(p.milestones().getFirst().id()).as("primeiro marco de %s", p.id()).isEqualTo("m0-redigitar");
        });
        assertThat(curriculum.policies().practiceMethod()).isNotNull();
    }

    @Test
    void everyTopicHasAtLeastOneVideo() {
        assertThat(curriculum.topics()).allSatisfy(t ->
                assertThat(t.resources().videos()).as("vídeos de %s", t.id()).isNotEmpty());
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
    void errorDetectionLessonExistsAndIsLinked() {
        Topic t = curriculum.topic("error-detection").orElseThrow();
        assertThat(t.status()).isEqualTo("authored");
        assertThat(t.prerequisites()).contains("binary-hexadecimal");
        assertThat(t.resources().videos()).contains("ben-eater-how-do-crcs-work");
        assertThat(curriculum.topic("tcp-udp-sockets").orElseThrow().related()).contains("error-detection");
        assertThat(curriculum.resource("computerphile-crc").orElseThrow().topics()).contains("error-detection");
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
