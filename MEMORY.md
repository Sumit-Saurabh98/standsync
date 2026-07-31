# MEMORY — How We Build StandSync

This file records how the developer and the AI assistant work together on this
project, so anyone (or any future session) can pick up with the same approach.

---

## Working Style (read this first)

The developer is building StandSync **to learn**. They write every file
themselves. The assistant's job is to guide and teach, not to build for them.

**Ground rules:**

1. **Backend:** assistant writes code in chat → developer types into files (spoon-feed,
   one step at a time). Assistant does not edit backend files in the repo.
2. **Frontend:** assistant edits `apps/web` directly (full code changes in repo).
3. **One step at a time for backend.** Give a single step, wait until the developer
   finishes before the next. Frontend can be delivered in larger slices.
4. **Always point to the docs** for backend steps (which doc/section + which file).
5. **Do not overexplain general/Node topics.** Keep it short; expand only when the
   developer asks "why" or "explain."
6. **Teach NestJS as we go.** The developer is a Node.js pro but new to NestJS.
   Explain every NestJS-specific concept the first time it appears — dependency
   injection, providers, modules, decorators, guards, pipes, interceptors, DTOs,
   lifecycle — briefly and tied to the code being written. Skip Node basics.

_(Exceptions: `docs/` + `README.md` written by assistant up front; `apps/web`
frontend written/edited by assistant directly.)_

---

## What StandSync Is

A backend that automates daily standups for engineering teams: members submit
standups, the system compiles a daily digest and sends it to Slack/Discord/Teams
via webhook, reminds non-submitters, and provides history, reports, and analytics.

- **Stack:** NestJS + TypeScript · PostgreSQL + Prisma · Redis + BullMQ · JWT auth
- **Shape:** Modular monolith — NestJS API + worker; Next.js web (`apps/web`).

---

## Where Everything Lives

- **Requirements & design:** `docs/` — overview, requirements, tech stack,
  architecture, database schema, API spec, folder structure, user flows,
  environment variables, coding guidelines.
- **Build plan:** `docs/roadmap.md` — phased, Phase 0 → 7. We build in this order.
- **Decisions & why:** `docs/decisions.md` — architecture decision records.
- **This file:** the working agreement + quick project orientation.

---

## Current Status

Building **Phase 0 — Foundations** (see `docs/roadmap.md`). Done: NestJS scaffold
running, Prisma installed + `prisma init`, `DATABASE_URL` set, `docker-compose.yml`
(Postgres + Redis) up. Docs hardened with 8 robustness/scale improvements +
`docs/error_handling.md` added. Social auth (Google + GitHub) added to design:
`User.passwordHash` nullable, new `AuthAccount` table, one user = many auth
methods (keep ≥1).

**Phase 0 essentially complete:** NestJS scaffold; `User` model + initial
migration; `PrismaModule`/`PrismaService`; `@nestjs/config` + Joi boot validation;
global `AllExceptionsFilter` (error envelope + x-request-id); Pino structured
logging; Swagger at `/api/docs`; `/health` DB check; Redis + BullMQ via
`QueueRootModule`; split API (`main.ts`) / worker (`worker.ts`) entrypoints proven
with a throwaway `/demo` route + `DemoProcessor` (delete in Phase 4).
Remaining Phase 0: `.env.example`, optional git init + CI.

**Full-stack decision:** Next.js frontend (`apps/web`) + NestJS (`apps/api`) in a
**monorepo**, built as **vertical slices** (finish a module's backend → build its
frontend → integrate → test live → next module). Browser session = httpOnly
refresh cookie + in-memory access token (ADR-015). See `docs/frontend_architecture.md`.
Monorepo restructure (`src` → `apps/api` + scaffold `apps/web`) happens when we
pivot to the auth frontend, not before.

