package br.dev.studysite.curriculum;

import java.util.List;

/**
 * Tipos do conteúdo curricular, lidos de content/*.yaml.
 *
 * <p>Os IDs são estáveis: a atividade das pessoas no banco aponta para eles, então
 * renomear um ID exige migração de dados. Campos de texto são em português; termos
 * técnicos permanecem em inglês.
 */
public final class Model {

    private Model() {
    }

    /** Listas ausentes no YAML viram listas vazias e imutáveis. */
    static <T> List<T> list(List<T> items) {
        return items == null ? List.of() : List.copyOf(items);
    }

    /** Etapa do tronco comum ("core") ou ramo opcional ("branch"). */
    public record Stage(
            String id,
            int order,
            String kind,
            String title,
            String summary,
            String status,
            List<String> dependsOn,
            List<String> mathThreads,
            List<String> crossCutting) {
        public Stage {
            dependsOn = list(dependsOn);
            mathThreads = list(mathThreads);
            crossCutting = list(crossCutting);
        }
    }

    public record Topic(
            String id,
            String stage,
            String title,
            String status,
            String objective,
            String whyItMatters,
            List<String> prerequisites,
            List<String> related,
            List<String> mathThreads,
            String explanation,
            List<Misconception> misconceptions,
            TopicResources resources,
            Exercise exercise,
            Experiment experiment,
            List<String> reflectionQuestions,
            List<String> completionCriteria,
            List<String> evidencePrompts,
            String firstAction,
            List<DeepDivePoint> deepDive,
            List<KitItem> kit) {
        public Topic {
            deepDive = list(deepDive);
            kit = list(kit);
            prerequisites = list(prerequisites);
            related = list(related);
            mathThreads = list(mathThreads);
            misconceptions = list(misconceptions);
            reflectionQuestions = list(reflectionQuestions);
            completionCriteria = list(completionCriteria);
            evidencePrompts = list(evidencePrompts);
        }
    }

    public record Misconception(String claim, String correction) {
    }

    /**
     * Kit mínimo (80/20): o comando, ferramenta ou conceito que resolve a maior parte do
     * dia a dia, e para que ele serve. Ex.: term "git commit -m", use "grava um snapshot".
     */
    public record KitItem(String term, String use) {
    }

    /**
     * Camada de aprofundamento da lição (drill-down): assuntos avançados para estudar
     * depois do essencial. resource é opcional e aponta para a biblioteca.
     */
    public record DeepDivePoint(String title, String why, String resource) {
    }

    /** videos: recursos de formato "video" (aulas, Akitando, palestras) para contextualizar a lição. */
    public record TopicResources(String start, List<String> deeper, List<String> videos) {
        public TopicResources {
            deeper = list(deeper);
            videos = list(videos);
        }
    }

    public record Exercise(String id, String title, String prediction, List<String> steps, List<String> checks) {
        public Exercise {
            steps = list(steps);
            checks = list(checks);
        }
    }

    public record Experiment(String title, String project, List<String> steps, List<String> observe) {
        public Experiment {
            steps = list(steps);
            observe = list(observe);
        }
    }

    public record Resource(
            String id,
            String title,
            String author,
            String url,
            String language,
            String format,
            String difficulty,
            List<String> topics,
            List<String> prerequisites,
            String why,
            String section,
            String access,
            String priority,
            Verification verification) {
        public Resource {
            topics = list(topics);
            prerequisites = list(prerequisites);
        }
    }

    /** status "verified" exige checkedOn; "pending" nunca tem data inventada. */
    public record Verification(String status, String checkedOn, String note) {
    }

    public record Project(
            String id,
            String title,
            String status,
            Boolean cumulative,
            List<String> topics,
            String question,
            List<String> prerequisites,
            String minimalVersion,
            List<String> extensions,
            List<String> constraints,
            List<Milestone> milestones,
            List<String> edgeCases,
            List<String> failureExperiments,
            List<String> tools,
            List<String> acceptanceCriteria,
            List<String> evidence,
            List<String> reviewQuestions,
            Practice practice) {
        public Project {
            cumulative = Boolean.TRUE.equals(cumulative);
            topics = list(topics);
            prerequisites = list(prerequisites);
            extensions = list(extensions);
            constraints = list(constraints);
            milestones = list(milestones);
            edgeCases = list(edgeCases);
            failureExperiments = list(failureExperiments);
            tools = list(tools);
            acceptanceCriteria = list(acceptanceCriteria);
            evidence = list(evidence);
            reviewQuestions = list(reviewQuestions);
        }
    }

    public record Milestone(String id, String title, String description, Integer minutes) {
    }

    /**
     * Prática deliberada antes de construir do zero (método defendido pelo Akita):
     * redigitar uma implementação de referência real, anotar, quebrar, modificar e
     * reescrever de memória.
     */
    public record Practice(String guidance, List<PracticeReference> references) {
        public Practice {
            references = list(references);
        }
    }

    public record PracticeReference(String title, String author, String url, String language, String license) {
    }

    public record Policies(
            List<LoopStep> learningLoop,
            List<AiPhase> aiPolicy,
            List<WeeklyMode> weeklyModes,
            List<SessionStep> sessionTemplate,
            List<SessionRole> sessionRoles,
            List<AssessmentLevel> selfAssessmentLevels,
            List<String> recordKinds,
            PracticeMethod practiceMethod) {
    }

    public record PracticeMethod(String title, String summary, List<LoopStep> steps, List<Source> sources,
            List<String> caveats) {
        public PracticeMethod {
            steps = list(steps);
            sources = list(sources);
            caveats = list(caveats);
        }
    }

    /** Fonte citada literalmente (url verificada; quote curta e exata). */
    public record Source(String title, String url, String quote) {
    }

    public record LoopStep(String id, String title, String description) {
    }

    public record AiPhase(String id, String title, List<String> allowed, List<String> expectations) {
        public AiPhase {
            allowed = list(allowed);
            expectations = list(expectations);
        }
    }

    public record WeeklyMode(String id, String title, String time, String description, boolean completesMilestones) {
    }

    public record SessionStep(String title, int minutes, String description) {
    }

    public record SessionRole(String id, String title, String description) {
    }

    public record AssessmentLevel(int level, String title, String description) {
    }
}
