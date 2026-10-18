package br.dev.studysite.security;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.stereotype.Component;

/**
 * Limita tentativas de login com falha por e-mail (janela deslizante, em memória).
 * Suficiente para uma instância só; com várias réplicas, mover para o banco.
 */
@Component
public class LoginAttemptLimiter {

    static final int MAX_FAILURES = 10;
    static final Duration WINDOW = Duration.ofMinutes(15);

    private final Map<String, Deque<Instant>> failures = new ConcurrentHashMap<>();
    private final Clock clock;

    public LoginAttemptLimiter() {
        this(Clock.systemUTC());
    }

    LoginAttemptLimiter(Clock clock) {
        this.clock = clock;
    }

    public boolean isBlocked(String email) {
        Deque<Instant> q = failures.get(key(email));
        if (q == null) {
            return false;
        }
        synchronized (q) {
            prune(q);
            return q.size() >= MAX_FAILURES;
        }
    }

    public void recordFailure(String email) {
        Deque<Instant> q = failures.computeIfAbsent(key(email), k -> new ArrayDeque<>());
        synchronized (q) {
            prune(q);
            q.addLast(clock.instant());
        }
    }

    public void reset(String email) {
        failures.remove(key(email));
    }

    private void prune(Deque<Instant> q) {
        Instant cutoff = clock.instant().minus(WINDOW);
        while (!q.isEmpty() && q.peekFirst().isBefore(cutoff)) {
            q.removeFirst();
        }
    }

    private static String key(String email) {
        return email == null ? "" : email.trim().toLowerCase();
    }
}
