package br.dev.studysite;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import tools.jackson.databind.JsonNode;

/**
 * Fluxo completo do MVP: entrar → abrir tópico → escolher recurso → iniciar exercício →
 * salvar evidência → pedir revisão → receber feedback → retomar depois.
 */
class LearningWorkflowIntegrationTest extends IntegrationTest {

    @Test
    void completeLearningLoopWithTwoUsersInOneGroup() {
        ApiClient mentor = register("Gabriel");
        ApiClient learner = register("Lia");

        // Grupo: o mentor cria e a aprendiz entra pelo código de convite.
        JsonNode group = mentor.post("/api/groups", """
                {"name": "Fundamentos"}""").expect(201).json();
        String groupId = group.get("id").asString();
        String invite = group.get("inviteCode").asString();
        JsonNode joined = learner.post("/api/groups/join", """
                {"inviteCode": "%s"}""".formatted(invite)).expect(200).json();
        assertThat(joined.get("myRole").asString()).isEqualTo("learner");
        assertThat(joined.get("inviteCode")).as("aprendiz não vê o código de convite").isNull();

        // Abrir um tópico: página curada + área pessoal com orientação de pré-requisitos.
        JsonNode page = learner.get("/api/curriculum/topics/compilation-pipeline").expect(200).json();
        String startResource = page.get("startResource").get("id").asString();
        assertThat(page.get("topic").get("exercise").get("id").asString()).isEqualTo("ex-pipeline-stages");
        assertThat(page.get("videos").isArray()).as("vídeos resolvidos na página do tópico").isTrue();
        assertThat(page.get("deepDiveResources").isArray()).as("recursos do aprofundamento resolvidos").isTrue();
        assertThat(page.get("books").findValuesAsString("id"))
                .as("livros de referência ligados ao tópico pela biblioteca").anyMatch(id -> id.startsWith("csapp"));
        JsonNode workspace = learner.get("/api/me/topics/compilation-pipeline").expect(200).json();
        assertThat(workspace.get("progress").get("status").asString()).isEqualTo("not_started");
        assertThat(workspace.get("missingPrerequisites")).as("orienta, não bloqueia").isNotEmpty();

        // Sessão de estudo e consumo de recurso.
        String sessionId = learner.post("/api/me/study-sessions", """
                {"mode": "survival", "topicId": "compilation-pipeline"}""").expect(201).text("id");
        learner.post("/api/me/resource-events", """
                {"resourceId": "%s", "topicId": "compilation-pipeline", "kind": "opened"}""".formatted(startResource))
                .expect(201);
        assertThat(learner.get("/api/me/topics/compilation-pipeline").json().get("progress").get("status").asString())
                .as("abrir um recurso não demonstra domínio").isEqualTo("exploring");

        // Exercício.
        String attemptId = learner.post("/api/me/attempts", """
                {"topicId": "compilation-pipeline", "prediction": "-c gera um .o que não executa"}""")
                .expect(201).text("id");
        learner.patch("/api/me/attempts/" + attemptId, """
                {"notes": "file soma.o diz ELF relocatable", "status": "submitted"}""").expect(200);

        // Evidência privada, depois pedido de revisão (compartilha com o grupo).
        String evidenceId = learner.post("/api/evidence", """
                {"topicId": "compilation-pipeline", "attemptId": "%s", "kind": "repository",
                 "title": "Etapas do pipeline", "body": "Saídas de file e nm", "url": "https://example.test/repo",
                 "aiAssistance": "Pedi explicação do erro de linking, sem solução pronta."}""".formatted(attemptId))
                .expect(201).text("id");
        mentor.get("/api/evidence/" + evidenceId).expect(404);

        String reviewId = learner.post("/api/evidence/" + evidenceId + "/review-requests", """
                {"groupId": "%s", "question": "Minha explicação do linking está certa?"}""".formatted(groupId))
                .expect(201).json().get("request").get("id").asString();
        assertThat(mentor.get("/api/evidence/" + evidenceId).expect(200).text("visibility")).isEqualTo("group");

        // Mentor vê a pendência e pede mudanças.
        JsonNode toReview = mentor.get("/api/me/review-requests").expect(200).json().get("toReview");
        assertThat(toReview.findValuesAsString("id")).contains(reviewId);
        mentor.post("/api/review-requests/" + reviewId + "/claim", null).expect(200);
        mentor.post("/api/review-requests/" + reviewId + "/feedback", """
                {"verdict": "changes_requested", "body": "Explique por que sem_main.c compila com -c."}""").expect(201);

        // Pausa: a aprendiz deixa nota de retomada e encerra a sessão.
        learner.patch("/api/me/study-sessions/" + sessionId, """
                {"summary": "Gerei .i, .s e .o", "restartNote": "Falta explicar o erro de linking",
                 "nextAction": "Rodar gcc sem_main.o e ler o erro", "end": true}""").expect(200);

        // Retomar depois, em outro navegador: login novo, mesmos dados.
        ApiClient later = learner.freshBrowser();
        later.post("/api/auth/login", """
                {"email": "%s", "password": "senha-segura-123"}""".formatted(learner.email)).expect(200);
        JsonNode cont = later.get("/api/me/continue").expect(200).json();
        assertThat(cont.get("nextAction").get("kind").asString()).isEqualTo("restart_note");
        assertThat(cont.get("nextAction").get("text").asString()).isEqualTo("Rodar gcc sem_main.o e ler o erro");
        assertThat(cont.get("changesRequested")).hasSize(1);
        assertThat(cont.get("recentFeedback").get(0).get("verdict").asString()).isEqualTo("changes_requested");

        // A aprendiz responde; isso reabre o pedido. Ela não pode aprovar o próprio trabalho.
        later.post("/api/review-requests/" + reviewId + "/feedback", """
                {"verdict": "comment", "body": "Sem main o -c para antes do linking; só o linker exige main."}""")
                .expect(201);
        later.post("/api/review-requests/" + reviewId + "/feedback", """
                {"verdict": "accepted", "body": "aprovado"}""").expect(403);
        mentor.post("/api/review-requests/" + reviewId + "/feedback", """
                {"verdict": "accepted", "body": "Explicação correta e evidência suficiente."}""").expect(201);

        // Progresso individual: demonstrado só para quem teve a evidência aceita.
        assertThat(later.get("/api/me/progress").json().get("compilation-pipeline").get("status").asString())
                .isEqualTo("demonstrated");
        assertThat(mentor.get("/api/me/progress").json().has("compilation-pipeline")).isFalse();

        // Visão do grupo mostra a evidência compartilhada, mas não o consumo privado de recursos.
        JsonNode members = mentor.get("/api/groups/" + groupId + "/progress").expect(200).json();
        JsonNode lia = null;
        for (JsonNode m : members) {
            if (m.get("displayName").asString().equals("Lia")) {
                lia = m.get("topics").get("compilation-pipeline");
            }
        }
        assertThat(lia).isNotNull();
        assertThat(lia.get("acceptedReviews").asInt()).isEqualTo(1);
        assertThat(lia.get("resourcesOpened").asInt()).isZero();
        assertThat(lia.get("attempts").asInt()).isZero();
    }

