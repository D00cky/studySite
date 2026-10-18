package br.dev.studysite.notes;

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
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/** Notas são privadas por padrão; só ficam visíveis ao grupo quando a autora escolhe. */
@RestController
@RequestMapping("/api")
class NoteController {

    record CreateNote(@NotBlank @Size(max = 200) String title, @Size(max = 50000) String body, String topicId,
            UUID groupId, @Pattern(regexp = "private|group") String visibility) {
    }

    record UpdateNote(@Size(min = 1, max = 200) String title, @Size(max = 50000) String body,
            @Pattern(regexp = "private|group") String visibility, UUID groupId) {
    }

    private final NoteRepository notes;
    private final Access access;
    private final Curriculum curriculum;

    NoteController(NoteRepository notes, Access access, Curriculum curriculum) {
        this.notes = notes;
        this.access = access;
        this.curriculum = curriculum;
    }

    @PostMapping("/notes")
    @ResponseStatus(HttpStatus.CREATED)
    NoteRepository.Note create(@AuthenticationPrincipal AppUser user, @Valid @RequestBody CreateNote b) {
        curriculum.checkTopic(b.topicId());
        String visibility = b.visibility() == null ? "private" : b.visibility();
        if (b.groupId() != null) {
            access.requireMember(b.groupId(), user.id());
        } else if ("group".equals(visibility)) {
            throw ApiException.badRequest("Para compartilhar com o grupo, informe groupId.");
        }
        UUID id = notes.create(user.id(), b.groupId(), b.topicId(), b.title().trim(), b.body(), visibility);
        return notes.find(id).orElseThrow();
    }

    @GetMapping("/notes/{id}")
    NoteRepository.Note get(@AuthenticationPrincipal AppUser user, @PathVariable UUID id) {
        return requireReadable(id, user.id());
    }

    @PatchMapping("/notes/{id}")
    NoteRepository.Note update(@AuthenticationPrincipal AppUser user, @PathVariable UUID id,
            @Valid @RequestBody UpdateNote b) {
        NoteRepository.Note n = requireOwned(id, user.id());
        if (b.groupId() != null) {
            access.requireMember(b.groupId(), user.id());
        }
        if ("group".equals(b.visibility()) && b.groupId() == null && n.groupId() == null) {
            throw ApiException.badRequest("Para compartilhar com o grupo, informe groupId.");
        }
        notes.update(user.id(), id, b.title(), b.body(), b.visibility(), b.groupId());
        return notes.find(id).orElseThrow();
    }

    @DeleteMapping("/notes/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void delete(@AuthenticationPrincipal AppUser user, @PathVariable UUID id) {
        requireOwned(id, user.id());
        notes.delete(user.id(), id);
    }

    @GetMapping("/me/notes")
    List<NoteRepository.Note> mine(@AuthenticationPrincipal AppUser user,
            @RequestParam(required = false) String topicId) {
        return notes.mine(user.id(), topicId);
    }

    @GetMapping("/groups/{groupId}/notes")
    List<NoteRepository.Note> shared(@AuthenticationPrincipal AppUser user, @PathVariable UUID groupId,
            @RequestParam(required = false) String topicId) {
        access.requireMember(groupId, user.id());
        return notes.sharedInGroup(groupId, topicId);
    }

    private NoteRepository.Note requireReadable(UUID id, UUID userId) {
        NoteRepository.Note n = notes.find(id).orElseThrow(() -> ApiException.notFound("Nota não encontrada."));
        if (n.userId().equals(userId)) {
            return n;
        }
        if ("group".equals(n.visibility()) && n.groupId() != null && access.role(n.groupId(), userId).isPresent()) {
            return n;
        }
        throw ApiException.notFound("Nota não encontrada.");
    }

    private NoteRepository.Note requireOwned(UUID id, UUID userId) {
        NoteRepository.Note n = requireReadable(id, userId);
        if (!n.userId().equals(userId)) {
            throw ApiException.forbidden("Apenas a autora pode alterar esta nota.");
        }
        return n;
    }
}
