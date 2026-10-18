package br.dev.studysite.team;

import br.dev.studysite.common.ApiException;
import br.dev.studysite.curriculum.Curriculum;
import br.dev.studysite.curriculum.Model.Project;
import br.dev.studysite.evidence.EvidenceRepository;
import br.dev.studysite.group.Access;
import br.dev.studysite.group.GroupRepository;
import br.dev.studysite.security.AppUser;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
class TeamController {

    static final List<String> ROLE_ORDER = List.of("author", "challenger", "reviewer", "synthesizer");

    record NewTeamSession(@NotBlank @Size(max = 200) String title, OffsetDateTime scheduledFor, String topicId,
            @Size(max = 20000) String agenda) {
    }

    record TeamSessionUpdate(@Size(min = 1, max = 200) String title, OffsetDateTime scheduledFor, String topicId,
            @Size(max = 20000) String agenda, @Size(max = 50000) String findings, @Size(max = 20000) String nextSteps) {
    }

    record RoleInput(@NotNull UUID userId, @NotBlank @Pattern(regexp = "author|challenger|reviewer|synthesizer") String role) {
    }

    record ContributionInput(@NotNull @Size(max = 20000) String contribution) {
    }

    record TeamSessionDetail(TeamRepository.TeamSession session, List<TeamRepository.RoleAssignment> roles) {
    }

    record NewGroupProject(@NotBlank String projectId) {
    }

    record MilestoneInput(@NotBlank @Pattern(regexp = "todo|in_progress|done") String status) {
    }

    /**
     * Visão do projeto do grupo. Marcos são compartilhados; contribuições são
     * evidências individuais. Concluir marcos não marca ninguém como proficiente.
     */
    record GroupProjectDetail(TeamRepository.GroupProject groupProject, Project project,
            List<TeamRepository.MilestoneStatus> milestones, List<EvidenceRepository.Evidence> contributions) {
    }

    record NewSignal(@NotBlank @Pattern(regexp = "blocker|want_help|can_help") String kind, String topicId,
            @NotBlank @Size(max = 4000) String body) {
    }

    private final TeamRepository team;
    private final GroupRepository groups;
    private final EvidenceRepository evidence;
    private final Access access;
    private final Curriculum curriculum;

    TeamController(TeamRepository team, GroupRepository groups, EvidenceRepository evidence, Access access,
            Curriculum curriculum) {
        this.team = team;
        this.groups = groups;
        this.evidence = evidence;
        this.access = access;
        this.curriculum = curriculum;
    }

    // --- sessões do time ---------------------------------------------------------

    @PostMapping("/groups/{groupId}/team-sessions")
    @ResponseStatus(HttpStatus.CREATED)
    TeamSessionDetail createSession(@AuthenticationPrincipal AppUser user, @PathVariable UUID groupId,
            @Valid @RequestBody NewTeamSession b) {
        access.requireMember(groupId, user.id());
        curriculum.checkTopic(b.topicId());
        UUID id = team.createSession(groupId, user.id(), b.title().trim(), b.scheduledFor(), b.topicId(), b.agenda());
        return detail(id);
    }

    @GetMapping("/groups/{groupId}/team-sessions")
    List<TeamRepository.TeamSession> sessions(@AuthenticationPrincipal AppUser user, @PathVariable UUID groupId) {
        access.requireMember(groupId, user.id());
        return team.sessions(groupId);
    }

    /** Sugere a próxima rotação de papéis: cada sessão desloca os papéis em uma posição. */
    @GetMapping("/groups/{groupId}/team-sessions/suggested-roles")
    List<RoleInput> suggestedRoles(@AuthenticationPrincipal AppUser user, @PathVariable UUID groupId) {
        access.requireMember(groupId, user.id());
        List<GroupRepository.MemberRow> members = groups.members(groupId).stream()
                .sorted((a, b) -> a.userId().compareTo(b.userId())).toList();
        if (members.isEmpty()) {
            return List.of();
        }
        int offset = (int) (team.sessionCount(groupId) % members.size());
        List<RoleInput> out = new ArrayList<>();
        for (int i = 0; i < ROLE_ORDER.size(); i++) {
            out.add(new RoleInput(members.get((i + offset) % members.size()).userId(), ROLE_ORDER.get(i)));
        }
        return out;
    }

