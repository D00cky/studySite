# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

StudySite: a team platform for studying CS/software engineering (roadmap, curated resources, mechanism-focused projects, individual learning records, peer/mentor reviews). Java/Spring Boot backend in `backend/`, React SPA in `frontend/`. User-facing text and content are **Brazilian Portuguese**, but technical terms stay in English. Code identifiers are English, and code comments are Portuguese.

## Workflow: TDD

Every new feature, adjustment or implementation follows TDD (team decision):
1. **Red:** first write a test that expresses the new behavior or reproduces the bug, run it, and confirm it fails for the expected reason.
2. **Green:** write the minimum code that makes it pass.
3. **Refactor:** clean up with the whole suite green.

Pick the test that matches the change:
- Endpoint or authorization rule → a new case in the `*IntegrationTest` classes.
- Content or validator rule → `CurriculumValidatorTest` / `CurriculumContentTest`.
- Frontend behavior → a `*.test.tsx` next to the feature in `frontend/src/features/<area>/`.

Show the test failing before the implementation. Don't write production code without a test asking for it.

## Commands

The Java toolchain is pinned in `mise.toml` (temurin-25). mise may not be activated in the shell, so prefix Java/Maven with `~/.local/bin/mise exec --`. Run Maven from `backend/`.

```fish
docker compose up -d db                                   # Postgres 17 on 127.0.0.1:5433 (dev DB)
cd backend
mise exec -- ./mvnw spring-boot:run -Dspring-boot.run.profiles=demo   # API on :8080; demo profile seeds mentora@demo.local / aprendiz@demo.local, pw demo-senha-123
mise exec -- ./mvnw test                                  # full suite; needs Docker (Testcontainers starts its own postgres:17)
mise exec -- ./mvnw test -Dtest='Curriculum*'             # content validation only, no DB/Docker needed
mise exec -- ./mvnw test -Dtest=AuthorizationIntegrationTest#otherGroupsAreInvisible   # single test
mise exec -- ./mvnw -DskipTests package                   # jar in target/
```

Frontend (Node pinned in `mise.toml`), run from `frontend/`:

```fish
mise exec -- npm run dev                      # :5173, proxies /api and /actuator to :8080 (backend must be running)
mise exec -- npm test                         # Vitest (jsdom + MSW), no backend needed
mise exec -- npx vitest run src/features/topic        # one feature
mise exec -- npx vitest run -t 'pede revisão'         # tests matching a name
mise exec -- npm run typecheck && mise exec -- npm run lint && mise exec -- npm run build
```

Config comes from env vars and the root `.env`, which is imported via `spring.config.import: optional:file:../.env[.properties]`. Both `.env` and `studysite.content-dir` (default `../content`) are relative paths, so the app must run with `backend/` as its working directory.

Gotcha: `pkill -f <jar name>` kills the tool's own shell, because the pattern is also in that shell's command line. Stop the server by PID or by the process listening on port 8080.

## Architecture

