package br.dev.studysite;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.JsonNode;

/**
 * Limites de autorização: registros privados de outra pessoa e dados de outro grupo
 * nunca são lidos nem alterados.
 */
class AuthorizationIntegrationTest extends IntegrationTest {

    ApiClient mentor;
    ApiClient alice;
    ApiClient bob;
    ApiClient outsider;
    String groupId;
    String otherGroupId;

    @BeforeEach
    void setUp() {
        mentor = register("Mentora");
        alice = register("Alice");
        bob = register("Bob");
        outsider = register("Fora");
        JsonNode group = mentor.post("/api/groups", """
                {"name": "Time"}""").expect(201).json();
        groupId = group.get("id").asString();
        String invite = group.get("inviteCode").asString();
        alice.post("/api/groups/join", "{\"inviteCode\": \"" + invite + "\"}").expect(200);
        bob.post("/api/groups/join", "{\"inviteCode\": \"" + invite + "\"}").expect(200);
        otherGroupId = outsider.post("/api/groups", """
                {"name": "Outro grupo"}""").expect(201).text("id");
    }

    private String aliceEvidence(String visibility) {
        String group = visibility.equals("group") ? ", \"groupId\": \"" + groupId + "\"" : "";
        return alice.post("/api/evidence", """
                {"topicId": "pointers", "kind": "text", "title": "Swap", "body": "desenho", "visibility": "%s"%s}"""
                .formatted(visibility, group)).expect(201).text("id");
    }

    @Test
    void privateEvidenceIsInvisibleToEveryoneElse() {
        String id = aliceEvidence("private");
        bob.get("/api/evidence/" + id).expect(404);
        mentor.get("/api/evidence/" + id).expect(404);
        outsider.get("/api/evidence/" + id).expect(404);
        assertThat(bob.get("/api/groups/" + groupId + "/evidence").expect(200).json().findValuesAsString("id"))
                .doesNotContain(id);
    }

    @Test
    void sharedEvidenceIsReadableByGroupButEditableOnlyByOwner() {
        String id = aliceEvidence("group");
        bob.get("/api/evidence/" + id).expect(200);
        bob.patch("/api/evidence/" + id, "{\"title\": \"invadido\"}").expect(403);
        bob.delete("/api/evidence/" + id).expect(403);
        outsider.get("/api/evidence/" + id).expect(404);
        outsider.patch("/api/evidence/" + id, "{\"title\": \"invadido\"}").expect(404);
        alice.patch("/api/evidence/" + id, "{\"title\": \"Swap v2\"}").expect(200);
    }

    @Test
    void personalRecordsCannotBeChangedByOthers() {
        String attempt = alice.post("/api/me/attempts", """
                {"topicId": "pointers"}""").expect(201).text("id");
        bob.patch("/api/me/attempts/" + attempt, "{\"notes\": \"x\"}").expect(404);
        String session = alice.post("/api/me/study-sessions", """
                {"mode": "rescue"}""").expect(201).text("id");
        bob.patch("/api/me/study-sessions/" + session, "{\"restartNote\": \"x\"}").expect(404);
        assertThat(bob.get("/api/me/attempts").expect(200).json().size()).isZero();
    }

    @Test
    void privateNotesStayPrivateAndSharedNotesStayInGroup() {
        String priv = alice.post("/api/notes", """
                {"title": "Minha dúvida", "body": "não entendi realloc"}""").expect(201).text("id");
        bob.get("/api/notes/" + priv).expect(404);
        String shared = alice.post("/api/notes", """
                {"title": "Resumo", "groupId": "%s", "visibility": "group"}""".formatted(groupId)).expect(201).text("id");
        bob.get("/api/notes/" + shared).expect(200);
        bob.patch("/api/notes/" + shared, "{\"body\": \"x\"}").expect(403);
        outsider.get("/api/notes/" + shared).expect(404);
    }

