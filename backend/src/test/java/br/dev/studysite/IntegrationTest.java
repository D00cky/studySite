package br.dev.studysite;

import java.util.UUID;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.test.web.servlet.MockMvc;
import tools.jackson.databind.json.JsonMapper;

/**
 * Base dos testes de integração: aplicação completa (filtros de segurança, Spring
 * Session, Flyway) contra um PostgreSQL real em container. O contexto é compartilhado
 * entre as classes; cada teste cria usuários com e-mails únicos.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
abstract class IntegrationTest {

    @Autowired
    protected MockMvc mvc;

    @Autowired
    protected JsonMapper json;

    protected ApiClient anonymous() {
        return new ApiClient(mvc, json);
    }

    /** Cria uma conta nova e devolve um cliente já autenticado. */
    protected ApiClient register(String name) {
        ApiClient client = anonymous();
        String email = name.toLowerCase() + "-" + UUID.randomUUID() + "@example.test";
        client.post("/api/auth/register", """
                {"email": "%s", "displayName": "%s", "password": "senha-segura-123"}
                """.formatted(email, name)).expect(201);
        client.email = email;
        return client;
    }
}