    @Test
    void bookChaptersReplaceTheWholeBookOnATopicPage() {
        ApiClient someone = register("Leitor");
        JsonNode compilation = someone.get("/api/curriculum/topics/compilation-pipeline").expect(200).json().get("books");
        assertThat(compilation.findValuesAsString("id")).as("CS:APP inteiro some quando há capítulo dele")
                .doesNotContain("csapp").anyMatch(id -> id.startsWith("csapp-"));
        JsonNode books = someone.get("/api/curriculum/topics/processes-syscalls").expect(200).json().get("books");
        java.util.Set<String> chapterUrls = new java.util.HashSet<>();
        for (JsonNode b : books) {
            if (b.hasNonNull("section")) chapterUrls.add(b.get("url").asString());
        }
        assertThat(chapterUrls).as("o tópico tem capítulos de livros mapeados").isNotEmpty();
        for (JsonNode b : books) {
            if (!b.hasNonNull("section")) {
                assertThat(chapterUrls).as("livro inteiro repetido junto do capítulo: %s", b.get("id").asString())
                        .doesNotContain(b.get("url").asString());
            }
        }
    }

    @Test
    void groupProjectMilestonesDoNotGrantIndividualProficiency() {
        ApiClient mentor = register("Mentor");
        ApiClient learner = register("Rafa");
        JsonNode group = mentor.post("/api/groups", """
                {"name": "Projeto CLI"}""").expect(201).json();
        String groupId = group.get("id").asString();
        learner.post("/api/groups/join", """
                {"inviteCode": "%s"}""".formatted(group.get("inviteCode").asString())).expect(200);

        String gpId = mentor.post("/api/groups/" + groupId + "/projects", """
                {"projectId": "c-task-cli"}""").expect(201).json().get("groupProject").get("id").asString();
        for (String m : new String[] {"m1-args", "m2-add-list", "m3-done", "m4-errors", "m5-build"}) {
            mentor.put("/api/group-projects/" + gpId + "/milestones/" + m, """
                    {"status": "done"}""").expect(200);
        }
        learner.put("/api/group-projects/" + gpId + "/milestones/nao-existe", """
                {"status": "done"}""").expect(400);

        assertThat(learner.get("/api/me/progress").expect(200).json().size()).isZero();
    }

    @Test
    void teamSessionWithRotatingRolesAndOwnContributions() {
        ApiClient a = register("Autora");
        ApiClient b = register("Desafiante");
        JsonNode group = a.post("/api/groups", """
                {"name": "Sessões"}""").expect(201).json();
        String groupId = group.get("id").asString();
        b.post("/api/groups/join", """
                {"inviteCode": "%s"}""".formatted(group.get("inviteCode").asString())).expect(200);

        String sessionId = a.post("/api/groups/" + groupId + "/team-sessions", """
                {"title": "Revisão do pipeline", "topicId": "compilation-pipeline", "agenda": "1. Demo 2. Casos-limite"}""")
                .expect(201).json().get("session").get("id").asString();
        JsonNode suggested = a.get("/api/groups/" + groupId + "/team-sessions/suggested-roles").expect(200).json();
        assertThat(suggested).hasSize(4);

        String bId = b.get("/api/auth/me").text("id");
        String aId = a.get("/api/auth/me").text("id");
        a.put("/api/team-sessions/" + sessionId + "/roles", """
                [{"userId": "%s", "role": "author"}, {"userId": "%s", "role": "challenger"}]""".formatted(aId, bId))
                .expect(200);

        b.patch("/api/team-sessions/" + sessionId + "/roles/challenger/contribution", """
                {"contribution": "Propus arquivo sem permissão de escrita."}""").expect(200);
        b.patch("/api/team-sessions/" + sessionId + "/roles/author/contribution", """
                {"contribution": "tentando escrever no papel de outra pessoa"}""").expect(403);
        b.patch("/api/team-sessions/" + sessionId, """
                {"findings": "Exit code 2 não estava documentado."}""").expect(200);
    }
}
