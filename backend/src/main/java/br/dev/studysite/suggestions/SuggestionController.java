package br.dev.studysite.suggestions;

import br.dev.studysite.common.ApiException;
import br.dev.studysite.curriculum.Curriculum;
import br.dev.studysite.group.Access;
import br.dev.studysite.security.AppUser;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/**
 * Sugestões de recursos feitas por membros. Uma sugestão aceita continua fora de
 * content/resources.yaml até alguém verificar o link e editar o arquivo — o banco
 * não altera o currículo curado.
 */
@RestController
@RequestMapping("/api")
class SuggestionController {

    record NewSuggestion(@NotBlank @Size(max = 300) String title,
            @NotBlank @Size(max = 2000) @Pattern(regexp = "https?://\\S+") String url,
            List<String> topicIds, @Size(max = 4000) String rationale) {
    }

    record ReviewInput(@NotBlank @Pattern(regexp = "accepted|rejected") String status, @Size(max = 4000) String note) {
    }

    private final SuggestionRepository suggestions;
    private final Access access;
    private final Curriculum curriculum;

    SuggestionController(SuggestionRepository suggestions, Access access, Curriculum curriculum) {
        this.suggestions = suggestions;
        this.access = access;
        this.curriculum = curriculum;
    }

    @PostMapping("/groups/{groupId}/resource-suggestions")
    @ResponseStatus(HttpStatus.CREATED)
    SuggestionRepository.Suggestion suggest(@AuthenticationPrincipal AppUser user, @PathVariable UUID groupId,
            @Valid @RequestBody NewSuggestion b) {
        access.requireMember(groupId, user.id());
        List<String> topics = b.topicIds() == null ? List.of() : b.topicIds();
        topics.forEach(curriculum::checkTopic);
        UUID id = suggestions.create(groupId, user.id(), b.title().trim(), b.url().trim(), topics, b.rationale());
        return suggestions.find(id).orElseThrow();
    }

    @GetMapping("/groups/{groupId}/resource-suggestions")
    List<SuggestionRepository.Suggestion> list(@AuthenticationPrincipal AppUser user, @PathVariable UUID groupId,
            @RequestParam(required = false) String status) {
        access.requireMember(groupId, user.id());
        return suggestions.forGroup(groupId, status);
    }

    @PostMapping("/resource-suggestions/{id}/review")
    SuggestionRepository.Suggestion review(@AuthenticationPrincipal AppUser user, @PathVariable UUID id,
            @Valid @RequestBody ReviewInput b) {
        SuggestionRepository.Suggestion s = suggestions.find(id)
                .orElseThrow(() -> ApiException.notFound("Sugestão não encontrada."));
        if (access.role(s.groupId(), user.id()).isEmpty()) {
            throw ApiException.notFound("Sugestão não encontrada.");
        }
        access.requireMentor(s.groupId(), user.id());
        suggestions.review(id, user.id(), b.status(), b.note());
        return suggestions.find(id).orElseThrow();
    }
}
