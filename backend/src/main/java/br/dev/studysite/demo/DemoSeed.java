package br.dev.studysite.demo;

import br.dev.studysite.auth.UserRepository;
import br.dev.studysite.group.Access;
import br.dev.studysite.group.GroupRepository;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * DADOS DE DEMONSTRAÇÃO — só com o perfil "demo". Cria uma mentora e um aprendiz no
 * mesmo grupo para testar o fluxo localmente. Nunca ative em produção.
 */
@Component
@Profile("demo")
class DemoSeed implements ApplicationRunner {

    static final String PASSWORD = "demo-senha-123";
    private static final Logger log = LoggerFactory.getLogger(DemoSeed.class);

    private final UserRepository users;
    private final GroupRepository groups;
    private final PasswordEncoder encoder;

    DemoSeed(UserRepository users, GroupRepository groups, PasswordEncoder encoder) {
        this.users = users;
        this.groups = groups;
        this.encoder = encoder;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (users.emailExists("mentora@demo.local")) {
            log.info("Dados de demonstração já existem.");
            return;
        }
        UUID mentor = users.create("mentora@demo.local", "Mentora (demo)", encoder.encode(PASSWORD));
        UUID learner = users.create("aprendiz@demo.local", "Aprendiz (demo)", encoder.encode(PASSWORD));
        UUID group = groups.create("Grupo de demonstração", mentor);
        groups.addMember(group, learner, Access.LEARNER);
        log.info("Dados de demonstração criados: mentora@demo.local e aprendiz@demo.local (senha {}).", PASSWORD);
    }
}
