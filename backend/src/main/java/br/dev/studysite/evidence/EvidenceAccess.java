package br.dev.studysite.evidence;

import br.dev.studysite.common.ApiException;
import br.dev.studysite.group.Access;
import java.util.UUID;
import org.springframework.stereotype.Component;

/** Quem pode ler ou alterar uma evidência. */
@Component
public class EvidenceAccess {

    private final EvidenceRepository evidence;
    private final Access access;

    EvidenceAccess(EvidenceRepository evidence, Access access) {
        this.evidence = evidence;
        this.access = access;
    }

    /** Dono sempre lê; membros do grupo leem apenas se a evidência foi compartilhada. */
    public EvidenceRepository.Evidence requireReadable(UUID id, UUID userId) {
        EvidenceRepository.Evidence e = evidence.find(id).orElseThrow(EvidenceAccess::notFound);
        if (e.userId().equals(userId)) {
            return e;
        }
        boolean shared = "group".equals(e.visibility()) && e.groupId() != null
                && access.role(e.groupId(), userId).isPresent();
        if (!shared) {
            throw notFound();
        }
        return e;
    }

    /** Somente quem criou altera. Membros do grupo recebem 403; os demais, 404. */
    public EvidenceRepository.Evidence requireOwned(UUID id, UUID userId) {
        EvidenceRepository.Evidence e = requireReadable(id, userId);
        if (!e.userId().equals(userId)) {
            throw ApiException.forbidden("Apenas quem registrou a evidência pode alterá-la.");
        }
        return e;
    }

    private static ApiException notFound() {
        return ApiException.notFound("Evidência não encontrada.");
    }
}