**Now in Phase 1 (auth backend)**, still in current `src/`. DONE: register
(bcrypt, 409 dup); login (access JWT + refresh as httpOnly cookie, 200); JWT
strategy + `JwtAuthGuard` + `@CurrentUser` + `GET /auth/me`; `/auth/refresh`
rotation + reuse detection (familyId, sha256 tokenHash unique, jti nonce);
logout (revokes family + clears cookie). Refresh tokens: JWT signed w/ REFRESH
secret, payload {sub,familyId,jti}, row stored per token, revoked+replacedBy on
rotate. Prisma 7 driver-adapter setup (client in src/generated/prisma).
Mailer DONE: `MailService` (nodemailer `service:'gmail'`, console fallback if no
creds). Env names: **GMAIL_USER / GMAIL_APP_PASSWORD** (not SMTP_*), MAIL_FROM
optional (defaults to GMAIL_USER). Gmail SMTP for dev AND prod for now (user's
choice); swappable to SES/Postmark via env. Duration strings ('24h','1h') parsed
by a local `durationToMs` helper in AuthService (not `ms` lib).
Email verification DONE + tested live via real Gmail: register sends email,
`POST /auth/verify-email` (single-use, atomic $transaction sets isEmailVerified),
`POST /auth/verify-email/resend` (204, enumeration-safe). Test user:
sumitsaurabh112+standsync1@gmail.com (Gmail +alias trick for fresh signups).
Password reset DONE + tested live: `POST /auth/forgot-password` (204,
enumeration-safe, only for password accounts), `POST /auth/reset-password`
(single-use token, atomic $transaction sets new hash + marks used + **revokes ALL
refresh tokens**). Verified: old session dies, old pw fails, new pw works, token
reuse → 400 PASSWORD_RESET_INVALID.
Social login (Google + GitHub) DONE + tested live via browser: Passport
strategies (`google`/`github`), `GET /auth/{google,github}` + `/callback`,
`handleOAuthLogin` (existing AuthAccount→login; email-exists-other-provider→409
OAUTH_EMAIL_EXISTS_OTHER_PROVIDER, NO silent merge; new→create verified user +
AuthAccount). Callback sets refresh cookie + redirects to
`OAUTH_SUCCESS_REDIRECT/oauth/callback#accessToken=...`. Verified: Google creates
verified/no-password/avatar user, re-login idempotent, GitHub same-email → 409.
OAuthProfile type in `src/modules/auth/oauth-profile.type.ts`.

KNOWN GAP (deferred, do during frontend integration): **OAuth `state` CSRF
protection** not yet implemented (passport `state:true` needs session or signed
state). Also NOT built yet: account linking/unlinking endpoints
(`POST /auth/:provider/link`, `DELETE /auth/accounts/:id`, `GET /auth/accounts`).

Rate limiting DONE + tested: global `ThrottlerModule` (Redis storage via
`@nest-lab/throttler-storage-redis` + ioredis), `APP_GUARD: ThrottlerGuard`,
default 100/60s, `@Throttle({default:{limit:10,ttl:seconds(60)}})` on
AuthController → verified 429 after 10 rapid /auth/login hits.