    @Test
    void otherGroupsAreInvisible() {
        alice.get("/api/groups/" + otherGroupId).expect(404);
        alice.get("/api/groups/" + otherGroupId + "/review-requests").expect(404);
        alice.get("/api/groups/" + otherGroupId + "/evidence").expect(404);
        alice.get("/api/groups/" + otherGroupId + "/progress").expect(404);
        alice.post("/api/groups/" + otherGroupId + "/signals", """
                {"kind": "blocker", "body": "x"}""").expect(404);
        alice.post("/api/notes", """
                {"title": "x", "groupId": "%s", "visibility": "group"}""".formatted(otherGroupId)).expect(404);
        alice.post("/api/evidence", """
                {"topicId": "pointers", "kind": "text", "title": "x", "groupId": "%s"}""".formatted(otherGroupId))
                .expect(404);
    }

    @Test
    void reviewRequestsAreScopedToTheGroupAndOwner() {
        String id = aliceEvidence("private");
        bob.post("/api/evidence/" + id + "/review-requests", """
                {"groupId": "%s"}""".formatted(groupId)).expect(404);
        alice.post("/api/evidence/" + id + "/review-requests", """
                {"groupId": "%s"}""".formatted(otherGroupId)).expect(404);
        String reviewId = alice.post("/api/evidence/" + id + "/review-requests", """
                {"groupId": "%s"}""".formatted(groupId)).expect(201).json().get("request").get("id").asString();
        outsider.get("/api/review-requests/" + reviewId).expect(404);
        outsider.post("/api/review-requests/" + reviewId + "/feedback", """
                {"verdict": "accepted", "body": "x"}""").expect(404);
        alice.post("/api/review-requests/" + reviewId + "/claim", null).expect(400);
        bob.post("/api/review-requests/" + reviewId + "/feedback", """
                {"verdict": "accepted", "body": "Par revisor aprova."}""").expect(201);
        bob.post("/api/review-requests/" + reviewId + "/close", null).expect(403);
    }

    @Test
    void mentorOnlyActions() {
        alice.post("/api/groups/" + groupId + "/invite-code", null).expect(403);
        String bobId = bob.get("/api/auth/me").text("id");
        alice.patch("/api/groups/" + groupId + "/members/" + bobId, "{\"role\": \"mentor\"}").expect(403);
        String suggestion = alice.post("/api/groups/" + groupId + "/resource-suggestions", """
                {"title": "Um artigo", "url": "https://example.test/a", "topicIds": ["pointers"]}""").expect(201).text("id");
        alice.post("/api/resource-suggestions/" + suggestion + "/review", "{\"status\": \"accepted\"}").expect(403);
        outsider.post("/api/resource-suggestions/" + suggestion + "/review", "{\"status\": \"accepted\"}").expect(404);
        mentor.post("/api/resource-suggestions/" + suggestion + "/review", "{\"status\": \"accepted\"}").expect(200);

        String mentorId = mentor.get("/api/auth/me").text("id");
        mentor.patch("/api/groups/" + groupId + "/members/" + mentorId, "{\"role\": \"learner\"}").expect(409);
    }

    @Test
    void helpSignalsResolvedOnlyByOwnerOrMentor() {
        String signal = alice.post("/api/groups/" + groupId + "/signals", """
                {"kind": "blocker", "topicId": "pointers", "body": "Segfault no swap"}""").expect(201).text("id");
        bob.post("/api/signals/" + signal + "/resolve", null).expect(403);
        outsider.post("/api/signals/" + signal + "/resolve", null).expect(404);
        assertThat(mentor.get("/api/groups/" + groupId).json().get("signals").get("openBlockers").asInt()).isEqualTo(1);
        mentor.post("/api/signals/" + signal + "/resolve", null).expect(200);
    }

    @Test
    void unknownCurriculumIdsAreRejected() {
        alice.post("/api/me/attempts", "{\"topicId\": \"nao-existe\"}").expect(400);
        alice.post("/api/me/resource-events", """
                {"resourceId": "nao-existe", "kind": "opened"}""").expect(400);
        alice.post("/api/evidence", """
                {"topicId": "pointers", "kind": "repository", "title": "sem url"}""").expect(400);
    }
}