**Curriculum is content, not data.** `content/*.yaml` (stages, topics/*.yaml, resources, projects, policies) is loaded at startup by `curriculum/CurriculumLoader` into an immutable in-memory `Curriculum`. The app refuses to start if `CurriculumValidator` finds errors, such as:
- broken references
- prerequisite or stage cycles
- incomplete `authored` topics or projects
- a `pending` resource that has a `checkedOn` date

YAML maps onto records in `curriculum/Model.java` with `FAIL_ON_UNKNOWN_PROPERTIES`, so a new YAML field needs a record change too. Compact constructors turn missing lists into empty lists. The DB stores **only learner activity** and points to content through stable kebab-case text IDs (`topic_id`, `resource_id`, `project_id`, `milestone_id`). Renaming an ID needs a data migration. Controllers validate incoming IDs with `curriculum.checkTopic/checkResource/checkMilestone`.

**Content rules (from the project brief):** never invent links, chapters, authors or verification dates. `verification.status: verified` requires the date the link was actually opened. Anything unconfirmed is `pending` with no date. Fill `section` only with chapters actually seen in the source's table of contents. All 16 stages and 4 branches are `authored`; every authored topic has a `kit` (3–7 items: the 80/20 starter set) and a `deepDive` (≥2 points for later), and every authored project starts with an `m0-redigitar` milestone plus `practice` references (Akita's "sentar e copiar código"). Projects have `track: lab` (default, tied to a stage) or `track: build` ("construa o seu": compiler, database, Git, malloc, emulator, Raft); the projects page groups by it.

**Persistence:** plain SQL through Spring `JdbcClient` (deliberately no ORM; the user chose this). Schema changes go in new Flyway migrations under `src/main/resources/db/migration/`. V1 also creates the Spring Session tables, because `spring.session.jdbc.initialize-schema=never`. Repositories map rows onto nested records via `.query(Record.class)` (snake_case → camelCase), with timestamps as `OffsetDateTime`. Each package follows the same pattern: a `*Repository` (SQL) plus a `*Controller` holding request records with Bean Validation. There is no separate service layer, except `progress/ProgressService`.

**Auth:**
- Spring Security with JSON login in `auth/AuthController` (not formLogin).
- The `SecurityContext` is saved into an HTTP session persisted by Spring Session JDBC: cookie `STUDYSITE_SESSION`, HttpOnly, SameSite=Lax.
- CSRF uses `csrf.spa()`. Clients GET `/api/auth/csrf`, then send the `XSRF-TOKEN` cookie value back in the `X-XSRF-TOKEN` header.
- The principal `security/AppUser` is serialized into the session, so keep it `Serializable`. Get it in controllers with `@AuthenticationPrincipal AppUser`.

**Authorization lives in code, per request.** There are no global roles: mentor/learner is per group, in `group_member`.
- `group/Access` provides `requireMember` (returns the role) and `requireMentor`. A non-member gets **404, not 403**, so existence isn't revealed.
- `evidence/EvidenceAccess` handles evidence: the owner always reads it; group members read it only when `visibility='group'`. A member who isn't the owner gets 403 on write.
- Owner-only records (`/api/me/*`) filter by `user_id` in SQL, using `WHERE id = ? AND user_id = ?`.
- New endpoints must follow these patterns, and `AuthorizationIntegrationTest` is where boundary tests go.

**Learning-model invariants enforced in code** (these are product requirements, so don't "simplify" them away):
- Resource consumption, exercise attempts, evidence, self-assessment and review are separate tables.
- `ProgressService` derives status in this order: `not_started → exploring → practicing → evidence → demonstrated`. Opening a resource only ever reaches `exploring`. `demonstrated` requires the learner's **own** evidence to be accepted in a review.
- Group project milestones never grant individual proficiency.
- A requester can only `comment` on their own review request, never accept it. A requester comment on `changes_requested` reopens the request.
- Requesting a review shares that evidence with the group.
- Group progress (`ProgressRepository.sharedTopicCounts`) exposes only shared evidence, accepted reviews and the latest self-assessment level, never private resource events or attempts.
- Prerequisites guide (`missingPrerequisites`) but never block access.
- `/api/me/continue` picks one `nextAction`, in priority order: the user's own restart note, then feedback awaiting a reply, then the in-progress attempt, then the next suggested topic.

**Stack specifics:** Spring Boot 4.1 uses **Jackson 3** (`tools.jackson.*` packages; `JsonNode.asString()`, not `asText()`), and Spring Security 7. MockMvc test autoconfig lives in `org.springframework.boot.webmvc.test.autoconfigure`.

**Tests:** integration tests extend `IntegrationTest`, which runs the full app with security filters and Spring Session against a Testcontainers Postgres. `ApiClient` acts as a cookie-carrying browser: `register("Name")` returns a logged-in client with a unique email, `freshBrowser()` simulates resuming from a new browser, and `withoutCsrf()` tests CSRF. The Spring context and DB are shared across tests, so every test creates its own users and groups instead of cleaning up.

## Frontend architecture

- `frontend/src/api/client.ts` handles every HTTP call. It builds URLs against `window.location.origin` (needed by Node's fetch under jsdom), sends `X-XSRF-TOKEN` from the `XSRF-TOKEN` cookie on non-GET requests (fetching `/api/auth/csrf` first if the cookie is missing), and turns Problem Details into `ApiError(status, detail)`.
- `api/types.ts` mirrors the backend records by hand. When a backend response changes, update it there.
- `api/queries.ts` holds all TanStack Query hooks and the cache `keys`. Any personal mutation invalidates the `['mine']` prefix, so dashboard, progress and the topic workspace refresh together. Group mutations invalidate `['group']`. Curriculum queries use `staleTime: Infinity`.
- Routes live in `app/routes.tsx` and are exported as `routes`, so tests can mount them in a memory router. `RequireAuth` redirects to `/entrar` on 401. URLs are Portuguese (`/topicos/:id`, `/revisoes/:id`, `/time`, `/registro`, ...). Pages other than login and home load through the router's `lazy`, so a navigation in tests is async (`await waitFor(...)` on `router.state.location`). Vendor code is split into `react`/`query`/`markdown` chunks in `vite.config.ts`.
- Content text with light markdown (`code`, **bold**, `-`/`1.` lists) must go through `components/Markdown.tsx` (`Markdown` or `InlineMarkdown`). It builds React elements and never uses `innerHTML`.
- Accessibility is tested behavior, not decoration:
  - Tests query by role and accessible name, and sections are `aria-labelledby` regions.
  - The roadmap list view is the primary view. The SVG graph uses focusable `role="button"` nodes (Enter/Space selects).
  - Status tags always carry text; color only reinforces it.
- Tests:
  - `renderApp(path)` from `test/render.tsx` mounts the whole app.
  - `signedIn()`/`signedOut()` from `test/handlers.ts` provide default MSW handlers. Register test-specific handlers in a **second** `server.use(...)` call so they take precedence.
  - MSW 3 uses `onUnhandledFrame: 'error'`, so every request a page makes needs a handler.
  - When data loads after a region renders, use `findBy` inside it.

**Out of MVP scope:** executing submitted learner code on the server (evidence is text and links only), and any paid AI API dependency.