    @GetMapping("/team-sessions/{id}")
    TeamSessionDetail getSession(@AuthenticationPrincipal AppUser user, @PathVariable UUID id) {
        requireSessionMember(id, user.id());
        return detail(id);
    }

    @PatchMapping("/team-sessions/{id}")
    TeamSessionDetail updateSession(@AuthenticationPrincipal AppUser user, @PathVariable UUID id,
            @Valid @RequestBody TeamSessionUpdate b) {
        TeamRepository.TeamSession s = requireSessionMember(id, user.id());
        boolean canEdit = s.createdBy().equals(user.id())
                || Access.MENTOR.equals(access.requireMember(s.groupId(), user.id()))
                || team.holdsRole(id, user.id());
        if (!canEdit) {
            throw ApiException.forbidden("Apenas quem criou a sessão, mentores ou participantes com papel podem editá-la.");
        }
        curriculum.checkTopic(b.topicId());
        team.updateSession(id, b.title(), b.scheduledFor(), b.topicId(), b.agenda(), b.findings(), b.nextSteps());
        return detail(id);
    }

    @PutMapping("/team-sessions/{id}/roles")
    @Transactional
    TeamSessionDetail setRoles(@AuthenticationPrincipal AppUser user, @PathVariable UUID id,
            @RequestBody List<@Valid RoleInput> roles) {
        TeamRepository.TeamSession s = requireSessionMember(id, user.id());
        if (!s.createdBy().equals(user.id()) && !Access.MENTOR.equals(access.requireMember(s.groupId(), user.id()))) {
            throw ApiException.forbidden("Apenas quem criou a sessão ou um mentor distribui os papéis.");
        }
        Set<String> seen = new HashSet<>();
        for (RoleInput r : roles) {
            if (access.role(s.groupId(), r.userId()).isEmpty()) {
                throw ApiException.badRequest("Todas as pessoas precisam participar do grupo.");
            }
            if (!seen.add(r.userId() + "/" + r.role())) {
                throw ApiException.badRequest("Atribuição repetida.");
            }
        }
        team.replaceRoles(id, roles.stream().map(RoleInput::userId).toList(), roles.stream().map(RoleInput::role).toList());
        return detail(id);
    }

    /** Cada pessoa registra a própria contribuição no papel que assumiu. */
    @PatchMapping("/team-sessions/{id}/roles/{role}/contribution")
    TeamSessionDetail setContribution(@AuthenticationPrincipal AppUser user, @PathVariable UUID id,
            @PathVariable String role, @Valid @RequestBody ContributionInput b) {
        requireSessionMember(id, user.id());
        if (!team.setContribution(id, user.id(), role, b.contribution())) {
            throw ApiException.forbidden("Você não tem este papel nesta sessão.");
        }
        return detail(id);
    }

    // --- projetos do grupo ---------------------------------------------------------

    @PostMapping("/groups/{groupId}/projects")
    @ResponseStatus(HttpStatus.CREATED)
    GroupProjectDetail startProject(@AuthenticationPrincipal AppUser user, @PathVariable UUID groupId,
            @Valid @RequestBody NewGroupProject b) {
        access.requireMember(groupId, user.id());
        curriculum.requireProject(b.projectId());
        return projectDetail(team.startProject(groupId, b.projectId(), user.id()));
    }

    @GetMapping("/groups/{groupId}/projects")
    List<GroupProjectDetail> projects(@AuthenticationPrincipal AppUser user, @PathVariable UUID groupId) {
        access.requireMember(groupId, user.id());
        return team.projects(groupId).stream().map(p -> projectDetail(p.id())).toList();
    }

