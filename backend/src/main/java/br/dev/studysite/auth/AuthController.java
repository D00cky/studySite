package br.dev.studysite.auth;

import br.dev.studysite.common.ApiException;
import br.dev.studysite.security.AppUser;
import br.dev.studysite.security.LoginAttemptLimiter;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
class AuthController {

    record RegisterRequest(
            @NotBlank @Email @Size(max = 200) String email,
            @NotBlank @Size(max = 80) String displayName,
            @NotBlank @Size(min = 10, max = 200) String password) {
    }

    record LoginRequest(@NotBlank String email, @NotBlank String password) {
    }

    record ProfileUpdate(
            @Size(min = 1, max = 80) String displayName,
            @Pattern(regexp = "survival|compact|standard|expansion") String weeklyMode) {
    }

    record Me(UUID id, String email, String displayName, String weeklyMode, List<UserRepository.Membership> groups) {
    }

    private final UserRepository users;
    private final PasswordEncoder encoder;
    private final AuthenticationManager authManager;
    private final SecurityContextRepository contextRepository;
    private final LoginAttemptLimiter limiter;
    private final boolean registrationEnabled;

    AuthController(UserRepository users, PasswordEncoder encoder, AuthenticationManager authManager,
            SecurityContextRepository contextRepository, LoginAttemptLimiter limiter,
            @Value("${studysite.registration-enabled}") boolean registrationEnabled) {
        this.users = users;
        this.encoder = encoder;
        this.authManager = authManager;
        this.contextRepository = contextRepository;
        this.limiter = limiter;
        this.registrationEnabled = registrationEnabled;
    }

    /** A SPA chama isto antes do primeiro POST para receber o cookie XSRF-TOKEN. */
    @GetMapping("/csrf")
    Map<String, String> csrf(CsrfToken token) {
        return Map.of("headerName", token.getHeaderName(), "token", token.getToken());
    }

    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    Me register(@Valid @RequestBody RegisterRequest body, HttpServletRequest req, HttpServletResponse res) {
        if (!registrationEnabled) {
            throw ApiException.forbidden("O cadastro está desativado neste servidor.");
        }
        if (users.emailExists(body.email())) {
            throw ApiException.conflict("Já existe uma conta com este e-mail.");
        }
        users.create(body.email(), body.displayName(), encoder.encode(body.password()));
        return signIn(body.email(), body.password(), req, res);
    }

    @PostMapping("/login")
    Me login(@Valid @RequestBody LoginRequest body, HttpServletRequest req, HttpServletResponse res) {
        if (limiter.isBlocked(body.email())) {
            throw new ApiException(HttpStatus.TOO_MANY_REQUESTS,
                    "Muitas tentativas com falha. Aguarde alguns minutos e tente de novo.");
        }
        try {
            Me me = signIn(body.email(), body.password(), req, res);
            limiter.reset(body.email());
            return me;
        } catch (AuthenticationException e) {
            limiter.recordFailure(body.email());
            throw new ApiException(HttpStatus.UNAUTHORIZED, "E-mail ou senha incorretos.");
        }
    }

    @PostMapping("/logout")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void logout(HttpServletRequest req) {
        HttpSession session = req.getSession(false);
        if (session != null) {
            session.invalidate();
        }
        SecurityContextHolder.clearContext();
    }

    @GetMapping("/me")
    Me me(@AuthenticationPrincipal AppUser user) {
        return describe(user.id());
    }

    @PatchMapping("/me")
    Me updateMe(@AuthenticationPrincipal AppUser user, @Valid @RequestBody ProfileUpdate body) {
        users.updateProfile(user.id(), body.displayName(), body.weeklyMode());
        return describe(user.id());
    }

    private Me signIn(String email, String password, HttpServletRequest req, HttpServletResponse res) {
        Authentication auth = authManager.authenticate(
                UsernamePasswordAuthenticationToken.unauthenticated(email.trim(), password));
        // Evita fixação de sessão: um novo ID de sessão depois do login.
        if (req.getSession(false) != null) {
            req.changeSessionId();
        }
        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(auth);
        SecurityContextHolder.setContext(context);
        contextRepository.saveContext(context, req, res);
        return describe(((AppUser) auth.getPrincipal()).id());
    }

    private Me describe(UUID id) {
        UserRepository.UserRow u = users.find(id);
        return new Me(u.id(), u.email(), u.displayName(), u.weeklyMode(), users.memberships(id));
    }
}
