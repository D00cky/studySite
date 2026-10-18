package br.dev.studysite.review;

import br.dev.studysite.common.ApiException;
import br.dev.studysite.evidence.EvidenceAccess;
import br.dev.studysite.evidence.EvidenceRepository;
import br.dev.studysite.group.Access;
import br.dev.studysite.security.AppUser;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/**
 * Pedidos de revisão. Pedir revisão compartilha a evidência com o grupo escolhido —
 * a pessoa está pedindo explicitamente que o grupo a leia.
 */
@RestController
@RequestMapping("/api")
class ReviewController {

    record NewReviewRequest(@NotNull UUID groupId, @Size(max = 4000) String question, UUID reviewerId) {
    }

    record NewFeedback(@NotBlank @Pattern(regexp = "comment|changes_requested|accepted") String verdict,
            @NotBlank @Size(max = 20000) String body) {
    }

    record ReviewThread(ReviewRepository.ReviewRequest request, EvidenceRepository.Evidence evidence,
            List<ReviewRepository.Feedback> feedback) {
    }

    record MyReviews(List<ReviewRepository.ReviewRequest> requested, List<ReviewRepository.ReviewRequest> toReview) {
    }

    private final ReviewRepository reviews;
    private final EvidenceRepository evidence;
    private final EvidenceAccess evidenceAccess;
    private final Access access;

    ReviewController(ReviewRepository reviews, EvidenceRepository evidence, EvidenceAccess evidenceAccess,
            Access access) {
        this.reviews = reviews;
        this.evidence = evidence;
        this.evidenceAccess = evidenceAccess;
        this.access = access;
    }

    @PostMapping("/evidence/{evidenceId}/review-requests")
    @ResponseStatus(HttpStatus.CREATED)
    @Transactional
    ReviewThread request(@AuthenticationPrincipal AppUser user, @PathVariable UUID evidenceId,
            @Valid @RequestBody NewReviewRequest body) {
        EvidenceRepository.Evidence e = evidenceAccess.requireOwned(evidenceId, user.id());
        access.requireMember(body.groupId(), user.id());
        if (e.groupId() != null && !e.groupId().equals(body.groupId())) {
            throw ApiException.conflict("Esta evidência já está associada a outro grupo.");
        }
        if (body.reviewerId() != null) {
            if (body.reviewerId().equals(user.id())) {
                throw ApiException.badRequest("Escolha outra pessoa para revisar.");
            }
            if (access.role(body.groupId(), body.reviewerId()).isEmpty()) {
                throw ApiException.badRequest("A pessoa revisora precisa participar do grupo.");
            }
        }
        if (reviews.hasActiveRequest(evidenceId)) {
            throw ApiException.conflict("Já existe um pedido de revisão em andamento para esta evidência.");
        }
        evidence.shareWithGroup(evidenceId, body.groupId());
        UUID id = reviews.create(body.groupId(), evidenceId, user.id(), body.reviewerId(), body.question());
        return thread(id);
    }

    @GetMapping("/groups/{groupId}/review-requests")
    List<ReviewRepository.ReviewRequest> forGroup(@AuthenticationPrincipal AppUser user, @PathVariable UUID groupId,
            @RequestParam(required = false) String status) {
        access.requireMember(groupId, user.id());
        return reviews.forGroup(groupId, status);
    }

    @GetMapping("/me/review-requests")
    MyReviews mine(@AuthenticationPrincipal AppUser user) {
        return new MyReviews(reviews.requestedBy(user.id()), reviews.awaitingReviewBy(user.id()));
    }

    @GetMapping("/review-requests/{id}")
    ReviewThread get(@AuthenticationPrincipal AppUser user, @PathVariable UUID id) {
        requireRequestMember(id, user.id());
        return thread(id);
    }

    @PostMapping("/review-requests/{id}/claim")
    @Transactional
    ReviewThread claim(@AuthenticationPrincipal AppUser user, @PathVariable UUID id) {
        ReviewRepository.ReviewRequest r = requireRequestMember(id, user.id());
        if (r.requesterId().equals(user.id())) {
            throw ApiException.badRequest("Você não pode revisar o próprio pedido.");
        }
        if (r.reviewerId() != null && !r.reviewerId().equals(user.id())) {
            throw ApiException.conflict("Outra pessoa já está revisando este pedido.");
        }
        reviews.setReviewer(id, user.id());
        return thread(id);
    }

    /**
     * Qualquer membro pode comentar. Veredito (aceitar / pedir mudanças) só vem de
     * quem não fez o pedido. Uma nova resposta da autora reabre o pedido.
     */
    @PostMapping("/review-requests/{id}/feedback")
    @ResponseStatus(HttpStatus.CREATED)
    @Transactional
    ReviewThread feedback(@AuthenticationPrincipal AppUser user, @PathVariable UUID id,
            @Valid @RequestBody NewFeedback body) {
        ReviewRepository.ReviewRequest r = requireRequestMember(id, user.id());
        String role = access.requireMember(r.groupId(), user.id());
        if ("closed".equals(r.status())) {
            throw ApiException.conflict("Este pedido foi encerrado.");
        }
        boolean isRequester = r.requesterId().equals(user.id());
        if (isRequester && !"comment".equals(body.verdict())) {
            throw ApiException.forbidden("Quem pediu a revisão não pode aprovar o próprio trabalho.");
        }
        reviews.addFeedback(id, user.id(), role, body.verdict(), body.body().trim());
        if (!"comment".equals(body.verdict())) {
            reviews.setStatus(id, body.verdict());
        } else if (isRequester && "changes_requested".equals(r.status())) {
            reviews.setStatus(id, "open");
        } else {
            reviews.touch(id);
        }
        return thread(id);
    }

    @PostMapping("/review-requests/{id}/close")
    @Transactional
    ReviewThread close(@AuthenticationPrincipal AppUser user, @PathVariable UUID id) {
        ReviewRepository.ReviewRequest r = requireRequestMember(id, user.id());
        String role = access.requireMember(r.groupId(), user.id());
        if (!r.requesterId().equals(user.id()) && !Access.MENTOR.equals(role)) {
            throw ApiException.forbidden("Apenas quem pediu ou um mentor pode encerrar o pedido.");
        }
        if (!"accepted".equals(r.status())) {
            reviews.setStatus(id, "closed");
        }
        return thread(id);
    }

    private ReviewRepository.ReviewRequest requireRequestMember(UUID id, UUID userId) {
        ReviewRepository.ReviewRequest r = reviews.find(id)
                .orElseThrow(() -> ApiException.notFound("Pedido de revisão não encontrado."));
        if (access.role(r.groupId(), userId).isEmpty()) {
            throw ApiException.notFound("Pedido de revisão não encontrado.");
        }
        return r;
    }

    private ReviewThread thread(UUID id) {
        ReviewRepository.ReviewRequest r = reviews.find(id).orElseThrow();
        return new ReviewThread(r, evidence.find(r.evidenceId()).orElseThrow(), reviews.feedback(id));
    }
}
