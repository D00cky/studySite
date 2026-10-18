package br.dev.studysite;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletResponse;

/** Em produção o Spring também entrega a SPA compilada (mesma origem: sessão e CSRF funcionam). */
class FrontendServingIntegrationTest extends IntegrationTest {

    private MockHttpServletResponse anonymousGet(String path) throws Exception {
        return mvc.perform(get(path)).andReturn().getResponse();
    }

    /** O MockMvc não executa forwards: vale o index.html servido ou o forward para ele. */
    private static boolean isSpaShell(MockHttpServletResponse res) throws Exception {
        String forwarded = res.getForwardedUrl();
        return (forwarded != null && forwarded.endsWith("index.html")) || res.getContentAsString().contains("<div id=\"root\">");
    }

    @Test
    void servesTheSpaShellAtTheRootWithoutLogin() throws Exception {
        MockHttpServletResponse res = anonymousGet("/");
        assertThat(res.getStatus()).isEqualTo(200);
        assertThat(isSpaShell(res)).isTrue();
    }

    @Test
    void clientSideRoutesFallBackToTheSpaShell() throws Exception {
        for (String route : new String[] {"/roadmap", "/topicos/pointers", "/projetos-do-grupo/abc", "/entrar"}) {
            MockHttpServletResponse res = anonymousGet(route);
            assertThat(res.getStatus()).as(route).isEqualTo(200);
            assertThat(isSpaShell(res)).as(route).isTrue();
        }
    }

    @Test
    void apiAndMissingFilesAreNotSwallowedByTheFallback() throws Exception {
        assertThat(anonymousGet("/api/curriculum").getStatus()).isEqualTo(401);
        ApiClient lia = register("Lia");
        lia.get("/api/nao-existe").expect(404);
        assertThat(anonymousGet("/assets/nao-existe.js").getStatus()).isEqualTo(404);
        assertThat(anonymousGet("/actuator/env").getStatus()).isIn(401, 403, 404);
        assertThat(mvc.perform(post("/roadmap")).andReturn().getResponse().getStatus()).isEqualTo(403);
    }
}
