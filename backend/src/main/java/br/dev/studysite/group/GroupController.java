package br.dev.studysite.group;

import br.dev.studysite.common.ApiException;
import br.dev.studysite.security.AppUser;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/groups")
class GroupController {

    record CreateGroup(@NotBlank @Size(max = 120) String name) {
    }

    record JoinGroup(@NotBlank String inviteCode) {
    }

    record RoleUpdate(@NotBlank @Pattern(regexp = "mentor|learner") String role) {
    }

    /** inviteCode só aparece para mentores. */
    record GroupDetail(UUID id, String name, String myRole, String inviteCode,
            List<GroupRepository.MemberRow> members, GroupRepository.TeamSignals signals) {
    }

    private final GroupRepository groups;
    private final Access access;

    GroupController(GroupRepository groups, Access access) {
        this.groups = groups;
        this.access = access;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Transactional
    GroupDetail create(@AuthenticationPrincipal AppUser user, @Valid @RequestBody CreateGroup body) {
        return detail(groups.create(body.name(), user.id()), user.id());
    }

    @PostMapping("/join")
    @Transactional
    GroupDetail join(@AuthenticationPrincipal AppUser user, @Valid @RequestBody JoinGroup body) {
        UUID groupId = groups.findByInviteCode(body.inviteCode())
                .orElseThrow(() -> ApiException.notFound("Código de convite inválido."));
        groups.addMember(groupId, user.id(), Access.LEARNER);
        return detail(groupId, user.id());
    }

    @GetMapping("/{groupId}")
    GroupDetail get(@AuthenticationPrincipal AppUser user, @PathVariable UUID groupId) {
        return detail(groupId, user.id());
    }

    @PatchMapping("/{groupId}/members/{userId}")
    @Transactional
    GroupDetail setRole(@AuthenticationPrincipal AppUser user, @PathVariable UUID groupId,
            @PathVariable UUID userId, @Valid @RequestBody RoleUpdate body) {
        access.requireMentor(groupId, user.id());
        String current = access.role(groupId, userId)
                .orElseThrow(() -> ApiException.notFound("Membro não encontrado."));
        if (Access.MENTOR.equals(current) && Access.LEARNER.equals(body.role()) && groups.mentorCount(groupId) == 1) {
            throw ApiException.conflict("O grupo precisa de pelo menos um mentor.");
        }
        groups.setRole(groupId, userId, body.role());
        return detail(groupId, user.id());
    }

    /** Mentores removem qualquer membro; qualquer pessoa pode sair do grupo. */
    @DeleteMapping("/{groupId}/members/{userId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Transactional
    void removeMember(@AuthenticationPrincipal AppUser user, @PathVariable UUID groupId, @PathVariable UUID userId) {
        String myRole = access.requireMember(groupId, user.id());
        if (!userId.equals(user.id()) && !Access.MENTOR.equals(myRole)) {
            throw ApiException.forbidden("Apenas mentores podem remover outras pessoas.");
        }
        String targetRole = access.role(groupId, userId)
                .orElseThrow(() -> ApiException.notFound("Membro não encontrado."));
        if (Access.MENTOR.equals(targetRole) && groups.mentorCount(groupId) == 1) {
            throw ApiException.conflict("O grupo precisa de pelo menos um mentor.");
        }
        groups.removeMember(groupId, userId);
    }

    @PostMapping("/{groupId}/invite-code")
    Map<String, String> rotateInvite(@AuthenticationPrincipal AppUser user, @PathVariable UUID groupId) {
        access.requireMentor(groupId, user.id());
        return Map.of("inviteCode", groups.rotateInviteCode(groupId));
    }

    private GroupDetail detail(UUID groupId, UUID userId) {
        String role = access.requireMember(groupId, userId);
        GroupRepository.GroupRow g = groups.find(groupId);
        return new GroupDetail(g.id(), g.name(), role, Access.MENTOR.equals(role) ? g.inviteCode() : null,
                groups.members(groupId), groups.signals(groupId));
    }
}
