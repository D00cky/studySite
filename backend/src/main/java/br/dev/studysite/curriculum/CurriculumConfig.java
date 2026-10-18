package br.dev.studysite.curriculum;

import java.nio.file.Path;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
class CurriculumConfig {

    @Bean
    Curriculum curriculum(@Value("${studysite.content-dir}") String contentDir) {
        // String, não Path: o conversor do Spring trataria o valor como recurso do classpath.
        return CurriculumLoader.load(Path.of(contentDir).toAbsolutePath().normalize());
    }
}
