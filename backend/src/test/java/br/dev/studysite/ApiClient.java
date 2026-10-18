package br.dev.studysite;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;

import jakarta.servlet.http.Cookie;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/**
 * Cliente HTTP de teste que guarda cookies entre chamadas, como um navegador.
 * A sessão é do Spring Session (cookie STUDYSITE_SESSION), não um MockHttpSession.
 */
final class ApiClient {

    record Response(int status, JsonNode body, String raw) {
        Response expect(int expected) {
            assertThat(status).as("HTTP status; corpo: %s", raw).isEqualTo(expected);
            return this;
        }

        JsonNode json() {
            return body;
        }

        String text(String field) {
            return body.get(field).asString();
        }
    }

    private final MockMvc mvc;
    private final JsonMapper json;
    private final Map<String, Cookie> cookies = new LinkedHashMap<>();
    private boolean sendCsrf = true;
    String email;

    ApiClient(MockMvc mvc, JsonMapper json) {
        this.mvc = mvc;
        this.json = json;
    }

    /** Desliga o token CSRF para testar a proteção. */
    ApiClient withoutCsrf() {
        sendCsrf = false;
        return this;
    }

    /** Simula um navegador novo (sem cookies), para testar retomada em outra sessão. */
    ApiClient freshBrowser() {
        ApiClient other = new ApiClient(mvc, json);
        other.email = email;
        return other;
    }

    Response get(String url) {
        return send(HttpMethod.GET, url, null);
    }

    Response post(String url, String body) {
        return send(HttpMethod.POST, url, body);
    }

    Response patch(String url, String body) {
        return send(HttpMethod.PATCH, url, body);
    }

    Response put(String url, String body) {
        return send(HttpMethod.PUT, url, body);
    }

    Response delete(String url) {
        return send(HttpMethod.DELETE, url, null);
    }

    Response send(HttpMethod method, String url, String body) {
        try {
            MockHttpServletRequestBuilder req = MockMvcRequestBuilders.request(method, url)
                    .accept(MediaType.APPLICATION_JSON);
            if (body != null) {
                req.contentType(MediaType.APPLICATION_JSON).content(body);
            }
            if (!cookies.isEmpty()) {
                req.cookie(cookies.values().toArray(Cookie[]::new));
            }
            if (sendCsrf && method != HttpMethod.GET) {
                req.with(csrf());
            }
            MockHttpServletResponse res = mvc.perform(req).andReturn().getResponse();
            for (Cookie c : res.getCookies()) {
                if (c.getMaxAge() == 0) {
                    cookies.remove(c.getName());
                } else {
                    cookies.put(c.getName(), c);
                }
            }
            String raw = res.getContentAsString();
            JsonNode node = raw.isBlank() ? null : json.readTree(raw);
            return new Response(res.getStatus(), node, raw);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }
}
