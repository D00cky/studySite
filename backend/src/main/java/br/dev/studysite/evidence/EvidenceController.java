package br.dev.studysite.evidence;

import br.dev.studysite.activity.ActivityRepository;
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

/**
 * Evidências: texto e links para repositórios ou artefatos. Nenhum código enviado é
 * executado no servidor.
 */
@RestController
@RequestMapping("/api")
class EvidenceController {

    static final String URL_PATTERN = "https?://\\S+";

    record CreateEvidence(
            UUID groupId,
            String topicId,
            String projectId,
            String milestoneId,
            UUID attemptId,
            @NotBlank @Pattern(regexp = "text|repository|artifact") String kind,
            @NotBlank @Size(max = 200) String title,
            @Size(max = 50000) String body,
            @Size(max = 2000) @Pattern(regexp = URL_PATTERN) String url,
            @Size(max = 4000) String aiAssistance,
            @Pattern(regexp = "private|group") String visibility) {
    }

    record UpdateEvidence(
            @Size(min = 1, max = 200) String title,
            @Size(max = 50000) String body,
            @Size(max = 2000) @Pattern(regexp = URL_PATTERN) String url,
            @Size(max = 4000) String aiAssistance,
            @Pattern(regexp = "private|group") String visibility,
            UUID groupId) {
    }

    private final EvidenceRepository evidence;
    private final ActivityRepository activity;
    private final EvidenceAccess evidenceAccess;
    private final Access access;
    private final Curriculum curriculum;

    EvidenceController(EvidenceRepository evidence, ActivityRepository activity, EvidenceAccess evidenceAccess,
            Access access, Curriculum curriculum) {
        this.evidence = evidence;
        this.activity = activity;
        this.evidenceAccess = evidenceAccess;
        this.access = access;
        this.curriculum = curriculum;
    }

    @PostMapping("/evidence")
    @ResponseStatus(HttpStatus.CREATED)
    EvidenceRepository.Evidence create(@AuthenticationPrincipal AppUser user, @Valid @RequestBody CreateEvidence b) {
        if (b.topicId() == null && b.projectId() == null) {
            throw ApiException.badRequest("Associe a evidência a um tópico ou a um projeto.");
        }
        curriculum.checkTopic(b.topicId());
        if (b.projectId() != null) {
            curriculum.requireProject(b.projectId());
        }
        curriculum.checkMilestone(b.projectId(), b.milestoneId());
        if (!"text".equals(b.kind()) && b.url() == null) {
            throw ApiException.badRequest("Evidências de repositório ou artefato precisam de uma URL.");
        }
        String visibility = b.visibility() == null ? "private" : b.visibility();
        if (b.groupId() != null) {
            access.requireMember(b.groupId(), user.id());
        } else if ("group".equals(visibility)) {
            throw ApiException.badRequest("Para compartilhar com o grupo, informe groupId.");
        }
        if (b.attemptId() != null && activity.findAttempt(user.id(), b.attemptId()).isEmpty()) {
            throw ApiException.notFound("Tentativa não encontrada.");
        }
        UUID id = evidence.create(user.id(), new EvidenceRepository.NewEvidence(b.groupId(), b.topicId(),
                b.projectId(), b.milestoneId(), b.attemptId(), b.kind(), b.title().trim(), b.body(), b.url(),
                b.aiAssistance(), visibility));
        return evidence.find(id).orElseThrow();
    }

    @GetMapping("/evidence/{id}")
    EvidenceRepository.Evidence get(@AuthenticationPrincipal AppUser user, @PathVariable UUID id) {
        return evidenceAccess.requireReadable(id, user.id());
    }

    @PatchMapping("/evidence/{id}")
    EvidenceRepository.Evidence update(@AuthenticationPrincipal AppUser user, @PathVariable UUID id,
            @Valid @RequestBody UpdateEvidence b) {
        EvidenceRepository.Evidence current = evidenceAccess.requireOwned(id, user.id());
        if (b.groupId() != null) {
            access.requireMember(b.groupId(), user.id());
        }
        if ("group".equals(b.visibility()) && b.groupId() == null && current.groupId() == null) {
            throw ApiException.badRequest("Para compartilhar com o grupo, informe groupId.");
        }
        evidence.update(user.id(), id, b.title(), b.body(), b.url(), b.aiAssistance(), b.visibility(), b.groupId());
        return evidence.find(id).orElseThrow();
    }

    @DeleteMapping("/evidence/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void delete(@AuthenticationPrincipal AppUser user, @PathVariable UUID id) {
        evidenceAccess.requireOwned(id, user.id());
        evidence.delete(user.id(), id);
    }

    @GetMapping("/me/evidence")
    List<EvidenceRepository.Evidence> mine(@AuthenticationPrincipal AppUser user,
            @RequestParam(required = false) String topicId, @RequestParam(required = false) String projectId) {
        return evidence.mine(user.id(), topicId, projectId);
    }

    @GetMapping("/groups/{groupId}/evidence")
    List<EvidenceRepository.Evidence> shared(@AuthenticationPrincipal AppUser user, @PathVariable UUID groupId,
            @RequestParam(required = false) String topicId, @RequestParam(required = false) String projectId) {
        access.requireMember(groupId, user.id());
        return evidence.sharedInGroup(groupId, topicId, projectId);
    }
}