    @GetMapping("/group-projects/{id}")
    GroupProjectDetail project(@AuthenticationPrincipal AppUser user, @PathVariable UUID id) {
        requireProjectMember(id, user.id());
        return projectDetail(id);
    }

    @PutMapping("/group-projects/{id}/milestones/{milestoneId}")
    GroupProjectDetail setMilestone(@AuthenticationPrincipal AppUser user, @PathVariable UUID id,
            @PathVariable String milestoneId, @Valid @RequestBody MilestoneInput b) {
        TeamRepository.GroupProject gp = requireProjectMember(id, user.id());
        curriculum.checkMilestone(gp.projectId(), milestoneId);
        team.setMilestone(id, milestoneId, b.status(), user.id());
        return projectDetail(id);
    }

    // --- sinais de ajuda ---------------------------------------------------------

    @PostMapping("/groups/{groupId}/signals")
    @ResponseStatus(HttpStatus.CREATED)
    TeamRepository.HelpSignal addSignal(@AuthenticationPrincipal AppUser user, @PathVariable UUID groupId,
            @Valid @RequestBody NewSignal b) {
        access.requireMember(groupId, user.id());
        curriculum.checkTopic(b.topicId());
        return team.findSignal(team.addSignal(groupId, user.id(), b.topicId(), b.kind(), b.body().trim())).orElseThrow();
    }

    @GetMapping("/groups/{groupId}/signals")
    List<TeamRepository.HelpSignal> signals(@AuthenticationPrincipal AppUser user, @PathVariable UUID groupId,
            @RequestParam(defaultValue = "true") boolean open) {
        access.requireMember(groupId, user.id());
        return team.signals(groupId, open);
    }

    @PostMapping("/signals/{id}/resolve")
    TeamRepository.HelpSignal resolve(@AuthenticationPrincipal AppUser user, @PathVariable UUID id) {
        TeamRepository.HelpSignal s = team.findSignal(id)
                .orElseThrow(() -> ApiException.notFound("Sinal não encontrado."));
        String role = access.role(s.groupId(), user.id())
                .orElseThrow(() -> ApiException.notFound("Sinal não encontrado."));
        if (!s.userId().equals(user.id()) && !Access.MENTOR.equals(role)) {
            throw ApiException.forbidden("Apenas quem abriu o sinal ou um mentor pode resolvê-lo.");
        }
        team.resolveSignal(id);
        return team.findSignal(id).orElseThrow();
    }

    // --- utilitários ---------------------------------------------------------

    private TeamRepository.TeamSession requireSessionMember(UUID id, UUID userId) {
        TeamRepository.TeamSession s = team.findSession(id)
                .orElseThrow(() -> ApiException.notFound("Sessão do time não encontrada."));
        if (access.role(s.groupId(), userId).isEmpty()) {
            throw ApiException.notFound("Sessão do time não encontrada.");
        }
        return s;
    }

    private TeamRepository.GroupProject requireProjectMember(UUID id, UUID userId) {
        TeamRepository.GroupProject gp = team.findProject(id)
                .orElseThrow(() -> ApiException.notFound("Projeto do grupo não encontrado."));
        if (access.role(gp.groupId(), userId).isEmpty()) {
            throw ApiException.notFound("Projeto do grupo não encontrado.");
        }
        return gp;
    }

    private TeamSessionDetail detail(UUID id) {
        return new TeamSessionDetail(team.findSession(id).orElseThrow(), team.roles(id));
    }

    private GroupProjectDetail projectDetail(UUID id) {
        TeamRepository.GroupProject gp = team.findProject(id).orElseThrow();
        return new GroupProjectDetail(gp, curriculum.requireProject(gp.projectId()), team.milestones(id),
                evidence.sharedInGroup(gp.groupId(), null, gp.projectId()));
    }
}