**Pure-backend auth is COMPLETE.** Deferred to frontend-integration phase: CORS
for web origin, account linking/unlinking endpoints, OAuth `state` CSRF.
Monorepo restructure DONE + verified: backend moved to `apps/api/` (src, prisma,
test, node_modules, all config, .env), root `package.json` is workspace root
(`workspaces:["apps/*"]`, scripts: `npm run api` / `api:worker` / `web`). API
boots from apps/api, DB connected. docker-compose.yml + docs + MEMORY.md stay at
root. Run API: `cd apps/api && npm run start:dev` (or `npm run api` from root).
apps/web SCAFFOLDED + running: Next.js **16** + React **19** + Tailwind 4 + TS,
App Router, `src/` dir, import alias `@/*`. Dev port **3001** (`next dev -p 3001`;
API owns 3000). Apps are **self-contained** (own node_modules, NOT npm workspaces)
— root scripts use `npm --prefix apps/<x> run <script>`.
⚠️ Next 16 has breaking changes from older Next — its AGENTS.md says READ
`apps/web/node_modules/next/dist/docs/` before writing frontend code; don't assume
old Next conventions.
Auth frontend DONE + tested live in browser (login flow end-to-end, session
persists on reload via silent refresh cross-origin 3001↔3000, logout). Built in
apps/web: `lib/api-client.ts` (in-memory access token, silent refresh-on-401,
credentials:'include'), `lib/auth-context.tsx` (AuthProvider: bootstrap via
refresh→/me, login/register/logout), `lib/types.ts` (ApiError). UI: `components/
ui/{Button,TextField,icons}`, `components/auth/{AuthShell,SocialButtons}`. Pages
(App Router): `(auth)/login`, `(auth)/signup`, `oauth/callback` (reads #accessToken
fragment→setToken→/me→dashboard), `dashboard` (client guard), root redirects to
/dashboard. Design: rose accent (#a86e72) split-screen matching user's mockup,
Google+GitHub only (NO Facebook/Apple). CORS added to apps/api/src/main.ts
(origin WEB_ORIGIN, credentials true). NEXT_PUBLIC_API_URL in apps/web/.env.local.
⚠️ Next 16 lint: `react-hooks/set-state-in-effect` is an ERROR — no sync setState
in useEffect body.

Auth UI COMPLETE: pages `(auth)/{login,signup,forgot-password,reset-password,
verify-email}` + `oauth/callback` + `dashboard`. All use `auth.png` (public/, right
panel via next/image fill) + `logo.svg` (brand tile via plain <img> — next/image
blocks SVG; also the favicon via metadata.icons in layout.tsx; deleted default
app/favicon.ico). reset-password + verify-email read `?token=` via `useSearchParams`
wrapped in `<Suspense>` (required in App Router). api-client has all auth methods
(register, login, me, logout, forgot/resetPassword, verify/resendVerification).
Verified live in browser: login end-to-end, session persists on reload, all auth
pages render with the illustration.

=== 3 auth improvements — ALL DONE + verified ===
1. OAuth error UX: `handleOAuthRedirect` try/catch → redirects to
   `WEB_ORIGIN/login?error=<CODE>`; login page maps code→friendly msg (ERROR_MESSAGES,
   read via useSearchParams in <Suspense>). ✅
2. Hard-gate login: `AuthService.login` throws `403 EMAIL_NOT_VERIFIED` if
   !isEmailVerified. Register no longer auto-logins; frontend `register()` just
   creates account → signup shows "Check your email"; login shows "Resend
   verification" on EMAIL_NOT_VERIFIED. ✅
3. Async email: BullMQ `mail` queue (QUEUES.MAIL). AuthModule registers it
   (producer, defaultJobOptions attempts:5 exp backoff). AuthService injects
   `@InjectQueue(MAIL)` + `enqueueMail(to,subject,html)` → `mailQueue.add('send',...)`
   (no longer imports MailService). `MailProcessor` (src/mail/mail.processor.ts,
   @Processor(MAIL)) sends via MailService in the WORKER. WorkerModule imports
   MailModule + registers MAIL queue + provides MailProcessor. Verified: register
   201 in 0.5s (no SMTP block), worker logs "Mail job → ...". ✅
Docs updated (ADR-016 HARD-gate, ADR-017 async email, ADR-013 OAuth redirect,
error_handling EMAIL_NOT_VERIFIED, api_spec, architecture mail queue, user_flow).

RESOLVED (2026-07-28): "email not working" report was two separate non-bugs:
(a) users table had been wiped (empty DB — cause unknown/not reproduced, not a
code issue, migrations were intact) so forgot-password correctly no-op'd on
unknown emails; (b) user was testing without the worker process running, so mail
jobs sat queued (BullMQ `mail` queue) with nothing consuming them — classic
ADR-017 async-email dev trap. Verified fix: with worker running, register→job→
worker log→Gmail SMTP verify all green. Added an explicit "worker is not
optional" warning to README Setup + docs/architecture.md Background Processing,
and refreshed README's stale pre-monorepo paths/doc table while at it.
Lesson: when debugging "X isn't happening" for anything mail-related, FIRST check
the worker process is running before anything else.

=== Phase 2 — Teams & RBAC — COMPLETE (2026-07-30) ===

**Backend** (`apps/api/src/modules/teams/`) — developer typed, spoon-fed:
- Prisma: `Team`, `TeamMember`, `TeamConfig`, `Invitation` + enums (`Role`,
  `WebhookPlatform`, `InviteStatus`). Migration `teams_and_rbac`.
- `TeamsModule` + `TeamsService` + `TeamsController`.
- Team CRUD: `POST/GET/PATCH/DELETE /teams` (soft delete).
- `GET /teams/:id`, `GET /teams/:id/members`.
- RBAC: `@Roles()` decorator + `TeamMembershipGuard` (membership + role check).
- Member mgmt: `PATCH/DELETE /teams/:id/members/:userId` (OWNER/ADMIN rules in
  service — can't modify owner, ADMIN can't touch ADMIN, no self-remove).
- Invitations: `POST /teams/:id/invitations` (async mail via BullMQ MAIL queue
  in TeamsModule), `POST /teams/invitations/:token/accept` (email must match JWT
  user). Invite link → `WEB_ORIGIN/accept-invitation?token=...`.
- Team config: `GET/PUT /teams/:id/config` (OWNER/ADMIN write).
- DTOs: `create-team`, `update-team`, `create-invitation`, `update-member-role`,
  `update-team-config`.

**Frontend** (`apps/web`) — assistant edited directly:
- Types + all teams methods in `lib/types.ts` + `lib/api-client.ts`.
- `hooks/use-require-auth.ts`, `components/layout/AppShell.tsx`,
  `components/teams/RoleBadge.tsx`.
- Route group `app/(app)/` — auth guard layout + shell.
- `/teams` — list + create team.
- `/teams/[id]` — members, invite form, role change, remove, delete team.
- `/teams/[id]/settings` — full config form (timezone, working days, deadline,
  webhook, isActive).
- `/accept-invitation?token=` — auto-accept when logged in; login redirect w/
  `?next=` param.
- `/dashboard` + `/` redirect → `/teams`. OAuth callback → `/teams`.
- Login supports `?next=` for post-login redirect (invite flow).

**Verified live in browser:** create team, invite member (email via worker),
accept invitation end-to-end, team appears in list.

**Frontend bugs fixed same session:**
1. Accept-invitation stuck on "Accepting…" — React Strict Mode cancelled in-flight
   request while `status !== 'idle'` blocked retry. Fixed with `useRef` guard.
2. Success page "Go to teams" button left-aligned — fixed `mx-auto w-auto` on Button.

Still deferred (unchanged): OAuth `state` CSRF, account linking/unlinking endpoints
+ UI.

Test users: sumitsaurabh112@gmail.com (Google, no pw),
sumitsaurabh112+standsync1@gmail.com (pw N3wPass!word).

Run: `npm run api` (:3000) + `npm run api:worker` (mail) + `npm run web` (:3001).

=== Phase 3 — Standups (Core) — IN PROGRESS (2026-07-31) ===

**Backend** (`apps/api/src/modules/standups/`) — COMPLETE:

DONE:
- Prisma `Standup` model + migration `standups` (partial unique index on
  `"teamId","userId","standupDate" WHERE "deletedAt" IS NULL` — use **quoted
  camelCase** column names in raw SQL, NOT snake_case; docs example is misleading).
- `standup-time.util.ts` — `teamLocalDate`, `teamLocalWeekday`, `teamLocalTime`
  (IANA timezone helpers via `Intl`).
- `standup-cursor.util.ts` — encode/decode cursor for history pagination.
- `StandupsModule` + `StandupsService` + two controllers (user chose separate
  controllers over single `@Controller()` w/ full paths):
  - `standups.controller.ts` — `@Controller('teams/:id/standups')`,
    `POST` submit, `GET today`, `GET` list (history).
  - `standup-by-id.controller.ts` — `@Controller('standups')`,
    `GET :standupId`, `PATCH :standupId` edit.
- `POST /teams/:id/standups` — submit; one-per-day; `isLate`; 422 non-working day;
  409 duplicate.
- `PATCH /standups/:standupId` — edit own; today only; before deadline.
- `GET /teams/:id/standups/today` — submitted + pending board + summary.
- `GET /teams/:id/standups` — history w/ cursor (`limit`, `cursor`, `date`, `userId`).
- `GET /standups/:standupId` — single standup (team member only).
- DTOs: `submit-standup.dto.ts`, `update-standup.dto.ts`,
  `list-standups-query.dto.ts`.

DEFERRED (Phase 3 backend):
- `Idempotency-Key` on submit (roadmap item — safe client retries).

**Frontend** (`apps/web`) — DONE (2026-07-31):
- Types + standups API methods in `lib/types.ts` + `lib/api-client.ts`
- `/teams/[id]/standups` — today's board, submit/edit form, history w/ load more
- Link from team detail → standup board
- Components: `MemberAvatar`, `TextArea`, `StandupForm`, `StandupCard`

**Dev notes:**
- After adding a new Prisma model, run `npx prisma generate` + reload IDE window
  (or restart TS server) if ESLint shows false `no-unsafe-*` on `prisma.standup`
  — NOT a migration bug; CLI `eslint` + `nest build` pass fine.

Still deferred (unchanged): OAuth `state` CSRF, account linking/unlinking endpoints
+ UI.

Test users: sumitsaurabh112@gmail.com (Google, no pw),
sumitsaurabh112+standsync1@gmail.com (pw N3wPass!word).

Run: `npm run api` (:3000) + `npm run api:worker` (mail) + `npm run web` (:3001).

=== NEXT — Phase 3 (resume) ===
Test standup frontend live in browser (submit, edit, board, history).
Mark Phase 3 complete when verified → Phase 4 — Scheduling & Digests.
