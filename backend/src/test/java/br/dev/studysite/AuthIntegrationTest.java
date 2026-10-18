package br.dev.studysite;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class AuthIntegrationTest extends IntegrationTest {

    @Test
    void unauthenticatedRequestsGet401() {
        anonymous().get("/api/curriculum").expect(401);
        anonymous().get("/api/me/continue").expect(401);
    }

    @Test
    void healthIsPublic() {
        anonymous().get("/actuator/health").expect(200);
    }

    @Test
    void registerLoginLogout() {
        ApiClient ana = register("Ana");
        assertThat(ana.get("/api/auth/me").expect(200).text("displayName")).isEqualTo("Ana");

        ana.post("/api/auth/logout", null).expect(204);
        ana.get("/api/auth/me").expect(401);

        ApiClient again = anonymous();
        again.post("/api/auth/login", """
                {"email": "%s", "password": "senha-segura-123"}""".formatted(ana.email)).expect(200);
        again.get("/api/auth/me").expect(200);
    }

    @Test
    void wrongPasswordIsRejected() {
        ApiClient bia = register("Bia");
        anonymous().post("/api/auth/login", """
                {"email": "%s", "password": "errada-errada"}""".formatted(bia.email)).expect(401);
    }

    @Test
    void duplicateEmailIsRejected() {
        ApiClient caio = register("Caio");
        anonymous().post("/api/auth/register", """
                {"email": "%s", "displayName": "Outro", "password": "senha-segura-123"}""".formatted(caio.email))
                .expect(409);
    }

    @Test
    void shortPasswordIsRejected() {
        anonymous().post("/api/auth/register", """
                {"email": "curta@example.test", "displayName": "X", "password": "123"}""").expect(400);
    }

    @Test
    void postWithoutCsrfTokenIsForbidden() {
        ApiClient dani = register("Dani");
        dani.withoutCsrf().post("/api/notes", """
                {"title": "sem csrf"}""").expect(403);
    }

    @Test
    void repeatedFailuresAreRateLimited() {
        ApiClient eva = register("Eva");
        for (int i = 0; i < 10; i++) {
            anonymous().post("/api/auth/login", """
                    {"email": "%s", "password": "errada-errada"}""".formatted(eva.email)).expect(401);
        }
        anonymous().post("/api/auth/login", """
                {"email": "%s", "password": "senha-segura-123"}""".formatted(eva.email)).expect(429);
    }
}
